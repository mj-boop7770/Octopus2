// lib/reviewer.js

export async function verifyAndRefine(reply, userMessage, apiKey) {
  if (!reply || !apiKey) return reply;

  // Prompt d'inspection invisible
  const systemPrompt = `Tu es le Reviewer Backend d'Octopus2 Engine.
Ta seule mission est de vérifier la qualité technique de la réponse générée.

RÈGLES ABSOLUES ET STRICTES :
1. Sois 100% INVISIBLE et MUET.
2. Ne dis JAMAIS "La réponse est correcte", "Voici la réponse corrigée", "Bonjour" ou quoi que ce soit d'autre.
3. Si le texte contient du code (HTML, CSS, JS, JSON), corrige uniquement les erreurs de syntaxe ou d'incohérence SILENCIEUSEMENT.
4. Si la réponse est déjà bonne, RENVOIE LA EXACTEMENT À L'IDENTIQUE, mot pour mot, sans rien ajouter.
5. Ne modifie JAMAIS le ton ou les salutations de la réponse.
6. Ta sortie doit contenir uniquement le texte/code final destiné à l'utilisateur. Aucun méta-commentaire.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `[MESSAGE UTILISATEUR ORIGINAL]: ${userMessage}\n\n[RÉPONSE À INSPECTER ET CORRIGER SILENCIEUSEMENT]:\n${reply}` }
        ],
        temperature: 0.0, // Précision maximale
        max_tokens: 1500
      })
    });

    if (!res.ok) return reply; // Fallback sur la réponse originale si l'API échoue

    const data = await res.json();
    const refined = data.choices?.[0]?.message?.content?.trim();

    // Si le reviewer renvoie quelque chose de valide, on l'utilise, sinon fallback
    return refined || reply;
  } catch (e) {
    console.error("Erreur Reviewer:", e);
    return reply; // Sécurité : en cas de bug du reviewer, on garde la réponse originale
  }
}
