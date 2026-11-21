// api/core/octopusCore.js
// Cœur central d'orchestration d'Octopus2

const { validateAndSanitizeRequest } = require('../lib/securityLayer.js');
const { planRequest, pickModel } = require('../lib/planner.js');
const { runSpecializedAgent } = require('../lib/specializedAgents.js');
const { reviewAndRefineResponse } = require('../lib/reviewer.js');
const { getChatHistory, saveChatMessage } = require('../lib/jsonbin.js');
const { loadLongTermMemory } = require('../lib/longTermMemory.js');

async function handleOctopusCore(rawReqBody, rawHeaders) {
  const secureData = validateAndSanitizeRequest(rawReqBody, rawHeaders);
  const { sessionId, messages, clientHasHistory, hasImage, mode, file, keys } = secureData;

  if (hasImage && !keys.gemini) {
    const error = new Error("L'analyse d'image nécessite une clé Gemini (variable GEMINI_API_KEY).");
    error.statusCode = 400;
    throw error;
  }

  // Fichier texte : on s'assure que son contenu est bien dans le dernier message
  const lastIndex = messages.length - 1;
  let userLatestMessage = messages[lastIndex].content;
  if (file && file.text && !userLatestMessage.includes(file.text.slice(0, 200))) {
    userLatestMessage += `\n\n[CONTENU DU FICHIER "${file.name}"]:\n${file.text}`;
    messages[lastIndex] = { ...messages[lastIndex], content: userLatestMessage };
  }

  // Historique serveur (JSONBin) : seulement pour un client "sans mémoire" (un seul message
  // + sessionId). Si le client envoie déjà l'historique complet, on évite le doublon et
  // les allers-retours JSONBin (latence, écritures concurrentes).
  const useServerHistory = Boolean(sessionId) && !clientHasHistory;
  const historySummary = useServerHistory ? await getChatHistory(sessionId) : '';
  const memoryContext = await loadLongTermMemory();

  const plan = await planRequest(userLatestMessage, historySummary, hasImage, keys);

  // Le mode "Code" du menu force l'agent de code
  if (mode === 'code' && plan.agent === 'general') {
    plan.agent = 'code';
    plan.selectedModel = pickModel({ agent: 'code', hasImage, keys });
  }

  let selectedMode = 'standard';
  if (plan.agent === 'code' || plan.agent === 'debug') selectedMode = 'coder';
  else if (mode === 'creative') selectedMode = 'creative';
  else if (mode === 'concise') selectedMode = 'concise';

  const contextParts = [];
  if (memoryContext) contextParts.push(`Mémoire globale du projet:${memoryContext}`);
  if (historySummary) contextParts.push(`Historique récent:\n${historySummary}`);

  const executionResult = await runSpecializedAgent({
    plan,
    messages,
    contextData: contextParts.join('\n\n'),
    mode: selectedMode,
    file,
    keys
  });

  const finalResponseText = await reviewAndRefineResponse(plan.agent, executionResult.response, userLatestMessage, keys.groq);

  if (useServerHistory) {
    await saveChatMessage(sessionId, { role: 'user', content: userLatestMessage });
    await saveChatMessage(sessionId, { role: 'assistant', content: finalResponseText });
  }

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
