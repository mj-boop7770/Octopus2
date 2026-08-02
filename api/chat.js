import { createPlan } from './lib/planner.js';
import { getProjectMemory } from './lib/memory.js';
import { getAgentPrompt } from './lib/specializedAgents.js';
import { verifyAndRefine } from './lib/reviewer.js';
import { getLongTermMemory, saveMemory } from './lib/longTermMemory.js';
import { getGitHubFile, writeGitHubFile } from './lib/githubTools.js';
import { saveChatMessage } from './lib/jsonbin.js'; // <-- IMPORT JSONBIN ADDITIONNEL

// Recherche Web via Tavily
async function searchTavily(query, apiKey) {
  if (!apiKey || !query.trim()) return [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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

// FILTRE INTELLIGENT
async function checkIfWebSearchNeeded(query, apiKey) {
  if (!query || query.trim().length < 3) return false;

  const systemPrompt = `Tu es un classifieur d'intention. Ton unique rôle est de déterminer si le message de l'utilisateur nécessite une recherche d'information récente sur Internet.
Réponds uniquement par "OUI" si une recherche Web est réellement nécessaire.
Réponds uniquement par "NON" s'il s'agit d'une salutation, d'une discussion générale, de politesse, d'une question sur le code ou de connaissances générales établies.
Format de réponse ultra-strict : OUI ou NON.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.0,
        max_tokens: 5
      })
    });

    if (!res.ok) return false;
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content?.trim().toUpperCase() || "";
    return answer.includes('OUI');
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { messages, mode, webSearch, sessionId } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages requis' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey && !geminiApiKey && !openrouterApiKey) {
    return res.status(500).json({ error: 'Aucune clé API disponible dans Vercel' });
  }

  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const isMujosMode = lastUserMessage.toUpperCase().includes('MUJOS');

  // EXECUTION DU PLANNER
  const planData = await createPlan(lastUserMessage, apiKey).catch(() => ({ agent: mode || 'general', steps: [] }));
  const activeAgent = planData.agent || mode || 'general';
  const planSteps = planData.steps || [];

  // DÉTECTION DIRECTE DE SÉCURITÉ POUR L'ÉCRITURE FICHIER
  let toolAction = planData.toolAction || null;
  const writeRegex = /(?:crée|ecris|écris|ajoute|sauvegarde|modifie)\s+(?:un\s+)?fichier\s+([\w\.\-]+)(?:\s+sur\s+github)?(?:\s+avec\s+le\s+texte\s*:\s*['"]?([\s\S]+?)['"]?)?(?:\s+MUJOS)?$/i;
  const match = lastUserMessage.match(writeRegex);

  if (match) {
    const filePath = match[1];
    let content = match[2] || "Fichier créé via Octopus2";
    content = content.replace(/\s*MUJOS$/i, '').trim();

    toolAction = {
      type: 'write_file',
      filePath: filePath,
      content: content,
      commitMessage: `Création de ${filePath} via Octopus2`
    };
  }

  // SAUVEGARDE AUTO DE MEMOIRE SÉCURISÉE (Empêche de faire crasher le serveur)
  let memorySavedSuccess = false;
  if (planData.rememberFact) {
    try {
      await saveMemory(planData.rememberFact);
      memorySavedSuccess = true;
    } catch (e) {
      console.warn("Échec sauvegarde mémoire long terme:", e);
    }
  }

  // EXECUTION D'OUTILS GITHUB
  let fileContext = "";
  if (toolAction?.type === 'read_file' && toolAction?.filePath) {
    const fetchedContent = await getGitHubFile(toolAction.filePath);
    if (fetchedContent) {
      fileContext = `\n\n[CONTENU RÉEL DU FICHIER ${toolAction.filePath} EXTRAIT DE GITHUB]:\n\`\`\`json\n${fetchedContent}\n\`\`\``;
    } else {
      fileContext = `\n\n[ERREUR GITHUB]: Impossible de lire le fichier ${toolAction.filePath}.`;
    }
  } else if (toolAction?.type === 'write_file' && toolAction?.filePath && toolAction?.content) {
    const success = await writeGitHubFile(
      toolAction.filePath,
      toolAction.content,
      toolAction.commitMessage || "Mise à jour via Octopus2 Engine"
    );
    fileContext = `\n\n[ACTION GITHUB EXECUTE] : L'écriture dans le fichier "${toolAction.filePath}" a ${success ? 'RÉUSSI avec succès' : 'ÉCHOUÉ'}.`;
  }

  const planContext = planSteps.length > 0 
    ? `\n\n[PLAN D'ACTION DU PLANNER]:\n${planSteps.map((step, index) => `${index + 1}.${step}`).join("\n")}`
    : "";

  const longTermMem = await getLongTermMemory().catch(() => "");

  // RECHERCHE WEB
  let searchContext = "";
  let hasWebResults = false;
  const needsWeb = await checkIfWebSearchNeeded(lastUserMessage, apiKey);

  if (webSearch || needsWeb) {
    const results = await searchTavily(lastUserMessage, tavilyApiKey);
    if (results && results.length > 0) {
      hasWebResults = true;
      searchContext = results.map((r) => `- [${r.title || 'Source'}]: ${r.content || r.snippet}`).join("\n");
    }
  }

  // SYSTEM PROMPT
  let systemContent = getAgentPrompt(activeAgent);
  systemContent += longTermMem;
  systemContent += fileContext;
  systemContent += planContext;

  if (hasWebResults) {
    systemContent += `\n\n[INFORMATIONS ISSUES DU WEB EN TEMPS RÉEL]:\n${searchContext}`;
  }

  if (isMujosMode) {
    systemContent += `\n\n${getProjectMemory()}`;
    systemContent += `\n\n[INSTRUCTION SPECIALE - IDENTIFICATION MUJOS] : Tu es en discussion avec ton créateur MUJOS.`;
  } else {
    systemContent += `\n\n[CONSIGNES ABSOLUES DE COMPORTEMENT] : Assistant amical et synthétique. N'invente pas de fausses coordonnées.`;
  }

  const formattedMessages = messages.map(m => ({
    role: (m.role === 'bot' || m.role === 'assistant') ? 'assistant' : 'user',
    content: m.content
  }));

  const recentMessages = formattedMessages.slice(-4);
  let finalReply = null;

  // 1. GROQ
  if (apiKey) {
    const models = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
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
          finalReply = data.choices[0].message.content;
          break;
        }
      } catch (e) {
        console.warn("Groq indisponible");
      }
    }
  }

  // 2. GEMINI
  if (!finalReply && geminiApiKey) {
    try {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemContent}\n\nUser: ${lastUserMessage}` }] }]
        })
      });
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        finalReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } catch (e) {
      console.warn("Gemini indisponible");
    }
  }

  // 3. OPENROUTER
  if (!finalReply && openrouterApiKey) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'system', content: systemContent }, ...recentMessages]
        })
      });
      if (orRes.ok) {
        const data = await orRes.json();
        finalReply = data.choices?.[0]?.message?.content;
      }
    } catch (e) {
      console.error("OpenRouter indisponible");
    }
  }

  // SAUVEGARDE DANS JSONBIN + RÉPONSE
  if (finalReply) {
    // On sauvegarde en arrière-plan sans bloquer la réponse utilisateur
    if (sessionId || 'default') {
      saveChatMessage(sessionId || 'default', lastUserMessage, finalReply).catch(err => console.error("JSONbin save error:", err));
    }

    return res.status(200).json({ 
      reply: finalReply,
      plan: planSteps,
      agentUsed: activeAgent,
      memorySaved: memorySavedSuccess
    });
  }

  return res.status(500).json({ error: "Erreur de connexion aux moteurs d'IA." });
        }
    
