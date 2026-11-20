// api/music.js
// Route Vercel et serveur local : MusicGen via Hugging Face.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const prompt = body.prompt || body.style || 'Musique agréable';
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'La description ou le style musical est requis.' });
  }
  if (prompt.length > 2000) {
    return res.status(413).json({ error: 'La description musicale est trop longue (maximum 2000 caractères).' });
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'La génération musicale n’est pas configurée : ajoutez HUGGINGFACE_API_KEY dans les variables du projet.' });
  }

  const enhancedPrompt = `${prompt.trim()}. Studio quality, clear mixing, rich instrumentation, high fidelity audio${body.lyrics ? ', melody tailored for lyrics context' : ''}`;

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: enhancedPrompt, options: { wait_for_model: false } })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      if (response.status === 503) {
        let estimatedTime = 20;
        try { estimatedTime = JSON.parse(details).estimated_time || estimatedTime; } catch (_) {}
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil(estimatedTime))));
        return res.status(503).json({ error: `Le modèle audio est en cours de chargement. Réessayez dans environ ${Math.ceil(estimatedTime)} secondes.` });
      }
      console.error(`[MusicGen] Hugging Face ${response.status}:`, details.slice(0, 1000));
      return res.status(502).json({ error: `Le service de génération musicale a renvoyé une erreur (${response.status}). Vérifiez la clé Hugging Face et l’accès au modèle.` });
    }

    const contentType = response.headers.get('content-type') || 'audio/wav';
    if (!contentType.startsWith('audio/')) {
      const details = await response.text().catch(() => '');
      console.error('[MusicGen] Réponse non audio:', details.slice(0, 1000));
      return res.status(502).json({ error: 'Le service musical n’a pas renvoyé de fichier audio.' });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(audioBuffer.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error('[MusicGen] Erreur réseau:', error);
    return res.status(502).json({ error: 'Impossible de contacter le service de génération musicale.' });
  }
};

module.exports.config = { maxDuration: 60, api: { responseLimit: '10mb' } };
