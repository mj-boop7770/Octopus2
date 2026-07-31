// api/lib/planner.js

/**
 * Niveau 1 — Planner & Générateur de Contexte de Session (Niveau 11 & 12)
 */
export async function createPlan(userQuery, apiKey) {
  if (!userQuery || !apiKey) {
    return { agent: 'general', steps: [], sessionNote: null, toolAction: null };
  }

  const systemPrompt = `Tu es le Planner d'Octopus2.
Analyse la demande et renvoie un JSON STRICT au format suivant :
{
  "agent": "code" | "debug" | "review" | "test" | "documentation" | "writing" | "general",
  "steps": ["Étape 1...", "Étape 2..."],
  "sessionNote": "Une phrase résumé de ce que l'utilisateur fait ou demande dans ce message" ou null,
  "toolAction": {
    "type": "read_file" | "write_file" | null,
    "filePath": "chemin/du/fichier.js" ou null
  }
}

RÈGLES :
- Extrais toujours une synthèse concise dans "sessionNote" (ex: "Développement du module de login", "Débogage API Groq").
- Si l'utilisateur demande de lire un fichier, indique "read_file" et son chemin dans "toolAction".`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) return { agent: 'general', steps: [], sessionNote: null, toolAction: null };

    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    return {
      agent: parsed.agent || 'general',
      steps: parsed.steps || [],
      sessionNote: parsed.sessionNote || null,
      toolAction: parsed.toolAction || null
    };
  } catch (e) {
    console.error("Erreur Planner:", e);
    return { agent: 'general', steps: [], sessionNote: null, toolAction: null };
  }
  }
