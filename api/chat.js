export default async function handler(req, res) {
  // Accepter uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { message, mode } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Le message est requis' });
  }

  // 1. Définition du System Prompt selon le mode choisi par l'utilisateur
  let systemPrompt = "Tu es Octopus, un assistant IA expert, concis, direct et ultra-compétent.";

  if (mode === 'code') {
    systemPrompt = `Tu es Octopus, un développeur Senior Full-Stack d'élite.
- Analyse le code transmis avec une précision chirurgicale.
- Donne des solutions modernes, optimisées et propres.
- Commente les blocs de code importants.
- Ne fais pas de blabla inutile : donne d'abord le code corrigé, puis explique brièvement.`;
  } else if (mode === 'writing') {
    systemPrompt = `Tu es Octopus, un conseiller littéraire et éditorial d'élite.
- Aide à structurer, corriger et sublimer le style rédactionnel.
- Reste attentif à la clarté, au ton et au rythme des phrases.`;
  }

  try {
    // 2. Appel à l'API Groq (SÉCURISÉ via la variable d'environnement GROQ_API_KEY)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Ou llama3-8b-8192
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erreur API Groq:', data);
      return res.status(500).json({ error: 'Erreur lors de la communication avec Groq' });
    }

    const reply = data.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    // 3. Renvoyer la réponse au frontend
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Erreur Serveur Vercel:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
        }
    
