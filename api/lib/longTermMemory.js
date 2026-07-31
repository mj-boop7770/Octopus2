// api/lib/longTermMemory.js

/**
 * Niveau 11 — Mémoire Globale & Contextuelle de Session (GitHub API)
 * Charge et sauvegarde la mémoire globale du projet et des échanges passés.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // Format: "user/repo"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const FILE_PATH = "memory.json";

/**
 * 1. Charger la mémoire globale du projet / historique des sessions
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
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const memoryData = JSON.parse(content || "{}");

    if (!memoryData.summary && (!memoryData.contextNotes || memoryData.contextNotes.length === 0)) {
      return "";
    }

    let memoryContext = "\n\n[MÉMOIRE GLOBALE ET CONTEXTE DES SESSIONS PRÉCÉDENTES]:";
    if (memoryData.summary) {
      memoryContext += `\n- Résumé global : ${memoryData.summary}`;
    }
    if (Array.isArray(memoryData.contextNotes) && memoryData.contextNotes.length > 0) {
      memoryContext += `\n- Points clés retenus :\n  * ${memoryData.contextNotes.join("\n  * ")}`;
    }

    return memoryContext;
  } catch (e) {
    console.error("Erreur lecture mémoire globale GitHub:", e);
    return "";
  }
}

/**
 * 2. Mettre à jour le résumé contextuel global sur GitHub
 */
export async function updateGlobalMemory(newSummary, newNotes = []) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return false;

  try {
    // Étape A : Récupérer le fichier actuel pour obtenir le SHA
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Octopus2-App'
      }
    });

    let sha = null;
    let existingData = { summary: "", contextNotes: [] };

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      try {
        existingData = JSON.parse(content || "{}");
      } catch (e) {}
    }

    // Étape B : Fusionner la mémoire
    const updatedMemory = {
      lastUpdated: new Date().toISOString(),
      summary: newSummary || existingData.summary || "Projet en cours de développement.",
      contextNotes: Array.from(new Set([...(existingData.contextNotes || []), ...newNotes])).slice(-15) // Conserve les 15 notes les plus récentes
    };

    const updatedContent = Buffer.from(JSON.stringify(updatedMemory, null, 2)).toString('base64');

    // Étape C : Commit sur GitHub
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Octopus2-App'
      },
      body: JSON.stringify({
        message: "octo-memory: mise à jour automatique de la mémoire globale",
        content: updatedContent,
        sha: sha || undefined,
        branch: GITHUB_BRANCH
      })
    });

    return putRes.ok;
  } catch (e) {
    console.error("Erreur mise à jour mémoire globale GitHub:", e);
    return false;
  }
}
  
