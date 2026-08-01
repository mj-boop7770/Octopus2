// lib/githubTools.js

export async function getGitHubFile(filePath) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // ex: "ton-user/octopus2-ai-assistant"

  if (!token || !repo) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  } catch (e) {
    return null;
  }
}

// NUEVO : ÉCRITURE / MODIFICATION SUR GITHUB
export async function writeGitHubFile(filePath, content, commitMessage = "Mise à jour via Octopus2 Engine") {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return false;

  try {
    // 1. Vérifier si le fichier existe déjà pour récupérer son `sha` (nécessaire pour update)
    let sha = null;
    const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      }
    });

    if (checkRes.ok) {
      const existingData = await checkRes.json();
      sha = existingData.sha;
    }

    // 2. Encoder le nouveau contenu en Base64
    const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');

    // 3. Envoyer la requête PUT pour créer ou modifier
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        ...(sha && { sha }) // Inclus le sha uniquement si le fichier existait déjà
      })
    });

    return putRes.ok;
  } catch (e) {
    return false;
  }
      }
        
