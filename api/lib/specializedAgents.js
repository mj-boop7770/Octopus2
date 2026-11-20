// api/lib/specializedAgents.js
const { getProjectMemory } = require('./memory.js');

const MODE_PROMPTS = {
  standard: 'Tu es MUJOS-OCTOPUS2, un assistant IA polyvalent, courtois et efficace.',
  creative: 'Tu es Muse, un assistant créatif, imaginatif et inspirant.',
  concise: 'Tu es Flash. Réponds de façon concise, directe et claire.',
  code: 'Tu es DevPro, un développeur senior. Fournis des réponses techniques précises, du code fonctionnel et explique les changements utiles.'
};

function providerFor(model) {
  return model?.provider || 'groq';
}

async function runSpecializedAgent({ plan = {}, messages = [], contextData = '', mode = 'standard', keys = {} }) {
  const selectedModel = plan.selectedModel || { provider: 'groq', modelName: 'llama-3.1-8b-instant' };
  let provider = providerFor(selectedModel);
  let apiUrl;
  let apiKey;
  let modelName = selectedModel.modelName;

  if (provider === 'openrouter' && keys.openrouter) {
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    apiKey = keys.openrouter;
  } else {
    // Gemini n'est pas compatible avec l'endpoint OpenAI utilisé par ce module.
    // Si un fournisseur alternatif est indisponible, basculer réellement sur Groq
    // plutôt que d'envoyer un modèle inconnu au mauvais endpoint.
    provider = 'groq';
    apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    apiKey = keys.groq;
    modelName = providerFor(selectedModel) === 'groq' && selectedModel.modelName
      ? selectedModel.modelName
      : 'llama-3.1-8b-instant';
  }

  if (!apiKey) {
    const error = new Error(`Aucune clé API disponible pour le fournisseur ${provider}.`);
    error.statusCode = 503;
    throw error;
  }

  const systemParts = [MODE_PROMPTS[mode] || MODE_PROMPTS.standard, getProjectMemory(), contextData]
    .filter(Boolean);
  const conversation = messages
    .filter((message) => message && ['user', 'assistant'].includes(message.role))
    .map(({ role, content }) => ({ role, content: typeof content === 'string' ? content : '' }));

  const apiMessages = [
    { role: 'system', content: systemParts.join('\n\n') },
    ...conversation
  ];

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(provider === 'openrouter' ? { 'HTTP-Referer': process.env.APP_URL || 'https://octopus2-psi.vercel.app', 'X-Title': 'Octopus2' } : {})
    },
    body: JSON.stringify({ model: modelName, messages: apiMessages, temperature: 0.7 })
  });

  if (!response.ok) {
    const providerMessage = await response.text().catch(() => 'Réponse fournisseur indisponible');
    console.error(`[Octopus2] ${provider} a répondu ${response.status}:`, providerMessage.slice(0, 1000));
    const error = new Error(`Le fournisseur IA a renvoyé une erreur (${response.status}). Vérifiez la clé API et le modèle configuré.`);
    error.statusCode = response.status === 401 || response.status === 403 ? 502 : 503;
    throw error;
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) {
    throw new Error('Le fournisseur IA a renvoyé une réponse vide.');
  }

  return { response: answer, usedModel: { provider, modelName } };
}

module.exports = { runSpecializedAgent };
