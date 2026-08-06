// api/chat.js
// Point d'entrée HTTP de l'API Chat d'Octopus2 (Version CommonJS unifiée)

const { handleOctopusCore } = require('./core/octopusCore.js');

module.exports = async function handler(req, res) {
  // Configuration des CORS pour autoriser le front-end
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-groq-key, x-openrouter-key, x-gemini-key, x-github-key, x-hf-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    // Appel du Cœur d'Octopus2 avec le corps et les headers de la requête
    const result = await handleOctopusCore(req.body, req.headers);

    return res.status(200).json({
      success: true,
      response: result.response,
      metadata: result.metadata
    });

  } catch (error) {
    console.error("Erreur dans l'API chat d'Octopus2:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erreur interne du serveur Octopus2."
    });
  }
};
    
