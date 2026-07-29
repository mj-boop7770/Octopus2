export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // Récupération de l'historique complet 'messages' et du 'mode'
  const { messages, mode } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Historique de messages requis' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé GROQ_API_KEY manquante dans Vercel' });
  }

  // 1. Définition du comportement de l'IA (System Prompt) selon le mode
  let systemContent = "Tu es Octopus AI, un assistant virtuel intelligent, rapide, concis et ultra-précis.";

  if (mode === 'code') {
    systemContent = `Tu es Octopus AI, un développeur Senior et architecte logiciel expert.
- Fournis du code propre, moderne, optimisé, sécurisé et bien structuré.
- Si l'utilisateur te montre un bug ou une image/screenshot de code, analyse l'erreur en détail avant d'apporter la correction.
- Utilise le formatage Markdown avec les blocs de code appropriés.`;
  } else if (mode === 'writing') {
    systemContent = `Tu es Octopus AI, un expert en rédaction, correction et optimisation de contenus textuels.
- Corrige les fautes, reformule avec élégance et adapte le ton au besoin exprimé.
- Sois percutant, clair et bien structuré.`;
  }

  const systemMessage = { role: 'system', content: systemContent };

  // 2. Formatage des messages pour l'API Groq
  const formattedMessages = messages.map(m => ({
    role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  // On conserve les 12 derniers messages de la conversation pour le contexte
  const recentMessages = formattedMessages.slice(-12);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [systemMessage, ...recentMessages],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Groq:', data);
      return res.status(500).json({ error: data.error?.message || 'Erreur API Groq' });
    }

    return res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error('Erreur Serveur:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
