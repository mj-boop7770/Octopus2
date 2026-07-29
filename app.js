// Éléments du DOM
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const modeSelect = document.getElementById('mode-select');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');

const openSidebarBtn = document.getElementById('open-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const newChatBtn = document.getElementById('new-chat-btn');
const historyList = document.getElementById('history-list');

// Gestion sécurisée du Stockage Local
let sessions = [];
try {
  const saved = localStorage.getItem('octopus_sessions');
  sessions = saved ? JSON.parse(saved) : [];
  if (!Array.isArray(sessions)) sessions = [];
} catch (e) {
  sessions = [];
}

let currentSessionId = localStorage.getItem('octopus_current_session') || null;
let currentFileContent = "";

// 1. NAVIGATION ET SIDEBAR
function openSidebar() {
  if (sidebar) sidebar.classList.remove('-translate-x-full');
  if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
}
function closeSidebar() {
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
}
if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Auto-resize du champ texte
if (userInput) {
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
  });
}

// 2. GESTION DES SESSIONS ET DE L'HISTORIQUE
function saveToStorage() {
  localStorage.setItem('octopus_sessions', JSON.stringify(sessions));
  localStorage.setItem('octopus_current_session', currentSessionId || '');
}

function createNewSession() {
  const newSession = {
    id: Date.now().toString(),
    title: 'Nouvelle discussion',
    messages: []
  };
  sessions.unshift(newSession);
  currentSessionId = newSession.id;
  saveToStorage();
  renderHistoryList();
  renderCurrentSession();
  closeSidebar();
}

function getCurrentSession() {
  return sessions.find(s => s.id === currentSessionId);
}

function deleteSession(id, e) {
  e.stopPropagation();
  sessions = sessions.filter(s => s.id !== id);
  if (currentSessionId === id) {
    currentSessionId = sessions.length > 0 ? sessions[0].id : null;
  }
  saveToStorage();
  renderHistoryList();
  renderCurrentSession();
}

function renderHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = '';

  if (sessions.length === 0) {
    historyList.innerHTML = `<p class="text-xs text-slate-500 italic px-2">Aucune discussion</p>`;
    return;
  }

  sessions.forEach(session => {
    const isActive = session.id === currentSessionId;
    const item = document.createElement('div');
    item.className = `group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm transition ${
      isActive ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`;

    item.onclick = () => {
      currentSessionId = session.id;
      saveToStorage();
      renderHistoryList();
      renderCurrentSession();
      closeSidebar();
    };

    item.innerHTML = `
      <div class="flex items-center gap-2 truncate">
        <span>💬</span>
        <span class="truncate max-w-[140px]">${session.title}</span>
      </div>
      <button class="delete-btn text-slate-500 hover:text-red-400 opacity-80 transition px-1">✕</button>
    `;

    const delBtn = item.querySelector('.delete-btn');
    if (delBtn) delBtn.onclick = (e) => deleteSession(session.id, e);

    historyList.appendChild(item);
  });
}

function renderCurrentSession() {
  if (!chatBox) return;
  chatBox.innerHTML = '';
  const current = getCurrentSession();

  if (!current || !current.messages || current.messages.length === 0) {
    chatBox.innerHTML = `
      <div class="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-slate-300 text-sm mb-4">
        👋 <b>Bienvenue sur Octopus AI !</b><br>
        Pose ta question ci-dessous pour démarrer cette discussion.
      </div>
    `;
    return;
  }

  current.messages.forEach(msg => {
    appendMessageUI(msg.role === 'user' ? 'user' : 'bot', msg.content, false);
  });
}

// 3. GESTION DES FICHIERS JOINTS
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        alert("Les images ne sont pas encore pris en charge.");
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        currentFileContent = `\n\n[Fichier joint ${file.name}]:\n${event.target.result}`;
        if (fileName) fileName.textContent = `📎 ${file.name}`;
        if (filePreview) filePreview.classList.remove('hidden');
      };
      reader.readAsText(file);
    }
  });
}

if (removeFileBtn) {
  removeFileBtn.addEventListener('click', () => {
    if (fileInput) fileInput.value = '';
    currentFileContent = '';
    if (filePreview) filePreview.classList.add('hidden');
  });
}

// 4. LECTURE AUDIO DES RÉPONSES
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }
}

// 5. AFFICHAGE DES MESSAGES DANS LE CHAT
function appendMessageUI(sender, text, isThinking = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = sender === 'user' ? 'flex justify-end my-2' : 'flex justify-start my-2';

  const innerContainer = document.createElement('div');
  innerContainer.className = 'flex flex-col gap-1 max-w-[88%]';

  const innerDiv = document.createElement('div');
  innerDiv.className = sender === 'user'
    ? 'bg-indigo-600 text-white rounded-2xl px-4 py-3 text-sm shadow-md'
    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-sm prose shadow-md';

  if (sender === 'bot') {
    innerDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
  } else {
    innerDiv.textContent = text;
  }

  innerContainer.appendChild(innerDiv);

  if (sender === 'bot' && !isThinking) {
    const audioBtn = document.createElement('button');
    audioBtn.className = 'self-start text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 px-1 py-0.5 transition mt-1';
    audioBtn.innerHTML = '🔊 Écouter';
    audioBtn.onclick = () => speakText(text);
    innerContainer.appendChild(audioBtn);
  }

  messageDiv.appendChild(innerContainer);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
  return innerDiv;
}

// 6. RACCOURCIS BOUTONS (Débugger, Optimiser, etc.)
document.querySelectorAll('.shortcut-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const promptText = btn.getAttribute('data-prompt');
    if (promptText && userInput) {
      userInput.value = promptText + " ";
      userInput.focus();
    }
  });
});

// 7. ENVOI DES MESSAGES VERS LE BACKEND
async function sendMessage(customPrompt = null) {
  const text = customPrompt || (userInput ? userInput.value.trim() : '');
  if (!text && !currentFileContent) return;

  const fullPrompt = text + currentFileContent;

  if (!currentSessionId || sessions.length === 0) {
    createNewSession();
  }

  let current = getCurrentSession();
  if (!current) {
    createNewSession();
    current = getCurrentSession();
  }

  if (current.messages.length === 0) {
    current.title = text.slice(0, 22) + (text.length > 22 ? '...' : '');
  }

  appendMessageUI('user', text);
  current.messages.push({ role: 'user', content: fullPrompt });
  saveToStorage();
  renderHistoryList();

  if (userInput) {
    userInput.value = '';
    userInput.style.height = 'auto';
  }
  if (currentFileContent && removeFileBtn) removeFileBtn.click();

  const botMessageElement = appendMessageUI('bot', '🐙 *Octopus réfléchit...*', true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text, // Transmis explicitement pour éliminer l'erreur de message requis
        messages: current.messages,
        mode: modeSelect ? modeSelect.value : 'general'
      })
    });

    const data = await response.json();

    if (response.ok && data.reply) {
      botMessageElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(data.reply) : data.reply;
      if (typeof Prism !== 'undefined') Prism.highlightAll();

      current.messages.push({ role: 'assistant', content: data.reply });
      saveToStorage();

      const parentContainer = botMessageElement.parentElement;
      if (parentContainer && !parentContainer.querySelector('button')) {
        const audioBtn = document.createElement('button');
        audioBtn.className = 'self-start text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 px-1 py-0.5 transition mt-1';
        audioBtn.innerHTML = '🔊 Écouter';
        audioBtn.onclick = () => speakText(data.reply);
        parentContainer.appendChild(audioBtn);
      }

    } else {
      botMessageElement.innerHTML = `⚠️ **Erreur :** ${data.error || 'Impossible de contacter l\'IA.'}`;
      current.messages.pop();
      saveToStorage();
    }

  } catch (error) {
    console.error('Erreur Fetch:', error);
    botMessageElement.innerHTML = `⚠️ **Erreur réseau :** Connexion interrompue.`;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

if (newChatBtn) {
  newChatBtn.addEventListener('click', createNewSession);
}

if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });
}

// INITIALISATION SÉCURISÉE AU CHARGEMENT DE LA PAGE
if (sessions.length === 0) {
  createNewSession();
} else {
  if (!currentSessionId || !getCurrentSession()) {
    currentSessionId = sessions[0].id;
  }
  renderHistoryList();
  renderCurrentSession();
  }
    
