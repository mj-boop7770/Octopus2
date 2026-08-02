// api/specializedAgents.js - Exécution des Agents et des Modèles Sélectionnés

// Fonction utilitaire pour exécuter les requêtes selon le fournisseur
async function executeLLMCall({ provider, modelName, systemPrompt, messages, keys }) {
  // 1. Appel GROQ
  if (provider === 'groq') {
    if (!keys.groq) throw new Error("Clé GROQ_API_KEY manquante");
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keys.groq}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.3,
        max_tokens: 3000
      })
    });
    if (!res.ok) throw new Error(`Erreur Groq HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content;
  }

  // 2. Appel OPENROUTER
  if (provider === 'openrouter') {
    if (!keys.openrouter) throw new Error("Clé OPENROUTER_API_KEY manquante");
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keys.openrouter}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://octopus2.local',
        'X-Title': 'Octopus2'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.2,
        max_tokens: 3000
      })
    });
    if (!res.ok) throw new Error(`Erreur OpenRouter HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content;
  }

  // 3. Appel GEMINI
  if (provider === 'gemini') {
    if (!keys.gemini) throw new Error("Clé GEMINI_API_KEY manquante");
    const lastMessage = messages[messages.length - 1]?.content || "";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keys.gemini}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${lastMessage}` }] }]
      })
    });
    if (!res.ok) throw new Error(`Erreur Gemini HTTP ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  throw new Error(`Fournisseur d'IA inconnu: ${provider}`);
}

// Fonction principale exportée
export async function runSpecializedAgent({ plan, messages, contextData = "", keys }) {
  const { selectedModel, agent, activeProject } = plan;

  // Construction du Prompt Système en fonction de l'Agent et du Projet actif
  let systemPrompt = `Tu es Octopus2, une IA de production intelligente, précise et directe.
PROJET ACTIF : ${activeProject !== 'none' ? activeProject : 'Aucun projet spécifique'}.

RÈGLES D'EXÉCUTION STRICTES :
1. Isole strictement les projets : Ne mélange jamais les fichiers, le contexte ou la logique d'un autre projet avec le projet actif (${activeProject}).
2. Ne génère JAMAIS spontanément de fichiers de configuration (comme tsconfig.json, package.json) ni de gros blocs de code si l'utilisateur ne l'a pas demandé explicitement.
3. Sois concis, clair et directement utile dans tes réponses.`;

  // Spécialisation selon le rôle déterminé par le Planner
  if (agent === 'code') {
    systemPrompt += `\n\n[MODE DÉVELOPPEUR SENIOR] : L'utilisateur demande du code. Fournis du code propre, moderne, commenté et directement utilisable pour le projet ${activeProject}.`;
  } else if (agent === 'debug') {
    systemPrompt += `\n\n[MODE DIAGNOSTIC & DEBUG] : L'utilisateur signale une erreur. Identifie la cause racine et propose la correction exacte sans bavardage inutile.`;
  } else if (agent === 'github') {
    systemPrompt += `\n\n[MODE INTÉGRATION GITHUB] : Réponds en tenant compte des interactions directes avec le dépôt GitHub.`;
  }

  if (contextData) {
    systemPrompt += `\n\n[CONTEXTE COMPLÉMENTAIRE (Web/Outillage)] :\n${contextData}`;
  }

  // Formatage propre des messages pour les API
  const formattedMessages = messages.map(m => ({
    role: (m.role === 'bot' || m.role === 'assistant') ? 'assistant' : 'user',
    content: m.content
  })).slice(-8); // Conservation des 8 derniers échanges

  // Tentative d'exécution principale
  try {
    const response = await executeLLMCall({
      provider: selectedModel.provider,
      modelName: selectedModel.modelName,
      systemPrompt,
      messages: formattedMessages,
      keys
    });

    if (response) return { response, usedModel: selectedModel };
  } catch (primaryError) {
    console.warn(`Échec avec le moteur principal (${selectedModel.id}):`, primaryError.message);
  }

  // Secours (Fallback) sur Groq Llama-3.3-70b si le modèle sélectionné échoue
  try {
    console.log("Bascule sur le modèle de secours (groq-architecture)...");
    const fallbackResponse = await executeLLMCall({
      provider: 'groq',
      modelName: 'llama-3.3-70b-versatile',
      systemPrompt,
      messages: formattedMessages,
      keys
    });
    return { 
      response: fallbackResponse, 
      usedModel: { id: "groq-architecture-fallback", provider: "groq", modelName: "llama-3.3-70b-versatile" } 
    };
  } catch (fallbackError) {
    console.error("Échec du secours Groq:", fallbackError.message);
    throw new Error("Tous les services d'IA configurés ont échoué.");
  }
                            }
        
