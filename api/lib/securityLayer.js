// api/lib/securityLayer.js
// Couche de sécurité et de validation pour Octopus2

function validateAndSanitizeRequest(reqBody, reqHeaders) {
  // 1. Validation de la structure de base
  if (!reqBody || !reqBody.messages || !Array.isArray(reqBody.messages)) {
    throw new Error("[Security] Format de requête invalide : le tableau 'messages' est requis.");
  }

  // 2. Extraction et validation de la session
  const sessionId = reqBody.sessionId ? sanitizeString(reqBody.sessionId) : 'default-session';

  // 3. Extraction et vérification des clés API (depuis le corps ou les headers sécurisés)
  const keys = {
    groq: reqBody.groqKey || reqHeaders['x-groq-key'] || process.env.GROQ_API_KEY,
    openrouter: reqBody.openrouterKey || reqHeaders['x-openrouter-key'] || process.env.OPENROUTER_API_KEY,
    gemini: reqBody.geminiKey || reqHeaders['x-gemini-key'] || process.env.GEMINI_API_KEY,
    github: reqBody.githubKey || reqHeaders['x-github-key'] || process.env.GITHUB_TOKEN,
    huggingface: reqBody.hfKey || reqHeaders['x-hf-key'] || process.env.HUGGING_FACE_API_KEY
  };

  if (!keys.groq) {
    throw new Error("[Security] Accès refusé : Clé API Groq obligatoire pour faire fonctionner le routeur central.");
  }

  // 4. Nettoyage des messages de l'utilisateur contre les injections de prompts grossières
  const sanitizedMessages = reqBody.messages.map(msg => ({
    role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
    content: sanitizeString(msg.content || '')
  }));

  return {
    isValid: true,
    sessionId,
    messages: sanitizedMessages,
    hasImage: Boolean(reqBody.hasImage),
    keys
  };
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  // Nettoyage basique des caractères de contrôle indésirables tout en préservant le code et le texte normal
  return str.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

module.exports = { validateAndSanitizeRequest };
    
