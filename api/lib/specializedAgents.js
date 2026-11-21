// api/lib/specializedAgents.js
const { getProjectMemory } = require('./memory.js');
const { chatCompletion, geminiChat, parseDataUrl } = require('./llm.js');
const { getModel, BRAIN_ID, FAST_ID } = require('./modelRegistry.js');

const AGENT_PROMPTS = {
  coder: `Vous êtes DevPro, un expert en développement logiciel, architecture web, et debugging. Vous donnez des réponses précises, du code propre, bien structuré et optimisé.`,
  creative: `Vous êtes Muse, un assistant créatif, poétique, captivant et inspirant.`,
  concise: `Vous êtes Flash. Soyez ultra-concis, direct, clair et synthétique.`,
  standard: `Vous êtes MUJOS-OCTOPUS2, un assistant IA polyvalent, intelligent, courtois et efficace.`
};

function buildMessages(mode, messages, contextData) {
  let system = AGENT_PROMPTS[mode] || AGENT_PROMPTS.standard;
  try {
    const projectMemory = getProjectMemory();
    if (projectMemory) system += `\n\n${projectMemory}`;
  } catch (e) { /* mémoire projet facultative */ }

  if (contextData) system += `\n\n[DONNÉES DU CONTEXTE]:\n${contextData}`;

  return [{ role: 'system', content: system }, ...messages];
}

async function callModel(model, formattedMessages, keys, image) {
  if (model.provider === 'gemini') {
    return geminiChat({ apiKey: keys.gemini, model: model.modelName, messages: formattedMessages, image });
  }
  return chatCompletion({
    provider: model.provider,
    apiKey: keys[model.provider], // chaque fournisseur a SA clé, aucun mélange
    model: model.modelName,
    messages: formattedMessages
  });
}

function toHttpError(model, error) {
  let message = `Le modèle « ${model.modelName} » (${model.provider}) n'a pas pu répondre : ${error.message}`;
  if (error.providerStatus === 401 || error.providerStatus === 403) {
    message = `Clé ${model.provider} refusée par le fournisseur. Vérifie la variable d'environnement correspondante.`;
  } else if (error.providerStatus === 429) {
    message = `Limite d'utilisation du plan gratuit ${model.provider} atteinte. Réessaie dans un moment.`;
  }
  const wrapped = new Error(message);
  wrapped.statusCode = 502;
  return wrapped;
}

async function runSpecializedAgent({ plan, messages, contextData, mode, file, keys }) {
  const formattedMessages = buildMessages(mode, messages, contextData);
  const model = plan.selectedModel;
  const image = file && file.type && file.type.startsWith('image/') ? parseDataUrl(file.data) : null;

  try {
    const response = await callModel(model, formattedMessages, keys, image && model.provider === 'gemini' ? image : null);
    return { response: response || 'Aucune réponse générée.', usedModel: model.id };
  } catch (error) {
    console.error(`[Agent] ${model.id} a échoué :`, error.message);

    // Repli sur un modèle Groq si le modèle choisi (OpenRouter, ...) est en panne.
    // Pas de repli pour Gemini : un modèle texte ne peut pas lire l'image.
    const canFallback = model.provider !== 'groq' && model.provider !== 'gemini' && keys.groq;
    if (!canFallback) throw toHttpError(model, error);

    const fallback = getModel(BRAIN_ID) || getModel(FAST_ID);
    try {
      const response = await callModel(fallback, formattedMessages, keys, null);
      return { response: response || 'Aucune réponse générée.', usedModel: `${fallback.id} (repli)` };
    } catch (fallbackError) {
      console.error(`[Agent] Repli ${fallback.id} a échoué :`, fallbackError.message);
      throw toHttpError(fallback, fallbackError);
    }
  }
}

module.exports = { runSpecializedAgent };
