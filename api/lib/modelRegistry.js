// lib/modelRegistry.js - Le Registre Officiel d'Octopus2

export const MODEL_REGISTRY = [
  {
    id: "groq-planner",
    provider: "groq",
    modelName: "llama-3.1-8b-instant",
    strengths: [
      "Vitesse d'exécution extrêmement rapide",
      "Formatage JSON strict",
      "Classification d'intentions utilisateur",
      "Quota quotidien élevé (14k RPD)"
    ],
    bestFor: ["intent_planning", "quick_chat", "routing"],
    maxTokens: 8000
  },
  {
    id: "groq-architecture",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile",
    strengths: [
      "Raisonnement logique avancé",
      "Analyse d'architecture logicielle",
      "Compréhension approfondie des demandes"
    ],
    bestFor: ["general_expert", "architecture_planning", "complex_logic"],
    maxTokens: 32000
  },
  {
    id: "openrouter-agent-code",
    provider: "openrouter",
    modelName: "poolside/laguna-m.1:free",
    strengths: [
      "Spécialisation en ingénierie logicielle",
      "Génération et correction de code",
      "Interactions avec la structure GitHub"
    ],
    bestFor: ["deep_coding", "file_generation", "refactoring", "github_action"],
    maxTokens: 32000
  },
  {
    id: "gemini-multimodal",
    provider: "gemini",
    modelName: "gemini-2.5-flash",
    strengths: [
      "Traitement et analyse d'images",
      "Gestion de larges fenêtres de contexte",
      "Analyse de documents longs"
    ],
    bestFor: ["image_analysis", "large_history", "document_reading"],
    maxTokens: 1000000
  },
  {
    id: "openrouter-multi-agent",
    provider: "openrouter",
    modelName: "nvidia/nemotron-3-super-120b-a12b:free",
    strengths: [
      "Raisonnement multi-documents",
      "Diagnostic de problèmes complexes",
      "Traitement de consignes détaillées"
    ],
    bestFor: ["debugging", "complex_investigation", "multi_step_reasoning"],
    maxTokens: 64000
  }
];
    
