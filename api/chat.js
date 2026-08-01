import { createPlan } from './lib/planner.js';
import { getProjectMemory } from './lib/memory.js';
import { getAgentPrompt } from './lib/specializedAgents.js';
import { verifyAndRefine } from './lib/reviewer.js';
import { getLongTermMemory, saveMemory } from './lib/longTermMemory.js';
import { getGitHubFile } from './lib/githubTools.js';

// Recherche Web via Tavily (Niveau 9)
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

  // NIVEAU 1 : EXECUTION DU PLANNER (AVEC DETECTION DE TOOLS - NIVEAU 12)
  const planData = await createPlan(lastUserMessage, apiKey);
  const activeAgent = planData.agent || mode || 'general';
  const planSteps = planData.steps || [];

  // NIVEAU 11 : SAUVEGARDE AUTO DE MEMOIRE
  let memorySavedSuccess = false;
  if (planData.rememberFact) {
    await saveMemory(planData.rememberFact);
    memorySavedSuccess = true;
  }

  // NIVEAU 12 : EXECUTION D'OUTILS (LECTURE DE FICHIER GITHUB)
  let fileContext = "";
  if (planData.toolAction?.type === 'read_file' && planData.toolAction?.filePath) {
    const fetchedContent = await getGitHubFile(planData.toolAction.filePath);
    if (fetchedContent) {
      fileContext = `\n\n[CONTENU RÉEL DU FICHIER ${planData.toolAction.filePath} EXTRAIT DE GITHUB]:\n\`\`\`json\n${fetchedContent}\n\`\`\``;
    } else {
      fileContext = `\n\n[ERREUR GITHUB]: Le fichier ${planData.toolAction.filePath} n'a pas pu être lu ou est introuvable.`;
    }
  }

  const planContext = planSteps.length > 0 
    ? `\n\n[PLAN D'ACTION A SUIVRE STRICTEMENT]:\n${planSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`
    : "";

  // NIVEAU 11 : MEMOIRE GITHUB
  const longTermMem = await getLongTermMemory();

  // NIVEAU 9 : WEB AGENT
  let searchContext = "";
  let hasWebResults = false;

  if (webSearch && lastUserMessage.trim()) {
    const results = await searchTavily(lastUserMessage, tavilyApiKey);
    if (results && results.length > 0) {
      hasWebResults = true;
      searchContext = results.map((r) => `- [${r.title || 'Source'}]: ${r.content || r.snippet}`).join("\n");
    }
  }

  // CONSTRUCTION DU SYSTEM PROMPT AVEC DIRECTIVES STRICTES
  let systemContent = getAgentPrompt(activeAgent);
  systemContent += `\n\n${getProjectMemory()}`;
  systemContent += longTermMem;
  systemContent += fileContext;
  systemContent += planContext;

  if (memorySavedSuccess) {
    systemContent += `\n\n[NOTE SYSTEME]: La fait suivant a été automatiquement enregistré en mémoire globale : "${planData.rememberFact}". Confirme-le brièvement à l'utilisateur sans générer de code.`;
  }

  if (webSearch && hasWebResults) {
    systemContent += `\n\n[RÉSULTATS DU WEB EN TEMPS RÉEL]:\n${searchContext}`;
  }

  // CONSIGNE D'INTERDICTION D'HALUCINATION
  systemContent += `\n\n[CONSIGNE STRICTE]: Si le contenu d'un fichier GitHub ou des résultats Web sont fournis ci-dessus, utilise-les DIRECTEMENT. N'invente JAMAIS de contenu de fichier (ne dis pas "Je vais supposer que..."). N'écris JAMAIS de code Node.js pour simuler la sauvegarde en mémoire, affirme simplement que l'action est faite.`;

  const formattedMessages = messages.map(m => ({
    role: (m.role === 'bot' || m.role === 'assistant') ? 'assistant' : 'user',
    content: m.content
  }));

  const recentMessages = formattedMessages.slice(-4);

  const models = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
  let lastErrorDetail = "";

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
        let finalReply = data.choices[0].message.content;

        // NIVEAU 10 : AUTO-CORRECTION
        const technicalAgents = ['code', 'debug', 'review', 'test'];
        if (technicalAgents.includes(activeAgent)) {
          finalReply = await verifyAndRefine(finalReply, lastUserMessage, apiKey);
        }

        return res.status(200).json({ 
          reply: finalReply,
          plan: planSteps,
          agentUsed: activeAgent,
          memorySaved: !!planData.rememberFact
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
    
