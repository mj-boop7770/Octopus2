// api/lib/modelRegistry.js - Le Catalogue Officiel Octopus2

const MODEL_REGISTRY = [
  {
    id: "groq-planner-fast",
    provider: "groq",
    modelName: "llama-3.1-8b-instant",
    strengths: [
      "Vitesse instantanée",
      "Formatage JSON strict",
      "Classification d'intentions",
      "Conversations légères"
    ],
    bestFor: ["intent_planning", "quick_chat", "json_parsing"],
    maxTokens: 8000
  },
  {
    id: "groq-brain-70b",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile",
    strengths: [
      "Raisonnement logique supérieur",
      "Architecture logicielle",
      "Rédaction avancée",
      "Compréhension de contexte complexe"
    ],
    bestFor: ["general_expert", "architecture_analysis", "complex_reasoning"],
    maxTokens: 32000
  },
  {
    id: "openrouter-qwen-coder",
    provider: "openrouter",
    modelName: "qwen/qwen-2.5-coder-32b-instruct:free",
    strengths: [
      "Spécialiste pur du Code",
      "Syntaxe JavaScript/HTML/CSS parfaite",
      "Écriture de scripts et refactoring",
      "Compréhension de structures GitHub"
    ],
    bestFor: ["deep_coding", "file_generation", "refactoring", "github_action"],
    maxTokens: 32000
  },
  {
    id: "gemini-multimodal",
    provider: "gemini",
    modelName: "gemini-1.5-flash",
    strengths: [
      "Analyse d'images et photos",
      "Contexte géant (1M tokens)",
      "Lecture de gros historiques ou fichiers textuels",
      "Polyvalence et fiabilité"
    ],
    bestFor: ["image_analysis", "large_history", "document_reading"],
    maxTokens: 1000000
  },
  {
    id: "openrouter-deepseek-debug",
    provider: "openrouter",
    modelName: "deepseek/deepseek-r1:free",
    strengths: [
      "Raisonnement pas à pas (Chain of thought)",
      "Détection de bugs complexes",
      "Analyse d'erreurs logiques ou de syntaxe"
    ],
    bestFor: ["debugging", "error_investigation", "logic_fix"],
    maxTokens: 32000
  }
];

module.exports = { MODEL_REGISTRY };
