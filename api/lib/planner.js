// api/planner.js - Version CommonJS pour Vercel

const MODEL_REGISTRY = [
  {
    id: "groq-planner",
    provider: "groq",
    modelName: "llama-3.1-8b-instant"
  },
  {
    id: "groq-architecture",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile"
  },
  {
    id: "openrouter-agent-code",
    provider: "openrouter",
    modelName: "poolside/laguna-m.1:free"
  },
  {
    id: "gemini-multimodal",
    provider: "gemini",
    modelName: "gemini-2.5-flash"
  }
];

async function planRequest(userMessage, historySummary = "", hasImage = false, groqApiKey) {
  const defaultModel = MODEL_REGISTRY[0];

  if (!groqApiKey) {
    return { selectedModel: defaultModel, agent: 'general', activeProject: 'none', needsWebSearch: false, reasoning: 'Pas de clé' };
  }

  const systemPrompt = `Tu es le Planner d'Octopus2. Réponds UNIQUEMENT sous forme d'un objet JSON valide.

RÈGLES D'AGENT :
- "general" : Salutations, discussion, déclarations (ex: "Mon projet s'appelle X").
- "code" : UNIQUEMENT si l'utilisateur demande EXPLICITEMENT de coder.
- "debug" : Bugs ou erreurs.
- "github" : Action GitHub.

FORMAT DE SORTIE JSON STRICT :
{
  "selectedModelId": "groq-planner",
  "agent": "general" | "code" | "debug" | "github",
  "activeProject": "NomDuProjet ou none",
  "needsWebSearch": false,
  "reasoning": "Raison"
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Message: "${userMessage}"` }
        ],
        temperature: 0.0,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      return { selectedModel: defaultModel, agent: 'general', activeProject: 'none', reasoning: 'Erreur HTTP Groq' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result = content ? JSON.parse(content) : {};

    const selectedModel = MODEL_REGISTRY.find(m => m.id === result.selectedModelId) || defaultModel;

    return {
      selectedModel,
      agent: result.agent || 'general',
      activeProject: result.activeProject || 'none',
      needsWebSearch: Boolean(result.needsWebSearch),
      reasoning: result.reasoning || 'OK'
    };

  } catch (error) {
    return { selectedModel: defaultModel, agent: 'general', activeProject: 'none', reasoning: 'Catch error' };
  }
}

module.exports = { planRequest };
    
