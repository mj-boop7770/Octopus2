// api/lib/toolManager.js
// Gestionnaire centralisé des outils (Tools) pour les agents d'Octopus2

const { saveChatMessage, getChatHistory } = require('./jsonbin.js');
const { writeGitHubFile, getGitHubFile } = require('./githubTools.js');

async function executeTool(toolName, toolArgs, keys) {
  console.log(`[Tool Manager] Exécution de l'outil : ${toolName}`, toolArgs);

  switch (toolName) {
    case 'save_memory':
      if (!toolArgs.sessionId || !toolArgs.message) {
        throw new Error("Paramètres manquants pour save_memory (sessionId et message requis).");
      }
      return await saveChatMessage(toolArgs.sessionId, toolArgs.message);

    case 'get_memory':
      if (!toolArgs.sessionId) {
        throw new Error("Paramètre sessionId manquant pour get_memory.");
      }
      return await getChatHistory(toolArgs.sessionId);

    case 'write_github':
      if (!keys.github && !process.env.GITHUB_TOKEN) {
        throw new Error("Clé GitHub manquante pour l'outil write_github.");
      }
      return await writeGitHubFile(
        toolArgs.path, 
        toolArgs.content, 
        toolArgs.message, 
        keys.github || process.env.GITHUB_TOKEN
      );

    case 'get_github':
      return await getGitHubFile(
        toolArgs.path, 
        keys.github || process.env.GITHUB_TOKEN
      );

    case 'generate_image':
      // Intégration de Pollinations.ai pour la génération d'images rapide et sans clé lourde
      const encodedPrompt = encodeURIComponent(toolArgs.prompt);
      return {
        success: true,
        imageUrl: `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}`
      };

    default:
      throw new Error(`Outil inconnu ou non supporté : ${toolName}`);
  }
}

module.exports = { executeTool };
          
