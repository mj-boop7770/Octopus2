// api/planner.js - Correctif de Production
import { MODEL_REGISTRY } from './lib/modelRegistry.js';

const FALLBACK_MODEL = MODEL_REGISTRY[0] || {
  id: "groq-planner",
  provider: "groq",
  modelName: "llama-3.1-8b-instant"
};

export async function planRequest(userMessage, historySummary = "", hasImage = false, groqApiKey) {
  if (!groqApiKey) {
    return {
      selectedModel: FALLBACK_MODEL,
      agent: 'general',
      activeProject: 'none',
      needsWebSearch: false,
      reasoning: 'Fallback sans clé API'
    };
  }

  const systemPrompt = `Tu es le Planner d'Octopus2. Réponds UNIQUEMENT sous forme d'un objet JSON valide.

RÈGLES D'AGENT :
- "general" : Salutations, discussion, simple déclaration d'information (ex: "Mon projet s'appelle X").
- "code" : UNIQUEMENT si l'utilisateur demande EXPLICITEMENT de coder/générer un fichier.
- "debug" : Détection de bugs ou erreurs explicites.
- "github" : Action explicite sur GitHub.

FORMAT DE SORTIE JSON OBLIGATOIRE :
{
  "selectedModelId": "groq-planner",
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
          { role: 'user', content: `Message: "${userMessage}"` }
        ],
        temperature: 0.0,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.warn(`Planner Groq Error Status: ${response.status}`);
      return { selectedModel: FALLBACK_MODEL, agent: 'general', activeProject: 'none', reasoning: 'Fallback HTTP' };
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
    console.error("Erreur interceptée dans planner.js :", error.message);
    return {
      selectedModel: FALLBACK_MODEL,
      agent: 'general',
      activeProject: 'none',
      reasoning: 'Fallback Securite'
    };
  }
                                   }
      
