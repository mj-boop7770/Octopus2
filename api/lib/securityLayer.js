// api/lib/securityLayer.js
// Validation et normalisation des requêtes reçues par l'API.

const MAX_MESSAGE_LENGTH = 100_000;
const ALLOWED_MODES = new Set(['standard', 'creative', 'code', 'concise']);

function validateAndSanitizeRequest(reqBody, reqHeaders = {}) {
  if (!reqBody || typeof reqBody !== 'object' || !Array.isArray(reqBody.messages)) {
    const error = new Error("Format de requête invalide : le tableau 'messages' est requis.");
    error.statusCode = 400;
    throw error;
  }

  const messages = reqBody.messages
    .filter((message) => message && ['user', 'assistant'].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: sanitizeString(message.content)
    }));

  if (messages.length === 0 || !messages.some((message) => message.role === 'user')) {
    const error = new Error('Un message utilisateur est requis.');
    error.statusCode = 400;
    throw error;
  }

  // Le front fournit le prompt enrichi séparément afin d'y inclure le contenu
  // des fichiers texte joints. Il remplace seulement le dernier message user.
  const latestUserIndex = messages.map((message) => message.role).lastIndexOf('user');
  if (typeof reqBody.message === 'string' && latestUserIndex >= 0) {
    messages[latestUserIndex].content = sanitizeString(reqBody.message);
  }

  if (messages.some((message) => message.content.length > MAX_MESSAGE_LENGTH)) {
    const error = new Error('Un message dépasse la taille maximale autorisée.');
    error.statusCode = 413;
    throw error;
  }

  const header = (name) => reqHeaders[name] || reqHeaders[name.toLowerCase()];
  const keys = {
    groq: reqBody.groqKey || header('x-groq-key') || process.env.GROQ_API_KEY,
    openrouter: reqBody.openrouterKey || header('x-openrouter-key') || process.env.OPENROUTER_API_KEY,
    gemini: reqBody.geminiKey || header('x-gemini-key') || process.env.GEMINI_API_KEY,
    github: reqBody.githubKey || header('x-github-key') || process.env.GITHUB_TOKEN,
    huggingface: reqBody.hfKey || header('x-hf-key') || process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY
  };

  if (!keys.groq) {
    const error = new Error('La variable serveur GROQ_API_KEY est requise pour le chat.');
    error.statusCode = 503;
    throw error;
  }

  const sessionId = sanitizeString(reqBody.sessionId || 'default-session').slice(0, 128) || 'default-session';
  return {
    isValid: true,
    sessionId,
    messages,
    hasImage: Boolean(reqBody.hasImage || reqBody.file?.type?.startsWith('image/')),
    mode: ALLOWED_MODES.has(reqBody.mode) ? reqBody.mode : 'standard',
    webSearch: Boolean(reqBody.webSearch),
    keys
  };
}

function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  // Préserve les retours à la ligne et tabulations (essentiels au code joint).
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '').trim();
}

module.exports = { validateAndSanitizeRequest };
