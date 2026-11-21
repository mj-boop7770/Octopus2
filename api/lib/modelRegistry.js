// api/lib/planner.js
// Le planner (petit modèle Groq) décide de l'AGENT (general / code / debug).
// Le choix du MODÈLE est ensuite fait en code (pickModel), selon les clés disponibles :
// c'est plus fiable que de demander à un petit modèle de choisir un identifiant.

const { FAST_ID, BRAIN_ID, getModel } = require('./modelRegistry.js');
const { chatCompletion } = require('./llm.js');

const AGENTS = ['general', 'code', 'debug'];

function pickModel({ agent, hasImage, keys, llmPick }) {
  if (hasImage && keys.gemini) return getModel('gemini-multimodal');
  if (agent === 'code' && keys.openrouter) return getModel('openrouter-qwen-coder');
  if (agent === 'debug' && keys.openrouter) return getModel('openrouter-deepseek-debug');
  if (agent === 'code' || agent === 'debug') return getModel(BRAIN_ID);

  const pick = getModel(llmPick);
  if (pick && pick.provider === 'groq') return pick;
  return getModel(FAST_ID);
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (e) { /* on tente d'extraire l'objet */ }
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (e) { /* ignore */ }
  }
  return {};
}

const SYSTEM_PROMPT = `Tu es le Planner d'Octopus2. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour.

AGENT ("agent") :
- "general" : discussion, question, salutation, information, rédaction.
- "code" : UNIQUEMENT si l'utilisateur demande explicitement d'écrire, modifier ou générer du code.
- "debug" : UNIQUEMENT si l'utilisateur fournit une erreur ou demande de corriger un bug.

MODÈLE ("selectedModelId") pour l'agent "general" :
- "${FAST_ID}" : conversation simple, courte ou rapide.
- "${BRAIN_ID}" : réflexion globale, analyse, tâche lourde.

FORMAT :
{"selectedModelId": "${FAST_ID}" ou "${BRAIN_ID}", "agent": "general" | "code" | "debug", "activeProject": "NomDuProjet ou none", "reasoning": "explication courte"}`;

function fallbackPlan(reason, hasImage, keys) {
  return {
    selectedModel: pickModel({ agent: 'general', hasImage, keys }),
    agent: 'general',
    activeProject: 'none',
    needsWebSearch: false,
    reasoning: reason
  };
}

async function planRequest(userMessage, historySummary = '', hasImage = false, keys = {}) {
  if (!keys.groq) return fallbackPlan('Fallback sans clé Groq', hasImage, keys);

  const fast = getModel(FAST_ID);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Image jointe : ${hasImage}\nHistorique récent (extrait) : ${String(historySummary).slice(-1500)}\nMessage : "${String(userMessage).slice(0, 2000)}"`
    }
  ];

  const base = { provider: 'groq', apiKey: keys.groq, model: fast.modelName, messages, temperature: 0, timeoutMs: 8000 };

  try {
    let content;
    try {
      content = await chatCompletion({ ...base, extra: { response_format: { type: 'json_object' }, reasoning_effort: 'low' } });
    } catch (error) {
      // 400 = paramètre non accepté par ce modèle : on réessaie sans options
      if (error.providerStatus !== 400) throw error;
      content = await chatCompletion(base);
    }

    const result = parseJson(content);
    const agent = AGENTS.includes(result.agent) ? result.agent : 'general';

    return {
      selectedModel: pickModel({ agent, hasImage, keys, llmPick: result.selectedModelId }),
      agent,
      activeProject: typeof result.activeProject === 'string' ? result.activeProject : 'none',
      needsWebSearch: false,
      reasoning: typeof result.reasoning === 'string' ? result.reasoning : 'OK'
    };
  } catch (error) {
    console.error('[Planner] Échec, plan par défaut :', error.message);
    return fallbackPlan(`Planner indisponible (${error.message})`, hasImage, keys);
  }
}

module.exports = { planRequest, pickModel };
