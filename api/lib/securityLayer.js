// api/lib/securityLayer.js
// Validation et nettoyage des requêtes entrantes d'Octopus2

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 30000;
const MAX_TOTAL_CHARS = 60000;
const MAX_FILE_TEXT_CHARS = 20000;
const MAX_IMAGE_DATA_CHARS = 4000000; // ~3 Mo d'image (la limite Vercel du corps est ~4,5 Mo)

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

// Un sessionId valide est un identifiant aléatoire fourni par le navigateur.
// Sans id valide, AUCUN historique serveur n'est lu ni écrit (plus de session partagée).
function sanitizeSessionId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : null;
}

function normalizeFile(file) {
  if (!file || typeof file !== 'object') return null;
  const normalized = {
    name: sanitizeString(String(file.name || 'fichier')).slice(0, 200),
    type: typeof file.type === 'string' ? file.type.slice(0, 100) : ''
  };
  if (typeof file.text === 'string') normalized.text = file.text.slice(0, MAX_FILE_TEXT_CHARS);
  if (typeof file.data === 'string' && normalized.type.startsWith('image/') && file.data.startsWith('data:image/')) {
    if (file.data.length > MAX_IMAGE_DATA_CHARS) throw httpError('Image trop volumineuse (3 Mo maximum).', 413);
    normalized.data = file.data;
  }
  return normalized;
}

function validateAndSanitizeRequest(reqBody, reqHeaders = {}) {
  if (!reqBody || typeof reqBody !== 'object') {
    throw httpError("Format de requête invalide : corps JSON attendu.", 400);
  }

  let rawMessages = reqBody.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    if (typeof reqBody.message === 'string') rawMessages = [{ role: 'user', content: reqBody.message }];
    else throw httpError("Format de requête invalide : le tableau 'messages' est requis.", 400);
  }

  const keys = {
    groq: reqBody.groqKey || reqHeaders['x-groq-key'] || process.env.GROQ_API_KEY,
    openrouter: reqBody.openrouterKey || reqHeaders['x-openrouter-key'] || process.env.OPENROUTER_API_KEY,
    gemini: reqBody.geminiKey || reqHeaders['x-gemini-key'] || process.env.GEMINI_API_KEY,
    github: reqBody.githubKey || reqHeaders['x-github-key'] || process.env.GITHUB_TOKEN,
    huggingface: reqBody.hfKey || reqHeaders['x-hf-key'] || process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY
  };

  if (!keys.groq) throw httpError('GROQ_API_KEY obligatoire pour utiliser le routeur central.', 500);

  let messages = rawMessages
    .filter(msg => msg && typeof msg.content === 'string')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: sanitizeString(msg.content).slice(0, MAX_MESSAGE_CHARS)
    }))
    .filter(msg => msg.content);

  if (!messages.length) throw httpError('Aucun message valide fourni.', 400);

  // Le client envoie déjà tout l'historique : si c'est le cas, il fait foi (voir octopusCore)
  const clientHasHistory = messages.length > 1;

  // Garde les derniers messages dans la limite de taille (le dernier est toujours conservé)
  messages = messages.slice(-MAX_MESSAGES);
  let total = 0;
  const kept = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    total += messages[i].content.length;
    if (kept.length > 0 && total > MAX_TOTAL_CHARS) break;
    kept.unshift(messages[i]);
  }

  const file = normalizeFile(reqBody.file);

  return {
    isValid: true,
    sessionId: sanitizeSessionId(reqBody.sessionId),
    messages: kept,
    clientHasHistory,
    hasImage: Boolean(file && file.data && file.type.startsWith('image/')),
    file,
    mode: typeof reqBody.mode === 'string' ? reqBody.mode : 'standard',
    webSearch: Boolean(reqBody.webSearch),
    keys
  };
}

module.exports = { validateAndSanitizeRequest, sanitizeString, sanitizeSessionId };
