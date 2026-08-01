// api/chat.js
import { createPlan } from './lib/planner.js';
import { searchTavily } from './lib/searchTavily.js';
import { getFileFromGitHub, updateLongTermMemory } from './lib/longTermMemory.js';

export default async function handler(req, res) {
  const { message, webSearchEnabled } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  // 1. LE PLANNER : Analyse la demande
  const plan = await createPlan(message, apiKey);

  let realContext = "";

  // 2. TAVILY (Recherche Web) : Si le bouton est ON
  if (webSearchEnabled) {
    const webData = await searchTavily(message, process.env.TAVILY_API_KEY);
    realContext += `\n[Résultats Web en direct] :\n${JSON.stringify(webData)}\n`;
  }

  // 3. GITHUB (Lecture de Fichier) : Si un fichier est demandé
  if (plan.toolAction && plan.toolAction.type === 'read_file') {
    const fileContent = await getFileFromGitHub(plan.toolAction.filePath);
    realContext += `\n[Contenu réel du fichier ${plan.toolAction.filePath}] :\n${fileContent}\n`;
  }

  // 4. L'AGENT : On lui injecte les VRAIES données récupérées
  const finalPrompt = `
Demande de l'utilisateur : ${message}

DONNÉES RÉELLES RÉCUPÉRÉES :
${realContext}

CONSIGNE : Réponds directement à l'utilisateur en utilisant les données ci-dessus. N'écris pas de code JS pour simuler l'action, donne le vrai résultat.
  `;

  // Envoi à Groq avec le prompt enrichi
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: finalPrompt }]
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;

  // 5. SAUVEGARDE EN MÉMOIRE : Si nécessaire
  if (plan.sessionNote) {
    await updateLongTermMemory(plan.sessionNote);
  }

  return res.status(200).json({ output: reply });
}
