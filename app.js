// Éléments du DOM
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const modeSelect = document.getElementById('mode-select');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');

// Éléments de la Sidebar (Les 3 barres)
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

let currentFileContent = "";

// 1. GESTION DE LA SIDEBAR (Les 3 barres)
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

// 2. GESTION DES FICHIERS (Code, Texte, etc.)
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        alert("Les fichiers images ne sont pas encore pris en charge par ce modèle d'IA. Choisis un fichier texte ou de code (.txt, .js, .py, .html, etc.).");
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        currentFileContent = `\n\n[Contenu du fichier ${file.name}]:\n${event.target.result}`;
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

// 3. BOUTONS RACCOURCIS (Envoi immédiat au clic)
document.querySelectorAll('.shortcut-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const promptText = btn.getAttribute('data-prompt');
    if (promptText) {
      sendMessage(promptText);
    }
  });
});

// 4. LECTURE AUDIO (Synthèse vocale)
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stoppe toute lecture en cours
    // Retirer les balises HTML/Markdown pour une lecture fluide
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  } else {
    alert("La synthèse vocale n'est pas supportée par ton navigateur.");
  }
}

// 5. AFFICHAGE DES MESSAGES AVEC BOUTON AUDIO
function appendMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = sender === 'user' ? 'flex justify-end' : 'flex justify-start';

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

  // Ajout du bouton Audio 🔊 pour les réponses du Bot
  if (sender === 'bot' && text !== '🐙 *Octopus réfléchit...*') {
    const audioBtn = document.createElement('button');
    audioBtn.className = 'self-start text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 px-1 py-0.5 transition';
    audioBtn.innerHTML = '🔊 Écouter';
    audioBtn.onclick = () => speakText(text);
    innerContainer.appendChild(audioBtn);
  }

  messageDiv.appendChild(innerContainer);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
  return innerDiv;
}

// 6. ENVOI DU MESSAGE
async function sendMessage(customPrompt = null) {
  const text = customPrompt || (userInput ? userInput.value.trim() : '');
  if (!text && !currentFileContent) return;

  const fullPrompt = text + currentFileContent;
  
  appendMessage('user', text);

  if (userInput) {
    userInput.value = '';
    userInput.style.height = 'auto';
  }
  if (currentFileContent && removeFileBtn) removeFileBtn.click();

  const botMessageElement = appendMessage('bot', '🐙 *Octopus réfléchit...*');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fullPrompt,
        mode: modeSelect ? modeSelect.value : 'general'
      })
    });

    const data = await response.json();

    if (response.ok && data.reply) {
      botMessageElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(data.reply) : data.reply;
      if (typeof Prism !== 'undefined') Prism.highlightAll();

      // Ajouter le bouton audio dynamiquement après réception
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
    }

  } catch (error) {
    console.error('Erreur Fetch:', error);
    botMessageElement.innerHTML = `⚠️ **Erreur réseau :** Vérifie la connexion ou le serveur.`;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}

// Événement Formulaire
if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
  });
          }
    
