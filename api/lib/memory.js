// api/lib/memory.js

/**
 * Niveau 2 — La Mémoire du Projet (RAG / Contexte Métier)
 * Fournit à Octopus2 la structure et la connaissance exacte du projet.
 */

export const PROJECT_CONTEXT = {
  name: "Octopus2 AI Assistant",
  stack: ["Node.js Serverless (Vercel)", "Groq API", "Tavily Web Search API", "JavaScript ES6"],
  architecture: {
    entryPoint: "api/chat.js (Handler principal Vercel)",
    modules: [
      "api/lib/planner.js (Niveau 1: Analyse et découpage des tâches en JSON)",
      "api/lib/memory.js (Niveau 2: Cartographie et mémoire du projet)",
      "api/lib/searchTavily.js (Niveau 9: Agent de recherche Web)"
    ]
  },
  guidelines: [
    "Toujours préférer le code propre, moderne et modulaire.",
    "Utiliser les imports/exports ES6 (type: module).",
    "Conserver une exécution rapide compatible avec les limites Serverless Vercel (timeouts < 10s)."
  ]
};

export function getProjectMemory() {
  return `
[MÉMOIRE ET ARCHITECTURE DU PROJET OCTOPUS2]:
- Nom: ${PROJECT_CONTEXT.name}
- Stack Technique: ${PROJECT_CONTEXT.stack.join(", ")}
- Structure des Fichiers:
${PROJECT_CONTEXT.architecture.modules.map(m => `  * ${m}`).join("\n")}
- Directives d'architecture: ${PROJECT_CONTEXT.guidelines.join(" ")}
`;
}
