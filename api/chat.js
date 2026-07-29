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

  // On garde les 8 derniers messages pour économiser les tokens
  const recentMessages = formattedMessages.slice(-8);

  // Les 4 modèles actifs en cascade (si l'un sature ou rate, on passe au suivant)
  const models = [
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-120b',
    'llama-3.1-8b-instant',
    'openai/gpt-oss-20b'
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

      // Si le modèle est surchargé ou atteint sa limite (Rate limit / Erreur), on bascule sur le suivant
      if (response.status === 429 || response.status === 400 || response.status === 404) {
        console.warn(`[Octopus AI] Modèle ${model} indisponible (${response.status}), essai du suivant...`);
        continue;
      } else {
        return res.status(500).json({ error: data.error?.message || 'Erreur API Groq' });
      }

    } catch (error) {
      console.error(`[Octopus AI] Erreur réseau avec le modèle ${model}:`, error);
    }
  }

  return res.status(429).json({ 
    error: "Tous les modèles de secours ont atteint leur limite ou sont indisponibles. Réessaie un peu plus tard !" 
  });
          }
