// lib/planner.js

export async function createPlan(userMessage, apiKey) {
  if (!userMessage || !apiKey) {
    return { agent: 'general', steps: [], toolAction: null, rememberFact: null };
  }

  const systemPrompt = `Tu es le Planner intelligent d'Octopus2 Engine.
Analyse le message de l'utilisateur et retourne EXCLUSIVEMENT un objet JSON valide suivant ce format strict :

{
  "agent": "general | code | debug | review | test",
  "steps": ["Étape 1...", "Étape 2..."],
  "toolAction": null OU {
    "type": "read_file | write_file",
    "filePath": "chemin/du/fichier.ext",
    "content": "contenu exact à écrire (uniquement si type est write_file)",
    "commitMessage": "message de commit rapide (uniquement si type est write_file)"
  },
  "rememberFact": null OU "Information clé importante à retenir à long terme"
}

Règles pour toolAction :
- Si l'utilisateur demande de lire, consulter ou analyser un fichier du projet, utilise "type": "read_file".
- Si l'utilisateur demande de créer, modifier, mettre à jour ou sauvegarder du code dans un fichier, utilise "type": "write_file".
- Ne génère aucun texte avant ou après le JSON.`;

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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) throw new Error("Erreur réponse Planner");

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return {
      agent: parsed.agent || 'general',
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      toolAction: parsed.toolAction || null,
      rememberFact: parsed.rememberFact || null
    };
  } catch (e) {
    return { agent: 'general', steps: [], toolAction: null, rememberFact: null };
  }
}
  
