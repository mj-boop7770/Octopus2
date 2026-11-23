// api/chat.js
// Point d'entrée de l'API Chat : réponse en flux NDJSON (une ligne JSON par événement).

const { validateAndSanitizeRequest } = require('./lib/securityLayer.js');
const { runAgent } = require('./lib/agent.js');
const { guard } = require('./lib/guard.js');

module.exports = async function handler(req, res) {
  if (guard(req, res, { name: 'chat', limit: 20 })) return;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée. Utilisez POST.' });

  let data;
  try {
    data = validateAndSanitizeRequest(req.body, req.headers);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, error: error.message });
  }

  const { messages, file, hasImage, mode, webSearch, keys } = data;

  // Le contenu d'un fichier texte doit se trouver dans le dernier message
  const last = messages.length - 1;
  if (file && file.text && !messages[last].content.includes(file.text.slice(0, 200))) {
    messages[last] = { ...messages[last], content: `${messages[last].content}\n\n[CONTENU DU FICHIER "${file.name}"]:\n${file.text}` };
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();

  const emit = (event) => { try { res.write(JSON.stringify(event) + '\n'); } catch (e) { /* client parti */ } };

  try {
    await runAgent({ messages, keys, mode, webSearch, hasImage, file, emit });
  } catch (error) {
    console.error("Erreur dans l'API chat d'Octopus2:", error);
    emit({ t: 'error', message: error.message || 'Erreur interne du serveur Octopus2.' });
  }
  res.end();
};
