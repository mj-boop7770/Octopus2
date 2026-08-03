// api/music.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Le prompt est requis.' });
  }

  try {
    // Appel à l'API Hugging Face avec le modèle MusicGen
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/musicgen-small",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur HuggingFace: ${response.statusText}`);
    }

    // Récupération de l'audio binaire et envoi en réponse
    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error("Erreur API Music:", error);
    return res.status(500).json({ error: "Impossible de générer la musique." });
  }
                                 }
      
