// js/api.js
export async function generateMusic(promptTexte) {
  const response = await fetch('/api/music', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: promptTexte }),
  });

  if (!response.ok) {
    throw new Error("Erreur lors de la création du morceau.");
  }

  // Transformation de la réponse binaire en URL audio lisible par le navigateur
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
  
