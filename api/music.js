// api/music.js
// Route audio CommonJS compatible avec Vercel/Node.js

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { style, lyrics, prompt } = req.body || {};
  const userQuery = prompt || lyrics || style;
  if (!userQuery) return res.status(400).json({ error: 'La description ou les paroles sont requises.' });

  const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY;
  if (!hfKey) return res.status(500).json({ error: 'La clé Hugging Face n\'est pas configurée.' });

  try {
    let enrichedPrompt = `${userQuery}. Studio quality, clear mixing, rich instrumentation, high fidelity audio`;
    if (lyrics) enrichedPrompt += ', melody tailored for lyrics context';

    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch('https://router.huggingface.co/hf-inference/models/facebook/musicgen-small', {
        method: 'POST',
        headers: { Authorization: `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: enrichedPrompt })
      });
      if (response.status !== 503) break;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Hugging Face (${response.status}): ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Erreur Backend API Music:', error);
    return res.status(500).json({ error: 'Impossible de générer le morceau audio.' });
  }
};
