// js/app.js

// 1. Initialisation des variables globales
let currentAgent = AGENTS[0] || { id: 'default', type: 'text' }; // Agent par défaut

document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const chatMessages = document.getElementById('chat-messages');

  // Écouteur sur le bouton d'envoi
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  // Écouteur sur la touche Entrée
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
});

// 2. Fonction principale d'envoi de message
async function handleSendMessage() {
  const messageInput = document.getElementById('message-input');
  const userInput = messageInput.value.trim();

  if (!userInput) return;

  // Affiche le message de l'utilisateur dans le chat
  appendUserMessage(userInput);
  messageInput.value = '';

  // Sélection du comportement selon le type d'agent (Audio ou Texte)
  if (currentAgent.id === 'music-maestro' || currentAgent.type === 'audio') {
    await handleAudioGeneration(userInput);
  } else {
    await handleTextGeneration(userInput);
  }
}

// 3. Gestion de la génération AUDIO (Hugging Face)
async function handleAudioGeneration(promptText) {
  showLoadingIndicator('🎵 Composition du morceau en cours... Patientez un instant.');

  try {
    const response = await fetch('/api/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        style: promptText,
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la génération audio');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    hideLoadingIndicator();

    // Affiche la carte lecteur audio dans le chat
    appendAudioCard({ promptText, audioUrl });

  } catch (error) {
    console.error('Erreur Audio:', error);
    hideLoadingIndicator();
    appendErrorMessage('Désolé, impossible de composer la musique. Veuillez réessayer.');
  }
}

// 4. Gestion de la génération TEXTE (Groq)
async function handleTextGeneration(promptText) {
  showLoadingIndicator('Octopus réfléchit...');

  try {
    const response = await fetch('/api/chat', { // adapte le chemin si ton API s'appelle autrement
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: promptText,
        mode: currentAgent.id === 'writing' ? 'writing' : 'default',
      }),
    });

    const data = await response.json();
    hideLoadingIndicator();

    if (data.reply) {
      appendBotMessage(data.reply);
    } else {
      throw new Error(data.error || 'Erreur de réponse');
    }

  } catch (error) {
    console.error('Erreur Texte:', error);
    hideLoadingIndicator();
    appendErrorMessage('Une erreur est survenue lors du traitement de votre message.');
  }
}

// 5. Fonctions d'affichage dans le chat (UI)

function appendUserMessage(text) {
  const chatMessages = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex justify-end my-2';
  msgDiv.innerHTML = `
    <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm shadow">
      ${escapeHtml(text)}
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  scrollToBottom();
}

function appendBotMessage(text) {
  const chatMessages = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex justify-start my-2';
  msgDiv.innerHTML = `
    <div class="bg-slate-800 text-slate-100 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm shadow border border-slate-700 whitespace-pre-wrap">
      ${escapeHtml(text)}
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  scrollToBottom();
}

function appendAudioCard({ promptText, audioUrl }) {
  const chatMessages = document.getElementById('chat-messages');
  const card = document.createElement('div');
  card.className = 'flex justify-start my-3';

  card.innerHTML = `
    <div class="p-4 bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-md shadow-xl space-y-3 text-white">
      <div class="flex items-center justify-between text-xs font-semibold text-indigo-400 border-b border-slate-800 pb-2">
        <span class="flex items-center gap-1.5">🎵 <span>Maestro Audio Studio</span></span>
        <span class="text-slate-400 text-[10px]">WAV • HD</span>
      </div>
      
      <div class="text-xs text-slate-300 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        "${escapeHtml(promptText)}"
      </div>

      <audio controls class="w-full mt-2 rounded-lg bg-slate-950">
        <source src="${audioUrl}" type="audio/wav">
        Votre navigateur ne prend pas en charge la lecture audio.
      </audio>

      <div class="flex items-center justify-end pt-1">
        <a href="${audioUrl}" download="maestro-track.wav" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors shadow">
          📥 Télécharger (.wav)
        </a>
      </div>
    </div>
  `;

  chatMessages.appendChild(card);
  scrollToBottom();
}

function showLoadingIndicator(text) {
  const chatMessages = document.getElementById('chat-messages');
  let loader = document.getElementById('loading-indicator');
  
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.className = 'flex justify-start my-2';
    chatMessages.appendChild(loader);
  }

  loader.innerHTML = `
    <div class="bg-slate-800/80 text-indigo-300 p-3 rounded-2xl text-xs italic flex items-center gap-2 border border-slate-700/50">
      <span class="animate-spin">⏳</span> ${text}
    </div>
  `;
  scrollToBottom();
}

function hideLoadingIndicator() {
  const loader = document.getElementById('loading-indicator');
  if (loader) loader.remove();
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
        }
      
