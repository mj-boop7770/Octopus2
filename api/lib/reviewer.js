// api/lib/reviewer.js

/**
 * Niveau 10 — La Boucle Intelligente (Auto-Correction & Relecture)
 * Analyse la réponse produite par l'agent et s'assure qu'elle ne contient pas d'erreurs flagrantes.
 */
export async function verifyAndRefine(draftResponse, userQuery, apiKey) {
  if (!draftResponse || !apiKey) return draftResponse;

  const systemPrompt = `Tu es le Reviewer interne d'Octopus2. Ton rôle est de vérifier la réponse générée par l'IA avant qu'elle ne soit envoyée à l'utilisateur.

RÈGLES STRICTES :
1. Vérifie si le code/texte fourni répond bien à la demande : "${userQuery}".
2. S'il y a des erreurs de syntaxe évidente, des bugs ou des explications incomplètes, CORRIGE-LES.
3. Si la réponse initiale est déjà excellente et sans erreur, renvoie-la TELLE QUELLE sans modification.
4. Ne rajoute pas d'explications sur ton rôle de reviewer (pas de "J'ai relu le code et..."). Donne directement la réponse finale propre.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Modèle ultra-rapide pour ne pas impacter le temps de réponse
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: draftResponse }
        ],
        temperature: 0.1,
        max_tokens: 1500
      })
    });

    if (!response.ok) return draftResponse;

    const data = await response.json();
    const refinedContent = data.choices?.[0]?.message?.content;

    return refinedContent || draftResponse;
  } catch (error) {
    console.error("Erreur lors de l'auto-correction:", error);
    return draftResponse; // En cas d'échec, on renvoie le premier jet
  }
          }
