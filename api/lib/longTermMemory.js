// api/lib/longTermMemory.js

/**
 * Niveau 11 — Mémoire Longue Durée Dynamique via GitHub API
 * Lit et écrit les préférences/règles utilisateur dans `memory.json`.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // Exemple: "mon-pseudo/octopus2"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const FILE_PATH = "memory.json";

/**
 * 1. Récupère toutes les préférences enregistrées dans memory.json
 */
export async function getLongTermMemory() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return "";

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      }
    });

    if (!res.ok) return "";

    const data = await res.json();
    // Décoder le contenu Base64 envoyé par GitHub
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const memories = JSON.parse(content || "[]");

    if (!Array.isArray(memories) || memories.length === 0) return "";

    return `\n\n[MÉMOIRE LONGUE DURÉE RETENUE SUR L'UTILISATEUR]:\n${memories.map(m => `- ${m}`).join("\n")}`;
  } catch (e) {
    console.error("Erreur lecture mémoire GitHub:", e);
    return "";
  }
}

/**
 * 2. Enregistre une nouvelle règle dans memory.json sur GitHub
 */
export async function saveMemory(fact) {
  if (!GITHUB_TOKEN || !GITHUB_REPO || !fact) return false;

  try {
    // Étape A : Récupérer le fichier actuel pour obtenir son contenu et son 'sha'
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      }
    });

    let currentMemories = [];
    let sha = null;

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      currentMemories = JSON.parse(content || "[]");
    }

    // Étape B : Éviter les doublons
    if (!currentMemories.includes(fact)) {
      currentMemories.push(fact);
    } else {
      return true; // Déjà enregistrée
    }

    // Étape C : Encoder le nouveau tableau en Base64 et effectuer le Commit sur GitHub
    const updatedContent = Buffer.from(JSON.stringify(currentMemories, null, 2)).toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Octopus2-App'
      },
      body: JSON.stringify({
        message: `octo-memory: mise à jour des préférences`,
        content: updatedContent,
        sha: sha || undefined,
        branch: GITHUB_BRANCH
      })
    });

    return putRes.ok;
  } catch (e) {
    console.error("Erreur écriture mémoire GitHub:", e);
    return false;
  }
      }
      
