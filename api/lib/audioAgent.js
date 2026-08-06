// api/lib/audioAgent.js
// Gestion de l'Agent Audio (Hugging Face / MusicGen)

async function generateAudioResponse(prompt, hfApiKey) {
  if (!hfApiKey) {
    throw new Error("Clé HUGGING_FACE_API_KEY manquante pour l'agent audio.");
  }

  // Utilisation du modèle MusicGen de Hugging Face
  const modelUrl = "https://api-inference.huggingface.co/models/facebook/musicgen-small";

  const response = await fetch(modelUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  // Gestion du cas classique où le modèle Hugging Face est en cours de chargement (503)
  if (response.status === 503) {
    const errorData = await response.json();
    const estimatedTime = errorData.estimated_time || 20;
    throw new Error(`Modèle audio en cours de chargement sur Hugging Face. Réessayez dans ${Math.round(estimatedTime)} secondes.`);
  }

  if (!response.ok) {
    throw new Error(`Erreur Hugging Face Audio HTTP ${response.status}`);
  }

  // Récupération du flux audio binaire (blob/arrayBuffer)
  const audioBuffer = await response.arrayBuffer();
  return audioBuffer;
}

module.exports = { generateAudioResponse };
