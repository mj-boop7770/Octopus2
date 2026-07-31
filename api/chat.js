import { createPlan } from './lib/planner.js';
import { getProjectMemory } from './lib/memory.js';
import { getAgentPrompt } from './lib/specializedAgents.js';

// Fonction de recherche Web via Tavily (Niveau 9 - Web Agent)
async function searchTavily(query, apiKey) {
  if (!apiKey || !query.trim()) return [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 3
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { messages, mode, webSearch } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages requis' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY manquante dans Vercel' });
  }

  const lastUserMessage = messages[messages.length - 1]?.content || "";

  // -------------------------------------------------------------
  // NIVEAU 1 : EXECUTION DU PLANNER
  // -------------------------------------------------------------
  const planData = await createPlan(lastUserMessage, apiKey);
  const activeAgent = planData.agent || mode || 'general';
  const planSteps = planData.steps || [];

  const planContext = planSteps.length > 0 
    ? `\n\n[PLAN D'ACTION A SUIVRE STRICTEMENT]:\n${planSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`
    : "";

  // -------------------------------------------------------------
  // NIVEAU 9 : WEB AGENT (RECHERCHE TAVILY)
  // -------------------------------------------------------------
  let searchContext = "";
  let hasWebResults = false;

  if (webSearch && lastUserMessage.trim()) {
    const results = await searchTavily(lastUserMessage, tavilyApiKey);
    if (results && results.length > 0) {
      hasWebResults = true;
      searchContext = results.map((r) => `- [${r.title || 'Source'}]: ${r.content || r.snippet}`).join("\n");
    }
  }

  // -------------------------------------------------------------
  // CONFIGURATION DES NIVEAUX (3, 5, 6, 7, 8) : AGENTS SPÉCIALISÉS
  // -------------------------------------------------------------
  let systemContent = getAgentPrompt(activeAgent);

  // NIVEAU 2 : INJECTION DE LA MÉMOIRE DU PROJET
  systemContent += `\n\n${getProjectMemory()}`;

  // INJECTION DU PLAN D'ACTION (Niveau 1)
  systemContent += planContext;

  // RÈGLES WEB ET ANTI-HALLUCINATION
  if (webSearch && hasWebResults) {
    systemContent += `\n\n[RÉSULTATS DU WEB EN TEMPS RÉEL]:\n${searchContext}\n\nCONSIGNE STRICTE: Réponds à l'utilisateur uniquement en t'appuyant sur les données Web ci-dessus. Ne dis JAMAIS 'Je vais consulter' ou 'Je fais une pause'.`;
  } else if (webSearch && !hasWebResults) {
    systemContent += `\n\nCONSIGNE STRICTE: La recherche n'a pas renvoyé de résultats pertinents. Réponds directement avec tes connaissances générales. N'invente pas d'étapes de recherche.`;
  }

  // HISTORIQUE DE CONVERSATION
  const formattedMessages = messages.map(m => ({
    role: (m.role === 'bot' || m.role === 'assistant') ? 'assistant' : 'user',
    content: m.content
  }));

  const recentMessages = formattedMessages.slice(-4);

  const models = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile'
  ];

  let lastErrorDetail = "";

  // -------------------------------------------------------------
  // GENERATION DE LA REPONSE FINALE VIA GROQ
  // -------------------------------------------------------------
  for (const model of models) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'system', content: systemContent }, ...recentMessages],
          temperature: 0.2,
          max_tokens: 1500
        })
      });

      const data = await groqRes.json();

      if (groqRes.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({ 
          reply: data.choices[0].message.content,
          plan: planSteps,
          agentUsed: activeAgent
        });
      } else {
        lastErrorDetail = data.error?.message || JSON.stringify(data);
      }
    } catch (e) {
      lastErrorDetail = e.message;
    }
  }

  return res.status(500).json({ error: `Groq: ${lastErrorDetail || "Erreur de connexion"}` });
}
  
