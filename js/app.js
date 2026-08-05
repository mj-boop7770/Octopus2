// js/app.js

let currentAgent = { id: 'default', type: 'text' };

document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const agentSelect = document.getElementById('agent-select') || document.querySelector('select');

  // Si l'utilisateur change d'agent dans le menu déroulant
  if (agentSelect) {
    agentSelect.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const foundAgent = AGENTS.find(a => a.id === selectedId);
      if (foundAgent) {
        currentAgent = foundAgent;
      } else if (selectedId.includes('music') || selectedId.includes('audio') || selectedId.includes('maestro')) {
        currentAgent = { id: 'music-maestro', type: 'audio' };
      } else {
        currentAgent = { id: selectedId, type: 'text' };
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
});

async function handleSendMessage() {
  const messageInput = document.getElementById('message-input');
  const userInput = messageInput.value.trim();

  if (!userInput) return;

  // Récupérer le mode actif depuis le dropdown s'il existe
  const agentSelect = document.getElementById('agent-select') || document.querySelector('select');
  const selectedMode = agentSelect ? agentSelect.value.toLowerCase() : '';

  appendUserMessage(userInput);
  messageInput.value = '';

  // DÉTECTION STRICTE : Si l'agent actif est 'audio', OU si le menu est sur musique, OU si l'utilisateur demande explicitement une génération audio
  const isAudioAgent = currentAgent.type === 'audio' || currentAgent.id === 'music-maestro' || selectedMode.includes('music') || selectedMode.includes('audio');

  if (isAudioAgent) {
    await handleAudioGeneration(userInput);
  } else {
    await handleTextGeneration(userInput);
  }
}

async function handleAudioGeneration(promptText) {
  showLoadingIndicator('🎵 Génération du fichier audio (.wav) en cours... Veuillez patienter.');

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
    appendAudioCard({ promptText, audioUrl });

  } catch (error) {
    console.error('Erreur Audio:', error);
    hideLoadingIndicator();
    appendErrorMessage('Désolé, impossible de composer la musique sur Hugging Face. Réessayez.');
  }
}

async function handleTextGeneration(promptText) {
  showLoadingIndicator('Octopus réfléchit...');

  try {
    const response = await fetch('/api/chat', {
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

function appendUserMessage(text) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
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
  if (!chatMessages) return;
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

function appendErrorMessage(text) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex justify-start my-2';
  msgDiv.innerHTML = `
    <div class="bg-red-900/60 text-red-200 p-3 rounded-2xl text-xs border border-red-700">
      ⚠️ ${escapeHtml(text)}
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  scrollToBottom();
}

function appendAudioCard({ promptText, audioUrl }) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
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
  if (!chatMessages) return;
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
  if (!chatMessages) return;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
    }
      
