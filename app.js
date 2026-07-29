document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const octopusLogo = document.getElementById('octopus-logo');

    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileNameSpan = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');
    const historyList = document.getElementById('history-list');
    const searchHistoryInput = document.getElementById('search-history');
    const newChatBtn = document.getElementById('new-chat-btn');
    const modeSelect = document.getElementById('mode-select');
    const exportChatBtn = document.getElementById('export-chat-btn');
    const shortcutBtns = document.querySelectorAll('.shortcut-btn');

    let currentFileContent = null;
    let currentFileName = null;
    let chatHistory = JSON.parse(localStorage.getItem('octopus_chats')) || [];

    // --- MENU MOBILE ---
    function toggleSidebar() {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    }
    openSidebarBtn?.addEventListener('click', toggleSidebar);
    closeSidebarBtn?.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', toggleSidebar);

    renderHistory();

    // --- GESTION FICHIERS ---
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentFileName = file.name;
        fileNameSpan.textContent = currentFileName;
        filePreview.classList.remove('hidden');

        const reader = new FileReader();
        if (file.type.startsWith('image/')) {
            reader.onload = (ev) => currentFileContent = ev.target.result;
            reader.readAsDataURL(file);
        } else {
            reader.onload = (ev) => currentFileContent = ev.target.result;
            reader.readAsText(file);
        }
    });

    removeFileBtn?.addEventListener('click', () => {
        fileInput.value = '';
        currentFileContent = null;
        currentFileName = null;
        filePreview.classList.add('hidden');
    });

    // --- RACCOURCIS RAPIDES ---
    shortcutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            userInput.value = btn.getAttribute('data-prompt') + " ";
            userInput.focus();
        });
    });

    // --- ANIMATION LOGO ---
    function setThinkingState(isThinking) {
        if (isThinking) octopusLogo.classList.add('octopus-thinking');
        else octopusLogo.classList.remove('octopus-thinking');
    }

    // --- SOUMMISSION & API ---
    chatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text && !currentFileContent) return;

        let messagePayload = text;
        if (currentFileName && currentFileContent) {
            messagePayload += `\n\n[Fichier attaché : ${currentFileName}]\n${currentFileContent}`;
        }

        appendMessage('user', text || `[Fichier : ${currentFileName}]`);
        userInput.value = '';
        
        const payloadForApi = messagePayload;
        fileInput.value = '';
        currentFileContent = null;
        currentFileName = null;
        filePreview.classList.add('hidden');

        setThinkingState(true);
        const loadingId = appendMessage('assistant', '🐙 Réflexion en cours...');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: payloadForApi, mode: modeSelect.value })
            });

            const data = await response.json();
            removeMessage(loadingId);
            setThinkingState(false);

            if (data.reply) {
                appendMessage('assistant', data.reply, true); // Ajout du bouton audio
                saveChatToLocalStorage(text || 'Discussion Fichier', data.reply);
            } else {
                appendMessage('assistant', '⚠️ Erreur : Réponse vide de l\'API.');
            }
        } catch (error) {
            removeMessage(loadingId);
            setThinkingState(false);
            appendMessage('assistant', '❌ Erreur de connexion au serveur.');
            console.error(error);
        }
    });

    // --- AFFICHAGE & SYNTHÈSE VOCALE ---
    function appendMessage(sender, text, allowSpeech = false) {
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `p-4 rounded-2xl text-sm border relative group ${
            sender === 'user' 
                ? 'bg-indigo-50 border-indigo-100 text-indigo-950 ml-6 md:ml-12' 
                : 'bg-white border-gray-200 text-gray-800 mr-6 md:mr-12 shadow-sm'
        }`;

        let htmlContent = formatMarkdown(text);

        // Ajouter un bouton de lecture audio (Synthèse vocale) pour les réponses de l'IA
        if (allowSpeech && 'speechSynthesis' in window) {
            const safeTextForSpeech = text.replace(/```[\s\S]*?```/g, ' [bloc de code omis] ');
            htmlContent += `
                <div class="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                    <button onclick="speakText(\`${safeTextForSpeech.replace(/["`]/g, "'")}\`)" class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-2 py-1 rounded-lg">
                        🔊 Écouter
                    </button>
                </div>
            `;
        }

        messageDiv.innerHTML = htmlContent;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        if (window.Prism) Prism.highlightAll();
        return messageId;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Fonction globale pour la synthèse vocale
    window.speakText = function(text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        window.speechSynthesis.speak(utterance);
    };

    function formatMarkdown(content) {
        let formatted = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

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

    // --- HISTORIQUE & RECHERCHE ---
    function saveChatToLocalStorage(userMsg, aiMsg) {
        chatHistory.push({ user: userMsg, ai: aiMsg, date: new Date().toLocaleDateString() });
        localStorage.setItem('octopus_chats', JSON.stringify(chatHistory));
        renderHistory();
    }

    function renderHistory(filter = '') {
        if (!historyList) return;
        historyList.innerHTML = '';
        
        const filtered = chatHistory.filter(c => c.user.toLowerCase().includes(filter.toLowerCase()));

        filtered.slice(-15).reverse().forEach((chat) => {
            const item = document.createElement('div');
            item.className = 'text-xs text-gray-600 hover:bg-gray-100 p-2.5 rounded-xl cursor-pointer truncate transition font-medium';
            item.textContent = chat.user;
            historyList.appendChild(item);
        });
    }

    searchHistoryInput?.addEventListener('input', (e) => {
        renderHistory(e.target.value);
    });

    newChatBtn?.addEventListener('click', () => {
        chatBox.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-700 text-sm">
                👋 Nouvelle session prête ! Dis-moi tout.
            </div>
        `;
        if(window.innerWidth < 768) toggleSidebar();
    });

    // --- EXPORT DE DISCUSSION ---
    exportChatBtn?.addEventListener('click', () => {
        if (chatHistory.length === 0) {
            alert("Aucune conversation à exporter !");
            return;
        }
        const markdownContent = chatHistory.map(c => `### Question :\n${c.user}\n\n### Octopus :\n${c.ai}\n\n---\n`).join('\n');
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Octopus-Export-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    });
});
    
