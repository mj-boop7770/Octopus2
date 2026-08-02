// api/planner.js - Orchestrateur d'intention et de compétences dynamiques
import { MODEL_REGISTRY } from './lib/modelRegistry.js';

export async function planRequest(userMessage, historySummary = "", hasImage = false, groqApiKey) {
  // Sécurité si la clé Groq est indisponible
  if (!groqApiKey) {
    const defaultModel = MODEL_REGISTRY.find(m => m.id === 'groq-planner') || MODEL_REGISTRY[0];
    return {
      selectedModel: defaultModel,
      agent: 'general',
      activeProject: 'none',
      needsWebSearch: false,
      reasoning: 'Fallback par défaut (sans clé API)'
    };
  }

  // On prépare la description dynamique du Registre pour le prompt système
  const registryDescription = MODEL_REGISTRY.map(m => 
    `- ID: "${m.id}" | Modèle: ${m.modelName} | Forces: ${m.strengths.join(', ')} | Cas d'usages idéaux: ${m.bestFor.join(', ')}`
  ).join('\n');

  const systemPrompt = `Tu es le Planner d'Octopus2, un orchestrateur d'IA de niveau production.
Ta mission est d'analyser l'intention du message utilisateur et d'AFFECTER LA MEILLEURE IA disponible dans le catalogue ci-dessous.

CATALOGUE DES IA DISPONIBLES :
${registryDescription}

RÈGLES D'AIGUILLAGE STRICTES :
1. "general" (Agent) : Pour toute discussion, question de culture générale, salutation, ou simple phrase d'information (ex: "Mon projet s'appelle X", "Je travaille sur Y").
2. "code" (Agent) : UNIQUEMENT si l'utilisateur demande EXPLICITEMENT d'écrire, modifier, générer ou refactoriser du code/fichier.
3. "debug" (Agent) : UNIQUEMENT si l'utilisateur fournit une erreur ou demande de corriger un bug technique.
4. "github" (Agent) : UNIQUEMENT si l'utilisateur ordonne une action directe de lecture ou d'écriture sur le dépôt GitHub.

RÈGLES DE SÉLECTION DU MODÈLE (selectedModelId) :
- Si une image/photo est présente (${hasImage}), choisis impérativement un modèle avec des compétences "image_analysis".
- Pour du code explicite ou une action GitHub, choisis le modèle le plus adapté ("deep_coding").
- Pour du debugging complexe, choisis le modèle spécialisé ("debugging").
- Pour les conversations générales ou la planification, privilégie la vitesse ("intent_planning" ou "general_expert").

ISOLATION DE PROJET :
Extrais le nom du projet mentionné par l'utilisateur (ex: "Haulzao", "Octopus2", etc.). Si aucun n'est mentionné, indique "none".

FORMAT DE RÉPONSE OBLIGATOIRE (JSON STRICT UNIQUEMENT) :
{
  "selectedModelId": "ID_DE_L_IA_DANS_LE_CATALOGUE",
  "agent": "general" | "code" | "debug" | "github",
  "activeProject": "NomDuProjet ou none",
  "needsWebSearch": true | false,
  "reasoning": "Raison courte du choix en une phrase"
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Le Planner utilise l'IA la plus rapide pour décider en quelques millisecondes
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Détection d'image: ${hasImage}\nHistorique récent: ${historySummary}\nMessage utilisateur: "${userMessage}"` }
        ],
        temperature: 0.0,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`Erreur HTTP Planner: ${response.status}`);

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Récupération de la fiche complète du modèle sélectionné
    const selectedModel = MODEL_REGISTRY.find(m => m.id === result.selectedModelId) || MODEL_REGISTRY[0];

    return {
      selectedModel,
      agent: result.agent || 'general',
      activeProject: result.activeProject || 'none',
      needsWebSearch: Boolean(result.needsWebSearch),
      reasoning: result.reasoning || ''
    };

  } catch (error) {
    console.error("Erreur d'exécution dans planner.js :", error);
    return {
      selectedModel: MODEL_REGISTRY[0],
      agent: 'general',
      activeProject: 'none',
      needsWebSearch: false,
      reasoning: 'Fallback sur erreur'
    };
  }
}
