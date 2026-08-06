// api/lib/memory.js

/**
 * Niveau 2 — La Mémoire du Projet (RAG / Contexte Métier)
 * Fournit à Octopus2 la structure et la connaissance exacte du projet.
 */

const PROJECT_CONTEXT = {
  name: "Octopus2 AI Assistant",
  stack: ["Node.js Serverless (Vercel)", "Groq API", "Tavily Web Search API", "JavaScript CommonJS"],
  architecture: {
    entryPoint: "api/chat.js (Handler principal Vercel)",
    modules: [
      "api/core/octopusCore.js (Cœur central d'orchestration)",
      "api/lib/planner.js (Analyse et routage)",
      "api/lib/memory.js (Cartographie et mémoire du projet)"
    ]
  },
  guidelines: [
    "Toujours préférer le code propre, moderne et modulaire.",
    "Utiliser les modules CommonJS pour la stabilité sur Vercel.",
    "Conserver une exécution rapide compatible avec les limites Serverless Vercel (timeouts < 10s)."
  ]
};

function getProjectMemory() {
  return `
[MÉMOIRE ET ARCHITECTURE DU PROJET OCTOPUS2]:
- Nom: ${PROJECT_CONTEXT.name}
- Stack Technique: ${PROJECT_CONTEXT.stack.join(", ")}
- Structure des Fichiers:
${PROJECT_CONTEXT.architecture.modules.map(m => `  * ${m}`).join("\n")}
- Directives d'architecture: ${PROJECT_CONTEXT.guidelines.join(" ")}
`;
}

module.exports = {
  PROJECT_CONTEXT,
  getProjectMemory
};
  
