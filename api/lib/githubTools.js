// lib/githubTools.js

// LECTURE DE FICHIERS SUR GITHUB
export async function getGitHubFile(filePath) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // Format: "nom-utilisateur/nom-repo"

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

// ÉCRITURE ET MODIFICATION DE FICHIERS SUR GITHUB
export async function writeGitHubFile(filePath, content, commitMessage = "Mise à jour automatique par Octopus2") {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return false;

  try {
    // 1. Récupérer le SHA si le fichier existe déjà (requis par l'API GitHub pour update)
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

    // 2. Encodage du contenu en Base64
    const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');

    // 3. Requête PUT pour créer ou écraser le fichier
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
        ...(sha && { sha })
      })
    });

    return putRes.ok;
  } catch (e) {
    return false;
  }
}
