// api/music.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { style, lyrics, prompt } = req.body;
  const userQuery = prompt || style || "Musique agréable";

  if (!userQuery) {
    return res.status(400).json({ error: 'La description ou le style est requis.' });
  }

  try {
    // 1. Enrichissement du prompt pour garantir une haute qualité sonore
    let promptEnrichi = `${userQuery}. Studio quality, clear mixing, rich instrumentation, high fidelity audio`;
    if (lyrics) {
      promptEnrichi += `, melody tailored for lyrics context`;
    }

    // 2. Appel à l'API Hugging Face avec gestion automatique des retards (Sommeil / 503)
    let attempts = 0;
    let response;
    
    while (attempts < 3) {
      response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/musicgen-small",
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: promptEnrichi }),
        }
      );

      // Si le modèle est en cours de chargement (503), on attend 5 secondes et on réessaye
      if (response.status === 503) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        break;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Hugging Face (${response.status}): ${errorText}`);
    }

    // 3. Récupération du buffer audio .wav et envoi au client
    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    return res.status(200).send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error("Erreur Backend API Music:", error);
    return res.status(500).json({ error: "Impossible de générer le morceau audio." });
  }
        }
