// api/lib/securityLayer.js
// Couche de sécurité et de validation pour Octopus2

function validateAndSanitizeRequest(reqBody, reqHeaders = {}) {
  if (!reqBody || !Array.isArray(reqBody.messages) || reqBody.messages.length === 0) {
    if (reqBody && typeof reqBody.message === 'string') {
      reqBody.messages = [{ role: 'user', content: reqBody.message }];
    } else {
      throw new Error("[Security] Format de requête invalide : le tableau 'messages' est requis.");
    }
  }

  const sessionId = reqBody.sessionId ? sanitizeString(reqBody.sessionId) : 'default-session';
  const keys = {
    groq: reqBody.groqKey || reqHeaders['x-groq-key'] || process.env.GROQ_API_KEY,
    openrouter: reqBody.openrouterKey || reqHeaders['x-openrouter-key'] || process.env.OPENROUTER_API_KEY,
    gemini: reqBody.geminiKey || reqHeaders['x-gemini-key'] || process.env.GEMINI_API_KEY,
    github: reqBody.githubKey || reqHeaders['x-github-key'] || process.env.GITHUB_TOKEN,
    huggingface: reqBody.hfKey || reqHeaders['x-hf-key'] || process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY
  };

  if (!keys.groq) throw new Error('[Security] GROQ_API_KEY obligatoire pour utiliser le routeur central.');

  const sanitizedMessages = reqBody.messages
    .filter(msg => msg && typeof msg.content === 'string')
    .map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: sanitizeString(msg.content) }))
    .filter(msg => msg.content);

  if (!sanitizedMessages.length) throw new Error('[Security] Aucun message valide fourni.');

  return {
    isValid: true,
    sessionId,
    messages: sanitizedMessages,
    hasImage: Boolean(reqBody.hasImage || reqBody.file?.type?.startsWith('image/')),
    file: reqBody.file || null,
    mode: reqBody.mode || 'standard',
    webSearch: Boolean(reqBody.webSearch),
    keys
  };
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

module.exports = { validateAndSanitizeRequest, sanitizeString };
