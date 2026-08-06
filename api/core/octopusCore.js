// api/core/octopusCore.js
// Cœur central d'orchestration complet d'Octopus2

const { validateAndSanitizeRequest } = require('../lib/securityLayer.js');
const { planRequest } = require('../lib/planner.js');
const { runSpecializedAgent } = require('../lib/specializedAgents.js');
const { reviewAndRefineResponse } = require('../lib/reviewer.js');
const { getChatHistory, saveChatMessage } = require('../lib/jsonbin.js');
const { loadLongTermMemory } = require('../lib/longTermMemory.js');

async function handleOctopusCore(rawReqBody, rawHeaders) {
  // 1. Passage par la couche de sécurité et de nettoyage
  const secureData = validateAndSanitizeRequest(rawReqBody, rawHeaders);
  const { sessionId, messages, hasImage, keys } = secureData;

  const userLatestMessage = messages[messages.length - 1].content;

  // 2. Récupération de l'historique (JSONBin) et de la mémoire à long terme
  const historySummary = await getChatHistory(sessionId);
  const memoryContext = await loadLongTermMemory();

  // 3. Étape du Routeur IA (Planner) : Choix de l'agent et du modèle
  const plan = await planRequest(userLatestMessage, historySummary, hasImage, keys.groq);

  // 4. Constitution du contexte global pour l'agent
  const globalContextData = `Mémoire globale du projet: ${JSON.stringify(memoryContext)}\n\nHistorique récent:\n${historySummary}`;

  // 5. Exécution par l'Agent Spécialisé correspondant
  const executionResult = await runSpecializedAgent({
    plan,
    messages,
    contextData: globalContextData,
    keys
  });

  // 6. Étape de relecture et de validation par le Reviewer (si code ou GitHub)
  const finalResponseText = await reviewAndRefineResponse(
    plan.agent, 
    executionResult.response, 
    userLatestMessage, 
    keys.groq
  );

  // 7. Sauvegarde automatique de l'échange dans la mémoire JSONBin
  await saveChatMessage(sessionId, { role: 'user', content: userLatestMessage });
  await saveChatMessage(sessionId, { role: 'assistant', content: finalResponseText });

  return {
    response: finalResponseText,
    metadata: {
      agentUsed: plan.agent,
      modelUsed: executionResult.usedModel,
      activeProject: plan.activeProject,
      reasoning: plan.reasoning
    }
  };
}

module.exports = { handleOctopusCore };
    
