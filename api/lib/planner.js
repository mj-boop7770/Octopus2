// api/lib/planner.js
const { MODEL_REGISTRY } = require('./modelRegistry.js');

const FALLBACK_MODEL = MODEL_REGISTRY.find(m => m.id === 'groq-planner-fast') || MODEL_REGISTRY[0];

async function planRequest(userMessage, historySummary = "", hasImage = false, groqApiKey) {
  if (!groqApiKey) {
    return {
      selectedModel: FALLBACK_MODEL,
      agent: 'general',
      activeProject: 'none',
      needsWebSearch: false,
      reasoning: 'Fallback sans clé API'
    };
  }

  const registryDescription = MODEL_REGISTRY.map(m => 
    `- ID: "${m.id}" | Modèle: ${m.modelName} | Forces: ${m.strengths.join(', ')} | Cas d'usages: ${m.bestFor.join(', ')}`
  ).join('\n');

  const systemPrompt = `Tu es le Planner d'Octopus2. Réponds UNIQUEMENT sous forme d'un objet JSON valide.

CATALOGUE DES IA DISPONIBLES :
${registryDescription}

RÈGLES D'AIGUILLAGE STRICTES :
1. "general" (Agent) : Pour toute discussion, question, salutation, ou simple phrase d'information (ex: "Mon projet s'appelle X").
2. "code" (Agent) : UNIQUEMENT si l'utilisateur demande EXPLICITEMENT d'écrire, modifier ou générer du code.
3. "debug" (Agent) : UNIQUEMENT si l'utilisateur fournit une erreur ou demande de corriger un bug technique.
4. "github" (Agent) : UNIQUEMENT pour une action directe sur le dépôt GitHub.

RÈGLES DE SÉLECTION DU MODÈLE (selectedModelId) :
- Si une image est présente (${hasImage}), choisis "gemini-multimodal".
- Pour du code explicite ou action GitHub, choisis "openrouter-qwen-coder".
- Pour du debugging complexe, choisis "openrouter-deepseek-debug".
- Pour la réflexion globale ou les tâches lourdes, choisis "groq-brain-70b".
- Pour les conversations simples ou rapides, choisis "groq-planner-fast".

FORMAT DE SORTIE JSON STRICT :
{
  "selectedModelId": "ID_EXACT_DU_CATALOGUE",
  "agent": "general" | "code" | "debug" | "github",
  "activeProject": "NomDuProjet ou none",
  "needsWebSearch": false,
  "reasoning": "Explication courte"
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
          { role: 'user', content: `Image détectée: ${hasImage}\nHistorique récent: ${historySummary}\nMessage: "${userMessage}"` }
        ],
        temperature: 0.0,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      return { selectedModel: FALLBACK_MODEL, agent: 'general', activeProject: 'none', reasoning: 'Erreur HTTP Groq' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result = content ? JSON.parse(content) : {};

    const selectedModel = MODEL_REGISTRY.find(m => m.id === result.selectedModelId) || FALLBACK_MODEL;

    return {
      selectedModel,
      agent: result.agent || 'general',
      activeProject: result.activeProject || 'none',
      needsWebSearch: Boolean(result.needsWebSearch),
      reasoning: result.reasoning || 'OK'
    };

  } catch (error) {
    return { selectedModel: FALLBACK_MODEL, agent: 'general', activeProject: 'none', reasoning: 'Catch error' };
  }
}

module.exports = { planRequest };
          
