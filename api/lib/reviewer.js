// api/lib/reviewer.js
// Relecture optionnelle des réponses de code.
//
// DÉSACTIVÉE PAR DÉFAUT : un petit modèle qui réécrit la sortie d'un modèle plus fort
// tronque et dégrade le code. Pour l'activer : variable d'environnement ENABLE_REVIEWER=1.

const { chatCompletion } = require('./llm.js');
const { getModel, FAST_ID } = require('./modelRegistry.js');

async function reviewAndRefineResponse(agentType, rawResponse, userQuery, groqApiKey) {
  if (process.env.ENABLE_REVIEWER !== '1') return rawResponse;
  if ((agentType !== 'code' && agentType !== 'debug') || !groqApiKey) return rawResponse;

  try {
    const reviewed = await chatCompletion({
      provider: 'groq',
      apiKey: groqApiKey,
      model: getModel(FAST_ID).modelName,
      temperature: 0.1,
      timeoutMs: 15000,
      messages: [{
        role: 'user',
        content: `Tu es un réviseur technique. Vérifie la réponse ci-dessous. Corrige uniquement les erreurs réelles (balise cassée, bug évident) et renvoie la réponse COMPLÈTE, sans la raccourcir ni ajouter de commentaire.\n\nDemande : "${userQuery}"\n\nRéponse :\n"""\n${rawResponse}\n"""`
      }]
    });

    // Garde-fou : si la version relue est nettement plus courte, elle a été tronquée -> on garde l'original
    if (!reviewed || reviewed.length < rawResponse.length * 0.8) return rawResponse;
    return reviewed;
  } catch (error) {
    console.error('[Reviewer] Repli sur la réponse d\'origine :', error.message);
    return rawResponse;
  }
}

module.exports = { reviewAndRefineResponse };
