// api/core/octopusCore.js
// Cœur central d'orchestration complet d'Octopus2

const { validateAndSanitizeRequest } = require('../lib/securityLayer.js');
const { planRequest } = require('../lib/planner.js');
const { runSpecializedAgent } = require('../lib/specializedAgents.js');
const { reviewAndRefineResponse } = require('../lib/reviewer.js');
const { getChatHistory, saveChatMessage } = require('../lib/jsonbin.js');
const { loadLongTermMemory } = require('../lib/longTermMemory.js');

async function handleOctopusCore(rawReqBody, rawHeaders) {
  const secureData = validateAndSanitizeRequest(rawReqBody, rawHeaders);
  const { sessionId, messages, hasImage, mode, file, keys } = secureData;
  const userLatestMessage = messages[messages.length - 1].content;

  const historySummary = await getChatHistory(sessionId);
  const memoryContext = await loadLongTermMemory();
  const plan = await planRequest(userLatestMessage, historySummary, hasImage, keys.groq);

  let selectedMode = mode;
  if (plan.agent === 'code') selectedMode = 'coder';
  else if (plan.agent === 'debug') selectedMode = 'coder';
  else if (mode === 'creative') selectedMode = 'creative';
  else if (mode === 'concise') selectedMode = 'concise';
  else selectedMode = 'standard';

  const globalContextData = `Mémoire globale du projet: ${JSON.stringify(memoryContext)}\n\nHistorique récent:\n${historySummary}`;
  const executionResult = await runSpecializedAgent({
    plan,
    messages,
    contextData: globalContextData,
    mode: selectedMode,
    file,
    keys
  });

  const finalResponseText = await reviewAndRefineResponse(plan.agent, executionResult.response, userLatestMessage, keys.groq);

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
