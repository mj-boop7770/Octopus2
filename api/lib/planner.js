// api/lib/planner.js

/**
 * Niveau 1 — Le Planner (Chef d'orchestre)
 * Analyse la demande et génère un plan d'action structuré en JSON.
 */
export async function createPlan(userMessage, apiKey) {
  if (!userMessage || !apiKey) {
    return {
      agent: 'general',
      steps: ['Traiter la demande directement']
    };
  }

  const systemPrompt = `Tu es le Planner d'Octopus2. Ton rôle unique est d'analyser la demande et de produire un plan de réalisation court.
Tu dois TOUJOURS répondre au format JSON strict avec exactement ces deux clés :
1. "agent": Choisis parmi ["code", "review", "debug", "general", "writing"].
2. "steps": Un tableau (Array) de strings décrivant les étapes clés à accomplir (maximum 4 étapes).

Ne génère AUCUN texte en dehors du JSON.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Modèle ultra-rapide pour ne pas créer de latence
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" } // Force le format JSON valide
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP Planner: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Erreur lors de la planification:", error);
    // Stratégie de secours (Fallback) si le Planner échoue
    return {
      agent: 'general',
      steps: ['Exécuter la requête directement']
    };
  }
        }
