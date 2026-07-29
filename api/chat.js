export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { messages, mode } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Historique de messages requis' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé GROQ_API_KEY manquante dans Vercel' });
  }

  let systemContent = "Tu es Octopus AI, un assistant virtuel intelligent, rapide et concis.";

  if (mode === 'code') {
    systemContent = `Tu es Octopus AI, un développeur Senior et architecte logiciel expert.
- Fournis du code propre, moderne, optimisé et bien structuré.
- Si l'utilisateur montre un bug ou une erreur, analyse le problème en détail avant de donner la correction.
- Sois clair, précis et direct.`;
  } else if (mode === 'writing') {
    systemContent = `Tu es Octopus AI, un expert en rédaction, correction et optimisation de textes.
- Corrige les fautes, reformule avec élégance et adapte le ton au besoin.`;
  }

  const systemMessage = { role: 'system', content: systemContent };

  const formattedMessages = messages.map(m => ({
    role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  // On réduit à 4 messages récents pour éviter de dépasser la limite de TPM (Tokens Par Minute)
  const recentMessages = formattedMessages.slice(-4);

  // Modèles officiels et stables sur Groq avec de très grosses limites de tokens
  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ];

  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [systemMessage, ...recentMessages],
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      const data = await response.json();

      if (response.ok && data.choices?.[0]?.message?.content) {
        return res.status(200).json({ reply: data.choices[0].message.content });
      }

      // Codes d'erreurs à ignorer et basculer instantanément :
      // 429 = Rate Limit / TPM / TPD
      // 413 = Request Too Large (Requête trop lourde)
      // 400 / 404 = Modèle indisponible ou erreur de syntaxe
      if ([429, 413, 400, 404].includes(response.status)) {
        console.warn(`[Octopus AI] Modèle ${model} a renvoyé l'erreur ${response.status}. Bascule en cours...`);
        continue;
      } else {
        return res.status(500).json({ error: data.error?.message || 'Erreur API Groq' });
      }

    } catch (error) {
      console.error(`[Octopus AI] Erreur réseau avec le modèle ${model}:`, error);
    }
  }

  return res.status(429).json({ 
    error: "La demande est trop volumineuse ou tous les modèles sont occupés. Essaie d'ouvrir une nouvelle discussion !" 
  });
  }
