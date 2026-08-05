// js/app.js

// Configuration du parseur Marked pour le rendu Markdown du Code
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
    const highlighted = hljs.highlight(code, { language: validLang }).value;
    const codeId = 'code-' + Math.random().toString(36).substr(2, 9);

    return `
        <div class="relative group my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
            <div class="flex items-center justify-between px-4 py-2 bg-slate-800 text-[11px] text-slate-400 font-mono border-b border-slate-700/50">
                <span class="uppercase">${validLang}</span>
                <button onclick="copyCode('${codeId}', this)" class="hover:text-white transition flex items-center gap-1.5">
                    <i class="fa-regular fa-copy"></i> <span class="copy-text">Copier</span>
                </button>
            </div>
            <pre class="p-4 overflow-x-auto custom-scrollbar text-xs font-mono"><code id="${codeId}" class="hljs language-${validLang}">${highlighted}</code></pre>
        </div>`;
};
marked.setOptions({ renderer: renderer, breaks: true, gfm: true });

window.copyCode = function(id, btn) {
    const codeElement = document.getElementById(id);
    if (!codeElement) return;
    navigator.clipboard.writeText(codeElement.innerText).then(() => {
        const span = btn.querySelector('.copy-text');
        if (span) {
            span.innerText = 'Copié !';
            setTimeout(() => span.innerText = 'Copier', 2000);
        }
    });
};

// --- ETAT GLOBAL DE L'APPLICATION ---
let chats = JSON.parse(localStorage.getItem('octopus_chats')) || [];
let currentChatId = null;
let isWebSearchActive = false;
let currentAttachedFile = null;

// --- ELEMENTS DU DOM ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const chatListEl = document.getElementById('chat-list');
const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const modeSelect = document.getElementById('mode-select');
const webToggle = document.getElementById('web-search-toggle');
const webStatus = document.getElementById('web-status');
const newChatBtn = document.getElementById('new-chat-btn');
const currentChatTitle = document.getElementById('current-chat-title');
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const filePreviewContent = document.getElementById('file-preview-content');
const removeFileBtn = document.getElementById('remove-file-btn');

// --- INITIALISATION DES ECOUTEURS D'EVENEMENTS ---
document.addEventListener('DOMContentLoaded', () => {

    // 1. IMPORTATION DES FICHIERS ET PHOTOS
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const isImage = file.type.startsWith('image/');
            const isText = file.type.startsWith('text/') || 
                           /\.(js|py|json|html|css|md|txt|csv|xml)$/i.test(file.name);

            const reader = new FileReader();

            reader.onload = function(evt) {
                currentAttachedFile = {
                    name: file.name,
                    type: file.type || (isImage ? 'image/png' : 'text/plain'),
                    data: evt.target.result,
                    isImage: isImage,
                    isText: isText
                };
                
                if (filePreviewContent && filePreviewContainer) {
                    const icon = isImage ? '<i class="fa-solid fa-image text-indigo-400"></i>' : '<i class="fa-solid fa-file-code text-indigo-400"></i>';
                    filePreviewContent.innerHTML = `${icon} <span class="truncate max-w-[200px]">${escapeHtml(file.name)}</span>`;
                    filePreviewContainer.classList.remove('hidden');
                }
            };

            if (isImage) {
                reader.readAsDataURL(file); // Convertit les photos en Base64 pour l'analyse visuelle
            } else {
                reader.readAsText(file); // Lit le texte brut des fichiers/scripts
            }
        });
    }

    if (removeFileBtn) {
        removeFileBtn.onclick = clearAttachedFile;
    }

    // Adjust Textarea Height Dynamic
    if (userInput) {
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 128) + 'px';
        });
    }

    // Responsive Sidebar
    if (openSidebarBtn) openSidebarBtn.onclick = () => { sidebar.classList.remove('-translate-x-full'); sidebarOverlay.classList.remove('hidden'); };
    if (closeSidebarBtn) closeSidebarBtn.onclick = () => { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); };
    if (sidebarOverlay) sidebarOverlay.onclick = () => { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); };

    // Toggle Recherche Web
    if (webToggle) {
        webToggle.onclick = () => {
            isWebSearchActive = !isWebSearchActive;
            webToggle.dataset.active = isWebSearchActive ? 'true' : 'false';
            if (webStatus) {
                webStatus.textContent = isWebSearchActive ? 'ON' : 'OFF';
                webStatus.className = isWebSearchActive ? 'font-bold text-emerald-400' : 'font-bold text-red-400';
            }
        };
    }

    if (newChatBtn) newChatBtn.onclick = createNewChat;

    if (chatForm) {
        chatForm.onsubmit = handleFormSubmit;
    }

    // Lancement de la session
    if (chats.length === 0) {
        createNewChat();
    } else {
        currentChatId = chats[0].id;
        renderSidebar();
        renderMessages();
    }
});

function clearAttachedFile() {
    currentAttachedFile = null;
    if (fileInput) fileInput.value = '';
    if (filePreviewContainer) filePreviewContainer.classList.add('hidden');
}

function saveChats() { 
    localStorage.setItem('octopus_chats', JSON.stringify(chats)); 
}

function createNewChat() {
    const newChat = { id: Date.now().toString(), title: 'Nouvelle discussion', messages: [] };
    chats.unshift(newChat);
    currentChatId = newChat.id;
    saveChats();
    renderSidebar();
    renderMessages();
}

function renderSidebar() {
    if (!chatListEl) return;
    chatListEl.innerHTML = '';
    chats.forEach(chat => {
        const btn = document.createElement('div');
        const isActive = chat.id === currentChatId;
        btn.className = `p-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between transition ${isActive ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50'}`;
        btn.innerHTML = `
            <div class="flex items-center gap-2 truncate">
                <i class="fa-regular fa-message text-slate-500"></i>
                <span class="truncate">${escapeHtml(chat.title)}</span>
            </div>
            <button onclick="deleteChat(event, '${chat.id}')" class="text-slate-500 hover:text-red-400 p-1"><i class="fa-solid fa-trash"></i></button>`;
        btn.onclick = (e) => {
            if (!e.target.closest('button')) {
                currentChatId = chat.id;
                renderSidebar();
                renderMessages();
            }
        };
        chatListEl.appendChild(btn);
    });
}

window.deleteChat = function(e, id) {
    e.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    currentChatId = chats.length > 0 ? chats[0].id : null;
    saveChats();
    if (!currentChatId) createNewChat(); else { renderSidebar(); renderMessages(); }
};

function renderMessages() {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    const activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) return;

    if (currentChatTitle) currentChatTitle.textContent = activeChat.title;

    activeChat.messages.forEach(msg => {
        const isUser = msg.role === 'user';
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`;
        
        let fileHtml = '';
        if (msg.file) {
            fileHtml = msg.file.isImage 
                ? `<img src="${msg.file.data}" class="max-w-xs rounded-lg my-2 border border-slate-700 shadow" />`
                : `<div class="text-xs bg-slate-800 p-2 rounded my-1 border border-slate-700 font-mono"><i class="fa-solid fa-file-code text-indigo-400"></i> ${escapeHtml(msg.file.name)}</div>`;
        }

        let contentBody = '';
        if (msg.isAudio && msg.audioUrl) {
            contentBody = `
                <div class="p-3 bg-slate-950 border border-indigo-500/40 rounded-xl space-y-3">
                    <div class="flex items-center justify-between text-xs text-indigo-400 font-semibold">
                        <span>🎵 Maestro Audio Track</span>
                        <span class="text-[10px] text-slate-400">WAV • HD</span>
                    </div>
                    <audio controls class="w-full rounded-lg bg-slate-900">
                        <source src="${msg.audioUrl}" type="audio/wav">
                    </audio>
                    <div class="text-right">
                        <a href="${msg.audioUrl}" download="maestro-track.wav" class="inline-block px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition">
                            📥 Télécharger .wav
                        </a>
                    </div>
                </div>`;
        } else {
            contentBody = isUser ? escapeHtml(msg.content) : marked.parse(msg.content);
        }

        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400 border border-slate-700'}">
                ${isUser ? '<i class="fa-solid fa-user"></i>' : '🐙'}
            </div>
            <div class="space-y-1.5 max-w-[85%]">
                <div class="p-3.5 rounded-2xl ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'} shadow-sm">
                    ${fileHtml}
                    <div class="markdown-body">${contentBody}</div>
                </div>
            </div>`;
        messagesContainer.appendChild(msgDiv);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 2. SOUMISSION DU FORMULAIRE ET ENVOI REQUETE
async function handleFormSubmit(e) {
    e.preventDefault();
    const text = userInput ? userInput.value.trim() : '';
    if (!text && !currentAttachedFile) return;

    if (!currentChatId) createNewChat();
    const activeChat = chats.find(c => c.id === currentChatId);

    if (activeChat.messages.length === 0) {
        activeChat.title = text ? text.slice(0, 25) + '...' : 'Fichier joint';
    }

    const selectedMode = modeSelect ? modeSelect.value : 'standard';

    // Inscription du message utilisateur
    const userMsg = { role: 'user', content: text, file: currentAttachedFile };
    activeChat.messages.push(userMsg);

    const attachedFile = currentAttachedFile;
    if (userInput) { userInput.value = ''; userInput.style.height = 'auto'; }
    clearAttachedFile();

    saveChats();
    renderSidebar();
    renderMessages();

    // Loader
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'flex gap-3 mr-auto items-center text-xs text-slate-400 my-2';
    loadingDiv.innerHTML = `<div class="w-8 h-8 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center">🐙</div> <i class="fa-solid fa-spinner fa-spin"></i> Traitement par l'IA...`;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // ROUTE MAESTRO AUDIO
    if (selectedMode === 'music-maestro') {
        try {
            const response = await fetch('/api/music', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            loadingDiv.remove();

            if (!response.ok) throw new Error("Erreur de génération du morceau audio.");

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            activeChat.messages.push({
                role: 'bot',
                content: '',
                isAudio: true,
                audioUrl: audioUrl
            });
        } catch (err) {
            loadingDiv.remove();
            activeChat.messages.push({ role: 'bot', content: '⚠️ Impossible de générer la musique via l\'API Hugging Face.' });
        }
    } 
    // ROUTE TCHAT TEXTE / CODE / VISION
    else {
        let payloadText = text;
        let imagePayload = null;

        if (attachedFile) {
            if (attachedFile.isText) {
                payloadText = `${text}\n\n[CONTENU DU FICHIER JOINT: ${attachedFile.name}]\n${attachedFile.data}`;
            } else if (attachedFile.isImage) {
                imagePayload = {
                    name: attachedFile.name,
                    mimeType: attachedFile.type,
                    data: attachedFile.data
                };
            }
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: payloadText,
                    mode: selectedMode,
                    webSearch: isWebSearchActive,
                    image: imagePayload
                })
            });

            const data = await response.json();
            loadingDiv.remove();

            if (response.ok && data.reply) {
                activeChat.messages.push({ role: 'bot', content: data.reply });
            } else {
                activeChat.messages.push({ role: 'bot', content: `⚠️ Erreur API : ${data.error || 'Erreur inconnue'}` });
            }
        } catch (err) {
            loadingDiv.remove();
            activeChat.messages.push({ role: 'bot', content: '⚠️ Impossible de contacter le serveur backend /api/chat.' });
        }
    }

    saveChats();
    renderMessages();
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
