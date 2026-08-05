export default async function handler(req, res) {
    // Configuration des en-têtes CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
    }

    try {
        // Chargement dynamique sécurisé des modules dépendants
        const { planRequest } = await import('./lib/planner.js');
        const { default: runSpecializedAgent } = await import('./lib/specializedAgents.js');

        const { messages = [], image = null, mode = 'standard', webSearch = false } = req.body || {};

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Aucun message fourni dans la requête.' });
        }

        const lastUserMessage = messages[messages.length - 1]?.content || '';
        
        // Récupération des clés d'API depuis l'environnement Vercel
        const apiKeys = {
            groq: process.env.GROQ_API_KEY,
            openrouter: process.env.OPENROUTER_API_KEY,
            gemini: process.env.GEMINI_API_KEY
        };

        // 1. Analyse du besoin via le Planner
        const plan = await planRequest(
            lastUserMessage,
            "",
            Boolean(image),
            apiKeys.groq
        );

        // 2. Traitement par l'Agent Spécialisé
        const result = await runSpecializedAgent({
            plan,
            messages,
            contextData: webSearch ? "Recherche web activée" : null,
            mode,
            image,
            keys: apiKeys
        });

        return res.status(200).json({
            response: result.response,
            model: result.usedModel || plan.selectedModel,
            agent: plan.agent
        });

    } catch (error) {
        // En cas d'erreur de chargement ou d'exécution, on renvoie un JSON explicite au lieu de faire planter Node
        console.error("Erreur Backend Runtime:", error);
        return res.status(500).json({
            error: "Erreur lors du traitement de la requête sur le serveur.",
            details: error.message
        });
    }
          }
      
