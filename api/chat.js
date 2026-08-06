// api/chat.js
// Point d'entrée HTTP de l'API Chat d'Octopus2

import { handleOctopusCore } from './core/octopusCore.js';

export default async function handler(req, res) {
  // Configuration des CORS pour autoriser le front-end
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    // Récupération des clés API depuis l'environnement ou les en-têtes de la requête
    const keys = {
      groq: process.env.GROQ_API_KEY || req.headers['x-groq-key'],
      openrouter: process.env.OPENROUTER_API_KEY || req.headers['x-openrouter-key'],
      gemini: process.env.GEMINI_API_KEY || req.headers['x-gemini-key']
    };

    if (!keys.groq) {
      return res.status(400).json({ error: "Clé API Groq manquante (nécessaire pour le Planner et le Core)." });
    }

    // Appel du Cœur d'Octopus2 avec le corps de la requête et les clés
    const result = await handleOctopusCore(req.body, keys);

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
        }
