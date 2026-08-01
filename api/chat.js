// Exemple de flux dans api/chat.js

// 1. Appel du Planner
const plan = await createPlan(userQuery, GROQ_API_KEY);

let fileContent = "";
let searchResults = "";

// 2. Si le Web est ON et demandé, on lance Tavily
if (webSearchEnabled) {
  searchResults = await searchTavily(userQuery, TAVILY_API_KEY);
}

// 3. Si un outil GitHub est requis, on exécute l'action AVANT de répondre
if (plan.toolAction && plan.toolAction.type === 'read_file') {
  fileContent = await getFileFromGitHub(plan.toolAction.filePath);
}

// 4. On construit le prompt final enrichi avec le VRAI contenu du fichier et du web
const enrichedPrompt = `
Demande de l'utilisateur: ${userQuery}

${fileContent ? `Contenu réel du fichier (${plan.toolAction.filePath}):\n${fileContent}` : ''}
${searchResults ? `Résultats de la recherche Web:\n${searchResults}` : ''}

Instructions: Réponds directement à l'utilisateur en exploitant les données ci-dessus. N'écris PAS de script Node.js pour simuler l'action, donne directement la réponse finale.
`;

// 5. On envoie à l'agent spécialisé + Reviewer
const agentReply = await callAgent(plan.agent, enrichedPrompt, GROQ_API_KEY);
const finalReply = await verifyAndRefine(agentReply, userQuery, GROQ_API_KEY);

// 6. Mise à jour automatique de la mémoire GitHub si nécessaire
if (plan.sessionNote) {
  await updateLongTermMemory(plan.sessionNote);
}
