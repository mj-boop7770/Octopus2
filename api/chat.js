// api/chat.js - Point d'entrée principal d'Octopus2
import { planRequest } from './planner.js';
import { runSpecializedAgent } from './specializedAgents.js';
import { saveChatMessage, getChatHistory } from './lib/jsonbin.js';
import { getGitHubFile, writeGitHubFile } from './lib/githubTools.js';

// Fonction utilitaire pour la recherche Web via Tavily
async function searchTavily(query, apiKey) {
  if (!apiKey || !query.trim()) return [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: "basic", max_results: 3 })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { messages, webSearch, sessionId, hasImage } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages requis' });
  }

  // Centralisation des clés API
  const keys = {
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    tavily: process.env.TAVILY_API_KEY,
    github: process.env.GITHUB_TOKEN
  };

  const lastUserMsg = messages[messages.length - 1]?.content || "";

  try {
    // 1. Récupération optionnelle de l'historique JSONbin
    let historySummary = "";
    if (sessionId) {
      try {
        const historyData = await getChatHistory(sessionId);
        if (Array.isArray(historyData)) {
          historySummary = historyData.slice(-4).map(m => `${m.role}: ${m.content}`).join(" | ");
        }
      } catch (e) {
        console.warn("Lecture de l'historique JSONbin ignorée.");
      }
    }

    // 2. ORCHESTRATION VIA LE PLANNER INTELLIGENT
    const plan = await planRequest(lastUserMsg, historySummary, Boolean(hasImage), keys.groq);
    console.log("Plan retenu :", { 
      agent: plan.agent, 
      activeProject: plan.activeProject, 
      selectedModel: plan.selectedModel.id, 
      reasoning: plan.reasoning 
    });

    // 3. EXÉCUTION DES OUTILS CONDITIONNELS (Outils système)
    let contextData = "";

    // A. Recherche Web (si demandée par l'utilisateur ou recommandée par le Planner)
    if (webSearch || plan.needsWebSearch) {
      const webResults = await searchTavily(lastUserMsg, keys.tavily);
      if (webResults.length > 0) {
        contextData += `\n[DONNÉES RECHERCHE WEB]:\n` + webResults.map(r => `- ${r.title}: ${r.content}`).join('\n');
      }
    }

    // B. Action GitHub (Exécutée uniquement sur commande explicite d'écriture)
    if (plan.agent === 'github') {
      const writeMatch = lastUserMsg.match(/(?:crée|écris|modifie)\s+(?:le\s+fichier\s+)?([\w\.\-]+)\s+avec\s*:\s*([\s\S]+)/i);
      if (writeMatch) {
        const filename = writeMatch[1];
        const content = writeMatch[2];
        const success = await writeGitHubFile(filename, content, `Mise à jour via Octopus2 pour ${plan.activeProject}`);
        contextData += `\n[ACTION GITHUB EXECUTE]: Écriture dans "${filename}" -> ${success ? 'RÉUSSIE' : 'ÉCHOUÉE'}`;
      }
    }

    // 4. EXÉCUTION DE L'AGENT AVEC LE MODÈLE DÉDIÉ
    const agentResult = await runSpecializedAgent({
      plan,
      messages,
      contextData,
      keys
    });

    // 5. Sauvegarde asynchrone dans JSONbin
    if (sessionId) {
      saveChatMessage(sessionId, lastUserMsg, agentResult.response).catch(() => {});
    }

    // 6. Envoi de la réponse structurée au Front-End
    return res.status(200).json({
      reply: agentResult.response,
      meta: {
        agentUsed: plan.agent,
        activeProject: plan.activeProject,
        modelUsed: agentResult.usedModel.modelName,
        provider: agentResult.usedModel.provider,
        reasoning: plan.reasoning
      }
    });

  } catch (error) {
    console.error("Erreur Backend Octopus2:", error);
    return res.status(500).json({
      error: "Une erreur de traitement est survenue.",
      details: error.message
    });
  }
    }
        
