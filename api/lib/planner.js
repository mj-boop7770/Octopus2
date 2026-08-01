// lib/planner.js

export async function createPlan(userMessage, apiKey) {
  if (!userMessage || !apiKey) {
    return { agent: 'general', steps: [], toolAction: null, rememberFact: null };
  }

  const systemPrompt = `Tu es le Planner Backend de Octopus2 Engine. 
Ta SEULE tâche est d'analyser l'instruction et de générer un objet JSON d'action. Ne discute pas, ne génère aucun code JS, ne salue pas.

FORMAT JSON EXCLUSIF ET REQUIS :
{
  "agent": "general",
  "steps": ["Exécution de l'outil d'écriture GitHub"],
  "toolAction": {
    "type": "write_file",
    "filePath": "chemin_du_fichier",
    "content": "contenu exact à placer dans le fichier",
    "commitMessage": "Ajout via Octopus2"
  },
  "rememberFact": null
}

RÈGLES D'OUTILS :
1. Si l'utilisateur demande de créer, modifier ou écrire un fichier (ex: test.txt, souhaits.json) : "type" DOIT être "write_file".
2. Si l'utilisateur demande de lire un fichier : "type" DOIT être "read_file".
3. "toolAction" ne doit être null QUE si aucune action sur un fichier n'est demandée.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Forcer le modèle 70b pour un respect strict du JSON
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) throw new Error("Erreur Planner API");

    const data = await res.json();
    const rawContent = data.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);

    return {
      agent: parsed.agent || 'general',
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      toolAction: parsed.toolAction || null,
      rememberFact: parsed.rememberFact || null
    };
  } catch (e) {
    console.error("Erreur parsing Planner:", e);
    return { agent: 'general', steps: [], toolAction: null, rememberFact: null };
  }
}
  
