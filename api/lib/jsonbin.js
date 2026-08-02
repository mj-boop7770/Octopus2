// api/lib/jsonbin.js

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const CHAT_BIN_ID = process.env.JSONBIN_CHAT_BIN_ID;

// Charger l'historique d'une session depuis JSONbin
export async function getChatHistory(sessionId) {
  if (!JSONBIN_API_KEY || !CHAT_BIN_ID) return [];
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${CHAT_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.record?.[sessionId] || [];
  } catch (e) {
    console.error("Erreur lecture JSONBin:", e);
    return [];
  }
}

// Sauvegarder les nouveaux messages dans JSONbin
export async function saveChatMessage(sessionId, userMsg, botReply) {
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

    record[sessionId].push({ role: 'user', content: userMsg });
    record[sessionId].push({ role: 'assistant', content: botReply });

    // Garde les 20 derniers messages par discussion pour optimiser l'espace
    if (record[sessionId].length > 20) {
      record[sessionId] = record[sessionId].slice(-20);
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
    
