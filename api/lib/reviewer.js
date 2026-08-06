// api/lib/reviewer.js
// Module de relecture, validation et correction des réponses d'Octopus2

async function reviewAndRefineResponse(agentType, rawResponse, userQuery, groqApiKey) {
  // Si ce n'est pas du code ou une tâche critique, on laisse passer tel quel pour garder de la vitesse
  if (agentType !== 'code' && agentType !== 'github') {
    return rawResponse;
  }

  console.log(`[Reviewer] Analyse et relecture de la réponse pour l'agent : ${agentType}`);

  // Pour les tâches de code/GitHub, on peut effectuer une passe de vérification rapide via un modèle léger (Groq)
  try {
    const prompt = `Tu es un réviseur technique rigoureux. Vérifie le texte/code suivant généré pour répondre à la demande de l'utilisateur. 
    Assure-toi qu'il n'y a pas d'erreur grossière, de balise cassée ou d'oubli critique. 
    Renvoie le contenu corrigé ou validé directement, sans bavardage inutile.

    Demande initiale : "${userQuery}"

    Contenu à valider :
    """
    ${rawResponse}
    """`;

    // Appel rapide à l'API Groq pour la relecture
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      console.warn("[Reviewer] Avertissement : Impossible d'exécuter la relecture automatique, retour du contenu brut.");
      return rawResponse;
    }

    const data = await response.json();
    const refinedContent = data.choices?.[0]?.message?.content || rawResponse;
    return refinedContent;

  } catch (error) {
    console.error("[Reviewer] Erreur lors de la relecture, repli sur le contenu d'origine :", error.message);
    return rawResponse;
  }
}

module.exports = { reviewAndRefineResponse };
  
