// 1. Importation de TES modules situés dans api/lib/
const { createPlan } = require('./lib/planner');
const { verifyAndRefine } = require('./lib/reviewer');
const { getFileFromGitHub, updateLongTermMemory } = require('./lib/longTermMemory');

// 2. Recherche Web Tavily native (sans package externe requis)
async function searchTavily(query) {
  if (!process.env.TAVILY_API_KEY) return "";
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query })
    });
    const data = await res.json();
    return JSON.stringify(data.results || []);
  } catch (err) {
    console.error("Erreur Tavily:", err);
    return "";
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { message, webSearchEnabled } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!message) {
      return res.status(400).json({ error: 'Message manquant' });
    }

    // A. PLANNER : Analyse la demande
    let plan = { agent: 'general', toolAction: null, sessionNote: null };
    try {
      plan = await createPlan(message, apiKey);
    } catch (e) {
      console.warn("Planner défaillant, fallback général:", e);
    }

    let realContext = "";

    // B. TAVILY : Exécution si webSearchEnabled est vrai (bouton ON)
    if (webSearchEnabled) {
      const webResults = await searchTavily(message);
      if (webResults) {
        realContext += `\n[Données de recherche Web réelles] :\n${webResults}\n`;
      }
    }

    // C. GITHUB : Lecture de fichier si demandée par le Planner
    if (plan.toolAction && plan.toolAction.type === 'read_file' && plan.toolAction.filePath) {
      try {
        const fileData = await getFileFromGitHub(plan.toolAction.filePath);
        realContext += `\n[Contenu réel du fichier GitHub (${plan.toolAction.filePath})] :\n${fileData}\n`;
      } catch (err) {
        realContext += `\n[Erreur de lecture GitHub] : Impossible de lire ${plan.toolAction.filePath}\n`;
      }
    }

    // D. PROMPT ENRICHI AVEC LES DONNÉES RÉELLES
    const promptFinal = `
Demande de l'utilisateur : ${message}

${realContext ? `DONNÉES RÉELLES RECUEILLIES EN DIRECT :\n${realContext}` : ''}

INSTRUCTIONS STRICTES :
- Réponds directement à l'utilisateur.
- Exploite les données réelles fournies ci-dessus.
- NE GÉNÈRE PAS de code JS simulant l'exécution (pas de fs.readFileSync, require, etc.). Donne directement l'analyse finale.
    `;

    // E. AGENT TECHNIQUE / GÉNÉRAL (Groq)
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: promptFinal }]
      })
    });

    const groqData = await groqResponse.json();
    let reply = groqData.choices?.[0]?.message?.content || "Aucune réponse générée.";

    // F. REVIEWER : Contrôle et affinage
    try {
      reply = await verifyAndRefine(reply, message, apiKey);
    } catch (e) {
      console.warn("Reviewer ignoré:", e);
    }

    // G. MÉMOIRE GLOBALE : Mise à jour si nécessaire
    if (plan.sessionNote) {
      try {
        await updateLongTermMemory(plan.sessionNote);
      } catch (e) {
        console.warn("Erreur sauvegarde mémoire:", e);
      }
    }

    return res.status(200).json({ output: reply });

  } catch (error) {
    console.error("Erreur serveur:", error);
    return res.status(500).json({ error: "Erreur de connexion.", details: error.message });
  }
};
      
