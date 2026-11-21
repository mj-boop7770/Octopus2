// api/lib/modelRegistry.js - Le Catalogue Officiel Octopus2
//
// Les noms de modèles peuvent être changés SANS toucher au code, via des variables
// d'environnement Vercel (utile quand un fournisseur retire un modèle) :
//   GROQ_FAST_MODEL, GROQ_BRAIN_MODEL, OPENROUTER_CODER_MODEL,
//   OPENROUTER_DEBUG_MODEL, GEMINI_MODEL

const env = process.env;

const FAST_ID = 'groq-planner-fast';
const BRAIN_ID = 'groq-brain-120b';

const MODEL_REGISTRY = [
  {
    id: FAST_ID,
    provider: 'groq',
    modelName: env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b',
    strengths: ['Vitesse', 'Formatage JSON', 'Classification d\'intentions', 'Conversations légères'],
    bestFor: ['intent_planning', 'quick_chat', 'json_parsing']
  },
  {
    id: BRAIN_ID,
    provider: 'groq',
    modelName: env.GROQ_BRAIN_MODEL || 'openai/gpt-oss-120b',
    strengths: ['Raisonnement', 'Code', 'Architecture logicielle', 'Rédaction avancée'],
    bestFor: ['general_expert', 'architecture_analysis', 'complex_reasoning', 'coding']
  },
  {
    id: 'openrouter-qwen-coder',
    provider: 'openrouter',
    modelName: env.OPENROUTER_CODER_MODEL || 'qwen/qwen-2.5-coder-32b-instruct:free',
    strengths: ['Spécialiste du code', 'JavaScript/HTML/CSS', 'Refactoring'],
    bestFor: ['deep_coding', 'file_generation', 'refactoring']
  },
  {
    id: 'openrouter-deepseek-debug',
    provider: 'openrouter',
    modelName: env.OPENROUTER_DEBUG_MODEL || 'deepseek/deepseek-r1:free',
    strengths: ['Raisonnement pas à pas', 'Détection de bugs'],
    bestFor: ['debugging', 'error_investigation']
  },
  {
    id: 'gemini-multimodal',
    provider: 'gemini',
    modelName: env.GEMINI_MODEL || 'gemini-2.5-flash',
    strengths: ['Analyse d\'images', 'Grand contexte'],
    bestFor: ['image_analysis', 'document_reading']
  }
];

function getModel(id) {
  return MODEL_REGISTRY.find(m => m.id === id) || null;
}

module.exports = { MODEL_REGISTRY, FAST_ID, BRAIN_ID, getModel };
