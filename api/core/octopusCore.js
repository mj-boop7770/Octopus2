// api/core/octopusCore.js
// Orchestration de la conversation Octopus2.

const { validateAndSanitizeRequest } = require('../lib/securityLayer.js');
const { planRequest } = require('../lib/planner.js');
const { runSpecializedAgent } = require('../lib/specializedAgents.js');
const { reviewAndRefineResponse } = require('../lib/reviewer.js');
const { getChatHistory, saveChatMessage } = require('../lib/jsonbin.js');
const { loadLongTermMemory } = require('../lib/longTermMemory.js');

async function handleOctopusCore(rawReqBody, rawHeaders = {}) {
  const { sessionId, messages, hasImage, mode, keys } = validateAndSanitizeRequest(rawReqBody, rawHeaders);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';

  // Les services de mémoire sont facultatifs : leur panne ne doit pas bloquer le chat.
  const [historyResult, memoryResult] = await Promise.allSettled([
    getChatHistory(sessionId),
    loadLongTermMemory()
  ]);
  const historySummary = historyResult.status === 'fulfilled' ? historyResult.value : '';
  const memoryContext = memoryResult.status === 'fulfilled' ? memoryResult.value : '';

  const plan = await planRequest(latestUserMessage, historySummary, hasImage, keys.groq);
  const globalContextData = [
    memoryContext ? `Mémoire globale du projet : ${memoryContext}` : '',
    historySummary ? `Historique récent :\n${historySummary}` : ''
  ].filter(Boolean).join('\n\n');

  const executionResult = await runSpecializedAgent({
    plan,
    messages,
    contextData: globalContextData,
    mode,
    keys
  });

  const finalResponseText = await reviewAndRefineResponse(
    plan.agent,
    executionResult.response,
    latestUserMessage,
    keys.groq
  );

  // JSONBin est optionnel; ne transforme pas une réponse réussie en erreur API.
  await Promise.allSettled([
    saveChatMessage(sessionId, { role: 'user', content: latestUserMessage }),
    saveChatMessage(sessionId, { role: 'assistant', content: finalResponseText })
  ]);

  return {
    response: finalResponseText,
    metadata: {
      agentUsed: plan.agent,
      modelUsed: executionResult.usedModel?.modelName || executionResult.usedModel || 'unknown',
      activeProject: plan.activeProject || 'none',
      reasoning: plan.reasoning || ''
    }
  };
}

module.exports = { handleOctopusCore };
