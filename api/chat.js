// api/chat.js
const { handleOctopusCore } = require('./core/octopusCore.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const result = await handleOctopusCore(req.body, req.headers);
    // response est le format canonique; reply préserve la compatibilité avec l'interface existante.
    return res.status(200).json({ success: true, ...result, reply: result.response });
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 502;
    console.error("Erreur dans l'API chat d'Octopus2:", error);
    return res.status(statusCode).json({ success: false, error: error.message || 'Erreur interne du serveur Octopus2.' });
  }
};

module.exports.config = { maxDuration: 60 };
