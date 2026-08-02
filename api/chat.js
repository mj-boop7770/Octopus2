// api/chat.js - Entrypoint Vercel adapté à ton dossier api/lib/
const { planRequest } = require('./lib/planner.js');
const { runSpecializedAgent } = require('./lib/specializedAgents.js');

let getChatHistory, saveChatMessage, writeGitHubFile;
try {
  const jsonbin = require('./lib/jsonbin.js');
  getChatHistory = jsonbin.getChatHistory;
  saveChatMessage = jsonbin.saveChatMessage;
} catch (e) {}

try {
  const github = require('./lib/githubTools.js');
  writeGitHubFile = github.writeGitHubFile;
} catch (e) {}

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { messages, webSearch, sessionId, hasImage } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages requis' });
  }

  const keys = {
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    tavily: process.env.TAVILY_API_KEY,
    github: process.env.GITHUB_TOKEN
  };

  const lastUserMsg = messages[messages.length - 1]?.content || "";

  try {
    let historySummary = "";
    if (sessionId && getChatHistory) {
      try {
        const historyData = await getChatHistory(sessionId);
        if (Array.isArray(historyData)) {
          historySummary = historyData.slice(-4).map(m => `${m.role}: ${m.content}`).join(" | ");
        }
      } catch (e) {}
    }

    // 1. Détermination du plan via Planner (dans api/lib/)
    const plan = await planRequest(lastUserMsg, historySummary, Boolean(hasImage), keys.groq);

    // 2. Traitement des outils
    let contextData = "";
    if (webSearch || plan.needsWebSearch) {
      const webResults = await searchTavily(lastUserMsg, keys.tavily);
      if (webResults.length > 0) {
        contextData += `\n[DONNÉES WEB]:\n` + webResults.map(r => `- ${r.title}: ${r.content}`).join('\n');
      }
    }

    if (plan.agent === 'github' && writeGitHubFile) {
      const writeMatch = lastUserMsg.match(/(?:crée|écris|modifie)\s+(?:le\s+fichier\s+)?([\w\.\-]+)\s+avec\s*:\s*([\s\S]+)/i);
      if (writeMatch) {
        const success = await writeGitHubFile(writeMatch[1], writeMatch[2], `Mise à jour pour ${plan.activeProject}`);
        contextData += `\n[ACTION GITHUB]: Fichier "${writeMatch[1]}" -> ${success ? 'SUCCÈS' : 'ÉCHEC'}`;
      }
    }

    // 3. Exécution via l'agent spécialisé (dans api/lib/)
    const agentResult = await runSpecializedAgent({
      plan,
      messages,
      contextData,
      keys
    });

    if (sessionId && saveChatMessage) {
      saveChatMessage(sessionId, lastUserMsg, agentResult.response).catch(() => {});
    }

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
    console.error("Erreur serveur API:", error);
    return res.status(500).json({
      error: "Erreur serveur.",
      details: error.message
    });
  }
};
        
