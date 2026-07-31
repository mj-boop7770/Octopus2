// api/lib/githubTools.js

/**
 * Niveau 12 — Outils & Actions GitHub (Tool Use)
 * Permet à l'agent d'interagir directement avec les fichiers du projet.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // Format: "user/repo"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

/**
 * Outil 1 : Lire le contenu d'un fichier du dépôt GitHub
 */
export async function getGitHubFile(filePath) {
  if (!GITHUB_TOKEN || !GITHUB_REPO || !filePath) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (e) {
    console.error("Erreur lecture fichier GitHub:", e);
    return null;
  }
}

/**
 * Outil 2 : Créer ou mettre à jour un fichier directement sur GitHub
 */
export async function commitGitHubFile(filePath, content, commitMessage = "octo-tool: mise à jour automatique") {
  if (!GITHUB_TOKEN || !GITHUB_REPO || !filePath || !content) return false;

  try {
    // Vérifier si le fichier existe pour récupérer son SHA
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      }
    });

    let sha = null;
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const base64Content = Buffer.from(content).toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Octopus2-App'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        sha: sha || undefined,
        branch: GITHUB_BRANCH
      })
    });

    return putRes.ok;
  } catch (e) {
    console.error("Erreur commit fichier GitHub:", e);
    return false;
  }
  }
                                       
