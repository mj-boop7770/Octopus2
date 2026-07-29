export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { messages, prompt, message, mode } = req.body;

    // Récupérer le dernier texte envoyé peu importe le format
    let userPrompt = '';

    if (Array.isArray(messages) && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) userPrompt = lastUserMsg.content;
    } else if (prompt) {
      userPrompt = prompt;
    } else if (message) {
      userPrompt = message;
    }

    if (!userPrompt || !userPrompt.trim()) {
      return res.status(400).json({ error: 'Le message est requis' });
    }

    // Appel à l'API Groq (ou votre fournisseur LLM)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Clé API non configurée' });
    }

    // Construire l'historique propre pour Groq
    const formattedMessages = Array.isArray(messages) && messages.length > 0
      ? messages.map(m => ({
          role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      : [{ role: 'user', content: userPrompt }];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: mode === 'code' 
              ? 'Tu es Octopus AI, un expert en programmation et développement web.' 
              : mode === 'writing'
              ? 'Tu es Octopus AI, un expert en rédaction et correction de texte.'
              : 'Tu es Octopus AI, un assistant virtuel intelligent, rapide et précis.'
          },
          ...formattedMessages
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur Groq API:', data);
      return res.status(500).json({ error: data.error?.message || 'Erreur lors du traitement de la requête' });
    }

    const reply = data.choices?.[0]?.message?.content || 'Aucune réponse reçue.';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Erreur Serveur:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
      }
