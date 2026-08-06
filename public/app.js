// public/app.js
// Interface front-end optimisée pour Octopus2 (Design inchangé, robustesse accrue)

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  // Persistance ou création de la session utilisateur
  let sessionId = localStorage.getItem('octopus_session_id');
  if (!sessionId) {
    sessionId = 'session-' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('octopus_session_id', sessionId);
  }

  if (!chatForm || !chatInput || !chatMessages) return;

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userText = chatInput.value.trim();
    if (!userText) return;

    // 1. Affichage du message utilisateur
    appendMessage('user', userText);
    chatInput.value = '';

    // Indicateur de chargement discret
    const loadingId = appendMessage('assistant', 'Octopus2 orchestre la réponse...', true);

    try {
      // 2. Appel de l'API backend centralisée
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          messages: [
            { role: 'user', content: userText }
          ]
        })
      });

      const data = await response.json();
      document.getElementById(loadingId)?.remove();

      if (data.success) {
        // 3. Affichage de la réponse avec un badge de métadonnée propre et discret
        const metadataLabel = data.metadata ? `⚡ ${data.metadata.agentUsed} / ${data.metadata.modelUsed}` : '';
        appendMessage('assistant', data.response, false, metadataLabel);
      } else {
        appendMessage('assistant', `⚠️ Erreur : ${data.error || 'Problème technique'}`);
      }

    } catch (error) {
      document.getElementById(loadingId)?.remove();
      appendMessage('assistant', `⚠️ Erreur de connexion au serveur : ${error.message}`);
    }
  });

  function appendMessage(role, text, isLoading = false, metadata = '') {
    const messageDiv = document.createElement('div');
    const messageId = 'msg-' + Date.now();
    messageDiv.id = messageId;
    
    // Conserve exactement tes classes de style actuelles
    messageDiv.className = `p-3 my-2 rounded-lg max-w-[85%] ${
      role === 'user' 
        ? 'ml-auto bg-blue-600 text-white' 
        : 'mr-auto bg-gray-800 text-gray-100 border border-gray-700'
    }`;
    
    if (isLoading) {
      messageDiv.classList.add('animate-pulse', 'italic');
    }

    // Corps du message
    const textContent = document.createElement('div');
    textContent.innerText = text;
    messageDiv.appendChild(textContent);

    // Ajout discret des métadonnées de l'agent si présentes (sans casser le visuel)
    if (metadata && role === 'assistant') {
      const metaDiv = document.createElement('div');
      metaDiv.className = 'text-[10px] text-gray-400 mt-2 pt-1 border-t border-gray-700 flex justify-end';
      metaDiv.innerText = metadata;
      messageDiv.appendChild(metaDiv);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageId;
  }
});
             
