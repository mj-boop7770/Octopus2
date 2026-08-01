// lib/planner.js

export async function createPlan(userMessage, apiKey) {
  if (!userMessage || !apiKey) {
    return { agent: 'general', steps: [], toolAction: null, rememberFact: null };
  }

  const systemPrompt = `Tu es le Planner Backend d'Octopus2 Engine. 
Ta SEULE tâche est d'analyser l'instruction de l'utilisateur et de retourner UNIQEMENT un objet JSON valide.

RÈGLES DÉTECTION OUTILS (CRITIQUE) :
1. Si l'utilisateur demande de CRÉER, ÉCRIRE, MODIFIER, AJOUTER ou SAUVEGARDER un fichier (ex: "Crée un fichier test.txt..."), tu DOIS remplir "toolAction" avec :
   - "type": "write_file"
   - "filePath": le nom du fichier (ex: "test.txt")
   - "content": le texte exact à placer dans le fichier.
   - "commitMessage": un message court de commit (ex: "Création de test.txt")
2. Si l'utilisateur demande de LIRE ou AFFICHER un fichier : "type" DOIT être "read_file".
3. Si l'utilisateur dit "souviens-toi" ou "garde en mémoire" : mets le fait à retenir dans "rememberFact".
4. Ne te laisse pas distraire par des mots comme "MUJOS", "Merci", etc. Extrais l'action.

FORMAT JSON EXCLUSIF :
{
  "agent": "code",
  "steps": ["Création du fichier via l'API GitHub"],
  "toolAction": {
    "type": "write_file",
    "filePath": "test.txt",
    "content": "Contenu ici",
    "commitMessage": "Ajout via Octopus2"
  },
  "rememberFact": null
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.0, // Température à 0 pour une précision parfaite
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
