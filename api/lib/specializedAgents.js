// api/lib/specializedAgents.js
const { MODEL_REGISTRY } = require('./modelRegistry.js');

async function executeLLMCall({ provider, modelName, systemPrompt, messages, keys }) {
  if (provider === 'groq') {
    if (!keys.groq) throw new Error("Clé GROQ_API_KEY manquante");
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keys.groq}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.2,
        max_tokens: 3000
      })
    });
    if (!res.ok) throw new Error(`Erreur Groq HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content;
  }

  if (provider === 'openrouter') {
    if (!keys.openrouter) throw new Error("Clé OPENROUTER_API_KEY manquante");
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keys.openrouter}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://octopus2.local',
        'X-Title': 'Octopus2'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.2,
        max_tokens: 3000
      })
    });
    if (!res.ok) throw new Error(`Erreur OpenRouter HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content;
  }

  if (provider === 'gemini') {
    if (!keys.gemini) throw new Error("Clé GEMINI_API_KEY manquante");
    const lastMessage = messages[messages.length - 1]?.content || "";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keys.gemini}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${lastMessage}` }] }]
      })
    });
    if (!res.ok) throw new Error(`Erreur Gemini HTTP ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  throw new Error(`Fournisseur inconnu: ${provider}`);
}

async function runSpecializedAgent({ plan, messages, contextData = "", keys }) {
  const { selectedModel, agent, activeProject } = plan;

  let systemPrompt = `Tu es Octopus2, un assistant IA de production directe et précise.
PROJET ACTIF : ${activeProject !== 'none' ? activeProject : 'Aucun projet spécifique'}.

ARCHITECTURE EXACTE DE TON SYSTÈME (Ne rien inventer d'autre !) :
- Tes 4 AGENTS : 'general', 'code', 'debug', 'github'.
- Tes MODÈLES disponibles : Groq Llama (8B / 70B), Qwen 2.5 Coder, Gemini 1.5 Flash, DeepSeek R1.
- Tes OUTILS/APIs réels : Recherche Web (Tavily), Interaction GitHub (writeGitHubFile), Génération d'images (Pollinations.ai) et mémoire JSONBin.

RÈGLES D'AFFICHAGE D'IMAGES :
Si l'utilisateur te demande de générer, créer ou dessiner une image, réponds en incluant le format Markdown exact suivant (traduis la description en anglais et remplace les espaces par %20) :
![Description de l'image](https://image.pollinations.ai/prompt/your%20english%20prompt%20here?nologo=true)

RÈGLES ANTI-HALLUCINATION STRICTES :
1. Si l'utilisateur demande tes agents, outils ou APIs, réponds UNIQUEMENT avec l'architecture ci-dessus. N'invente JAMAIS d'autres bibliothèques ou API externes (PyTorch, TensorFlow, IBM Watson, Google Translate, etc.).
2. Ne valide JAMAIS un fait, dossier ou projet que l'utilisateur mentionne si tu ne le vois pas explicitement dans l'historique direct de la conversation. S'il parle d'un projet inconnu, dis clairement que tu n'en as pas trace dans cette session.
3. Isole strictement le projet actif (${activeProject}). Ne le mélange jamais avec un autre.
4. Ne génère JAMAIS spontanément de fichiers de configuration (ex: tsconfig.json, package.json) sauf demande explicite.
5. Sois concis, direct et efficace.`;

  if (agent === 'code') {
    systemPrompt += `\n\n[MODE CODE DÉDIÉ] : Tu es un développeur senior. Fournis du code propre pour le projet ${activeProject}.`;
  } else if (agent === 'debug') {
    systemPrompt += `\n\n[MODE DIAGNOSTIC] : Identifie la cause racine du bug et corrige-la.`;
  } else if (agent === 'github') {
    systemPrompt += `\n\n[MODE GITHUB] : Réponds en tenant compte de l'action sur le dépôt.`;
  }

  if (contextData) {
    systemPrompt += `\n\n[CONTEXTE COMPLÉMENTAIRE] :\n${contextData}`;
  }

  const formattedMessages = messages.map(m => ({
    role: (m.role === 'bot' || m.role === 'assistant') ? 'assistant' : 'user',
    content: m.content
  })).slice(-8);

  // Tentative principale
  try {
    const response = await executeLLMCall({
      provider: selectedModel.provider,
      modelName: selectedModel.modelName,
      systemPrompt,
      messages: formattedMessages,
      keys
    });
    if (response) return { response, usedModel: selectedModel };
  } catch (e) {
    console.warn(`Échec de ${selectedModel.id}, bascule sur le secours Groq 70B...`, e.message);
  }

  // Secours (Fallback)
  const fallbackModel = MODEL_REGISTRY.find(m => m.id === 'groq-brain-70b') || {
    id: "groq-brain-70b",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile"
  };

  const fallbackResponse = await executeLLMCall({
    provider: fallbackModel.provider,
    modelName: fallbackModel.modelName,
    systemPrompt,
    messages: formattedMessages,
    keys
  });

  return { response: fallbackResponse, usedModel: fallbackModel };
}

module.exports = { runSpecializedAgent };
    
