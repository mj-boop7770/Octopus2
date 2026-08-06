// api/lib/jsonbin.js
// Gestion de l'historique des discussions via JSONBin

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const CHAT_BIN_ID = process.env.JSONBIN_CHAT_BIN_ID;

// Charger l'historique d'une session depuis JSONbin
async function getChatHistory(sessionId) {
  if (!JSONBIN_API_KEY || !CHAT_BIN_ID) return [];
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${CHAT_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const history = data.record?.[sessionId] || [];
    
    // Formater l'historique en texte lisible pour le Planner / Contexte
    if (Array.isArray(history) && history.length > 0) {
      return history.map(m => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${m.content}`).join('\n');
    }
    return "";
  } catch (e) {
    console.error("Erreur lecture JSONBin:", e);
    return "";
  }
}

// Sauvegarder un message individuel dans JSONbin (Compatible avec octopusCore.js)
async function saveChatMessage(sessionId, messageObj) {
  if (!JSONBIN_API_KEY || !CHAT_BIN_ID) return;
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${CHAT_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    let record = {};
    if (res.ok) {
      const data = await res.json();
      record = data.record || {};
    }

    if (!record[sessionId]) record[sessionId] = [];

    // messageObj attend { role: 'user' | 'assistant', content: '...' }
    record[sessionId].push(messageObj);

    // Garde les 30 derniers messages par discussion pour optimiser l'espace
    if (record[sessionId].length > 30) {
      record[sessionId] = record[sessionId].slice(-30);
    }

    await fetch(`https://api.jsonbin.io/v3/b/${CHAT_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(record)
    });
  } catch (e) {
    console.error("Erreur écriture JSONBin:", e);
  }
}

module.exports = {
  getChatHistory,
  saveChatMessage
};
                            
