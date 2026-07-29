export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Récupération de l'historique de conversation
  const { messages, mode } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Historique de messages requis' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé GROQ_API_KEY manquante dans Vercel' });
  }

  // 1. Définition du comportement de l'IA (System Prompt)
  let systemContent = "Tu es Octopus AI, un assistant virtuel intelligent, rapide et concis.";

  if (mode === 'code') {
    systemContent = `Tu es Octopus AI, un développeur Senior et architecte logiciel expert.
- Fournis du code propre, moderne, optimisé et bien structuré.
- Si l'utilisateur montre un bug ou une erreur, analyse le problème en détail avant de donner la correction.
- Sois clair, précis et direct.`;
  } else if (mode === 'writing') {
    systemContent = `Tu es Octopus AI, un expert en rédaction, correction et optimisation de textes.
- Corrige les fautes, reformule avec élégance et adapte le ton au besoin.`;
  }

  const systemMessage = { role: 'system', content: systemContent };

  // 2. Formatage des messages pour l'API
  const formattedMessages = messages.map(m => ({
    role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  // On garde les 8 derniers messages (bon équilibre mémoire / consommation de tokens)
  const recentMessages = formattedMessages.slice(-8);

  // 3. Modèles de secours classés par ordre de priorité
  const models = [
    'llama-3.3-70b-versatile', // Modèle principal (Le plus puissant)
    'llama-3.1-8b-instant',    // Secours 1 (Ultra rapide)
    'mixtral-8x7b-32768'       // Secours 2 (Très performant)
  ];

  // 4. Boucle de bascule automatique si une erreur 429 (Rate Limit) survient
  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [systemMessage, ...recentMessages],
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      const data = await response.json();

      // Si le modèle répond correctement, on renvoie le résultat
      if (response.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: data.choices[0].message.content });
      }

      // Si le quota/rate limit est atteint (Code HTTP 429), on passe au modèle suivant
      if (response.status === 429) {
        console.warn(`[Octopus AI] Rate limit atteint pour ${model}. Bascule sur le modèle suivant...`);
        continue;
      } else {
        // En cas d'autre erreur API, on la remonte
        return res.status(500).json({ error: data.error?.message || 'Erreur API Groq' });
      }

    } catch (error) {
      console.error(`[Octopus AI] Erreur réseau avec le modèle ${model}:`, error);
    }
  }

  // Si tous les modèles ont épuisé leur limite journalière
  return res.status(429).json({ 
    error: "Tous les modèles de secours ont atteint leur limite journalière. Prends une courte pause ou réessaie plus tard !" 
  });
      }
    
