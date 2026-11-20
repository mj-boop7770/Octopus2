// api/chat.js
// Point d'entrée HTTP de l'API Chat d'Octopus2

const { handleOctopusCore } = require('./core/octopusCore.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, x-groq-key, x-openrouter-key, x-gemini-key, x-github-key, x-hf-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Méthode non autorisée. Utilisez POST.' });

  try {
    const result = await handleOctopusCore(req.body, req.headers);
    return res.status(200).json({ success: true, response: result.response, reply: result.response, metadata: result.metadata });
  } catch (error) {
    console.error("Erreur dans l'API chat d'Octopus2:", error);
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Erreur interne du serveur Octopus2.' });
  }
};
