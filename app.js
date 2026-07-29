// Configuration & Éléments du DOM
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const modeSelect = document.getElementById('mode-select');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');

let currentFileContent = "";

// Auto-resize du textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
});

// Gestion des fichiers joints
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      currentFileContent = `\n\n[Contenu du fichier ${file.name}]:\n${event.target.result}`;
      fileName.textContent = `📎 ${file.name}`;
      filePreview.classList.remove('hidden');
    };
    reader.readAsText(file);
  }
});

removeFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  currentFileContent = '';
  filePreview.classList.add('hidden');
});

// Gestion des raccourcis rapides
document.querySelectorAll('.shortcut-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const promptText = btn.getAttribute('data-prompt');
    userInput.value = promptText + ' ';
    userInput.focus();
  });
});

// Ajout des messages dans l'interface
function appendMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = sender === 'user' 
    ? 'flex justify-end' 
    : 'flex justify-start';

  const innerDiv = document.createElement('div');
  innerDiv.className = sender === 'user'
    ? 'bg-indigo-600 text-white rounded-2xl px-4 py-3 max-w-[85%] text-sm shadow-md'
    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 max-w-[90%] text-sm prose shadow-md';

  if (sender === 'bot') {
    // Rendu Markdown pour les réponses de l'IA
    innerDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
  } else {
    innerDiv.textContent = text;
  }

  messageDiv.appendChild(innerDiv);
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
  return innerDiv;
}

// Soumission du formulaire
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text && !currentFileContent) return;

  const fullPrompt = text + currentFileContent;
  
  // 1. Afficher le message utilisateur
  appendMessage('user', text);

  // Réinitialiser le champ texte et fichier
  userInput.value = '';
  userInput.style.height = 'auto';
  if (currentFileContent) removeFileBtn.click();

  // 2. Message d'attente
  const botMessageElement = appendMessage('bot', '🐙 *Octopus réfléchit...*');

  try {
    // 3. Appel direct à l'API Serverless Vercel
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: fullPrompt,
        mode: modeSelect.value
      })
    });

    const data = await response.json();

    if (response.ok && data.reply) {
      botMessageElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(data.reply) : data.reply;
      if (typeof Prism !== 'undefined') Prism.highlightAll();
    } else {
      botMessageElement.innerHTML = `⚠️ **Erreur :** ${data.error || 'Impossible de contacter l\'IA.'}`;
    }

  } catch (error) {
    console.error('Erreur Fetch:', error);
    botMessageElement.innerHTML = `⚠️ **Erreur réseau :** Vérifie la connexion ou la configuration backend.`;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
});
      
