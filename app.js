// public/app.js (ou assets/js/app.js)
// Interface front-end pour communiquer avec Octopus2

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const sessionId = 'session-' + Math.random().toString(36.substring(2, 9));

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userText = chatInput.value.trim();
    if (!userText) return;

    // 1. Affichage du message utilisateur dans l'UI
    appendMessage('user', userText);
    chatInput.value = '';

    // Indicateur de chargement / réflexion
    const loadingId = appendMessage('assistant', 'Octopus2 réfléchit et orchestre...', true);

    try {
      // 2. Appel de notre API backend /api/chat.js
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Si tu veux passer des clés spécifiques depuis l'UI si besoin :
          // 'x-groq-key': 'TA_CLE_GROQ'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          messages: [
            { role: 'user', content: userText }
          ]
        })
      });

      const data = await response.json();

      // Suppression de l'indicateur de chargement
      document.getElementById(loadingId).remove();

      if (data.success) {
        // 3. Affichage de la réponse de l'agent avec les métadonnées (agent et modèle utilisés)
        const metadataText = `\n\n*(Agent : ${data.metadata.agentUsed} | Modèle : ${data.metadata.modelUsed})*`;
        appendMessage('assistant', data.response + metadataText);
      } else {
        appendMessage('assistant', `⚠️ Erreur : ${data.error}`);
      }

    } catch (error) {
      document.getElementById(loadingId)?.remove();
      appendMessage('assistant', `⚠️ Erreur de connexion au serveur Octopus2 : ${error.message}`);
    }
  });

  function appendMessage(role, text, isLoading = false) {
    const messageDiv = document.createElement('div');
    const messageId = 'msg-' + Date.now();
    messageDiv.id = messageId;
    messageDiv.className = `p-3 my-2 rounded-lg max-w-[80%] ${
      role === 'user' 
        ? 'ml-auto bg-blue-600 text-white' 
        : 'mr-auto bg-gray-800 text-gray-100 border border-gray-700'
    }`;
    
    if (isLoading) {
      messageDiv.classList.add('animate-pulse', 'italic');
    }

    messageDiv.innerText = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageId;
  }
});
        
