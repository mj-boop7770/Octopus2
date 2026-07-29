document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM - UI & Menu
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const octopusLogo = document.getElementById('octopus-logo');

    // Éléments du DOM - Formulaire & Chat
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileNameSpan = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');
    const historyList = document.getElementById('history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const modeSelect = document.getElementById('mode-select');

    let currentFileContent = null;
    let currentFileName = null;
    let chatHistory = JSON.parse(localStorage.getItem('octopus_chats')) || [];

    // --- 1. GESTION DU MENU MOBILE (SIDEBAR) ---
    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }

    openSidebarBtn?.addEventListener('click', openSidebar);
    closeSidebarBtn?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);

    // Charger l'historique au démarrage
    renderHistory();

    // --- 2. GESTION DES FICHIERS ET PIÈCES JOINTES ---
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentFileName = file.name;
        fileNameSpan.textContent = currentFileName;
        filePreview.classList.remove('hidden');

        const reader = new FileReader();
        if (file.type.startsWith('image/')) {
            reader.onload = (event) => {
                currentFileContent = event.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            reader.onload = (event) => {
                currentFileContent = event.target.result;
            };
            reader.readAsText(file);
        }
    });

    removeFileBtn?.addEventListener('click', () => {
        fileInput.value = '';
        currentFileContent = null;
        currentFileName = null;
        filePreview.classList.add('hidden');
    });

    // --- 3. ANIMATION DU LOGO (OCTOPUS PENSE) ---
    function setThinkingState(isThinking) {
        if (isThinking) {
            octopusLogo.classList.add('octopus-thinking');
        } else {
            octopusLogo.classList.remove('octopus-thinking');
        }
    }

    // --- 4. ENVOI DES MESSAGES ---
    chatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text && !currentFileContent) return;

        // Construire le message avec pièce jointe si présente
        let messagePayload = text;
        if (currentFileName && currentFileContent) {
            messagePayload += `\n\n[Fichier attaché : ${currentFileName}]\n${currentFileContent}`;
        }

        appendMessage('user', text || `[Fichier : ${currentFileName}]`);
        userInput.value = '';
        
        // Nettoyer la pièce jointe
        const payloadForApi = messagePayload;
        fileInput.value = '';
        currentFileContent = null;
        currentFileName = null;
        filePreview.classList.add('hidden');

        // Activer l'animation de réflexion du logo
        setThinkingState(true);
        const loadingId = appendMessage('assistant', '🐙 Réflexion en cours...');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: payloadForApi,
                    mode: modeSelect.value 
                })
            });

            const data = await response.json();
            removeMessage(loadingId);
            setThinkingState(false);

            if (data.reply) {
                appendMessage('assistant', data.reply);
                saveChatToLocalStorage(text || 'Discussion Fichier', data.reply);
            } else {
                appendMessage('assistant', '⚠️ Erreur : Réponse vide de l\'API.');
            }
        } catch (error) {
            removeMessage(loadingId);
            setThinkingState(false);
            appendMessage('assistant', '❌ Erreur de connexion avec le serveur Vercel/Groq.');
            console.error(error);
        }
    });

    // --- 5. AFFICHAGE DES MESSAGES ET BLOCS DE CODE ---
    function appendMessage(sender, text) {
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `p-4 rounded-2xl text-sm border ${
            sender === 'user' 
                ? 'bg-indigo-50 border-indigo-100 text-indigo-950 ml-6 md:ml-12' 
                : 'bg-white border-gray-200 text-gray-800 mr-6 md:mr-12 shadow-sm'
        }`;

        messageDiv.innerHTML = formatMarkdown(text);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Coloration du code Prism.js
        if (window.Prism) {
            Prism.highlightAll();
        }

        return messageId;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function formatMarkdown(content) {
        let formatted = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Formatage des blocs de code avec bouton de copie
        formatted = formatted.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const codeId = 'code-' + Math.random().toString(36).substring(2, 9);
            return `
                <div class="my-3 rounded-xl overflow-hidden border border-gray-200 bg-gray-900 text-gray-100">
                    <div class="bg-gray-800 px-4 py-1.5 text-xs text-gray-300 flex justify-between items-center border-b border-gray-700">
                        <span class="font-mono">${lang || 'code'}</span>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText);this.innerText='Copié !';setTimeout(()=>this.innerText='Copier',2000)" class="text-indigo-300 hover:text-white transition font-medium">Copier</button>
                    </div>
                    <pre class="p-4 overflow-x-auto text-xs md:text-sm"><code id="${codeId}" class="language-${lang || 'javascript'}">${code}</code></pre>
                </div>
            `;
        });

        return formatted.replace(/\n/g, '<br>');
    }

    // --- 6. HISTORIQUE LOCALSTORAGE ---
    function saveChatToLocalStorage(userMsg, aiMsg) {
        chatHistory.push({ user: userMsg, ai: aiMsg });
        localStorage.setItem('octopus_chats', JSON.stringify(chatHistory));
        renderHistory();
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';
        chatHistory.slice(-10).reverse().forEach((chat) => {
            const item = document.createElement('div');
            item.className = 'text-xs text-gray-600 hover:bg-gray-100 p-2.5 rounded-xl cursor-pointer truncate transition font-medium';
            item.textContent = chat.user;
            historyList.appendChild(item);
        });
    }

    newChatBtn?.addEventListener('click', () => {
        chatBox.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-700 text-sm">
                👋 Nouvelle session prête ! Dis-moi tout.
            </div>
        `;
        closeSidebar();
    });
});
            
