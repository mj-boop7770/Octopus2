// api/core/octopusCore.js
// Cœur central d'orchestration d'Octopus2

const { planRequest } = require('../lib/planner.js');
const { runSpecializedAgent } = require('../lib/specializedAgents.js');
const { loadLongTermMemory, saveLongTermMemory } = require('../lib/longTermMemory.js');
const { getChatHistory, saveChatMessage } = require('../lib/jsonbin.js');

async function handleOctopusCore(reqBody, keys) {
  const { messages, sessionId = 'default-session', hasImage = false } = reqBody;
  
  if (!messages || messages.length === 0) {
    throw new Error("Aucun message fourni pour l'orchestration.");
  }

  const userLatestMessage = messages[messages.length - 1].content;

  // 1. Récupération de l'historique et de la mémoire à long terme
  const historySummary = await getChatHistory(sessionId);
  const memoryContext = await loadLongTermMemory();

  // 2. Étape du Routeur IA (Planner) : Choix de l'agent et du modèle
  const plan = await planRequest(userLatestMessage, historySummary, hasImage, keys.groq);

  // 3. Fusion du contexte mémoire pour l'agent
  const globalContextData = `Mémoire globale du projet: ${JSON.stringify(memoryContext)}\n\nHistorique récent:\n${historySummary}`;

  // 4. Exécution par l'Agent Spécialisé correspondant
  const executionResult = await runSpecializedAgent({
    plan,
    messages,
    contextData: globalContextData,
    keys
  });

  // 5. Sauvegarde de l'échange dans la mémoire JSONBin
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
      
