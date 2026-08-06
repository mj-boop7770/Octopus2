// api/core/octopusCore.js
// Cœur central d'orchestration d'Octopus2 (Mis à jour avec la Security Layer)

const { validateAndSanitizeRequest } = require('../lib/securityLayer.js');
const { planRequest } = require('../lib/planner.js');
const { runSpecializedAgent } = require('../lib/specializedAgents.js');
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

  // 4. Constitution du contexte global
  const globalContextData = `Mémoire globale du projet: ${JSON.stringify(memoryContext)}\n\nHistorique récent:\n${historySummary}`;

  // 5. Exécution par l'Agent Spécialisé correspondant
  const executionResult = await runSpecializedAgent({
    plan,
    messages,
    contextData: globalContextData,
    keys
  });

  // 6. Sauvegarde automatique de l'échange dans la mémoire JSONBin
  await saveChatMessage(sessionId, { role: 'user', content: userLatestMessage });
  await saveChatMessage(sessionId, { role: 'assistant', content: executionResult.response });

  return {
    response: executionResult.response,
    metadata: {
      agentUsed: plan.agent,
      modelUsed: executionResult.usedModel,
      activeProject: plan.activeProject,
      reasoning: plan.reasoning
    }
  };
}

module.exports = { handleOctopusCore };
                                 
