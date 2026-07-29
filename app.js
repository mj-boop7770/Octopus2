document.addEventListener('DOMContentLoaded', () => {
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
    let currentChatId = Date.now();

    // Charger l'historique au démarrage
    renderHistory();

    // Gestion de l'import de fichier (texte ou image)
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentFileName = file.name;
        fileNameSpan.textContent = currentFileName;
        filePreview.classList.remove('hidden');

        const reader = new FileReader();
        if (file.type.startsWith('image/')) {
            reader.onload = (event) => {
                currentFileContent = event.target.result; // Base64 pour l'image
            };
            reader.readAsDataURL(file);
        } else {
            reader.onload = (event) => {
                currentFileContent = event.target.result; // Texte brut pour les fichiers de code
            };
            reader.readAsText(file);
        }
    });

    removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        currentFileContent = null;
        currentFileName = null;
        filePreview.classList.add('hidden');
    });

    // Soumission du formulaire
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text && !currentFileContent) return;

        // Préparer le message utilisateur
        let messagePayload = text;
        if (currentFileName && currentFileContent) {
            messagePayload += `\n\n[Fichier attaché : ${currentFileName}]\n${currentFileContent}`;
        }

        appendMessage('user', messagePayload);
        userInput.value = '';
        
        // Reset du fichier attaché après envoi
        const payloadForApi = messagePayload;
        fileInput.value = '';
        currentFileContent = null;
        currentFileName = null;
        filePreview.classList.add('hidden');

        // Afficher un indicateur de chargement
        const loadingId = appendMessage('assistant', '🐙 Réflexion en cours...');

        try {
            // Appel à ton API Vercel (adapte l'URL si besoin, ex: '/api/chat')
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

            if (data.reply) {
                appendMessage('assistant', data.reply);
                saveChatToLocalStorage(text, data.reply);
            } else {
                appendMessage('assistant', '⚠️ Erreur : Réponse vide de l\'API.');
            }
        } catch (error) {
            removeMessage(loadingId);
            appendMessage('assistant', '❌ Erreur de connexion avec le serveur Vercel/Groq.');
            console.error(error);
        }
    });

    // Fonction pour afficher les messages avec coloration et bouton copier
    function appendMessage(sender, text) {
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36.substring(2, 9));
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `p-4 rounded-xl border ${
            sender === 'user' 
                ? 'bg-indigo-950/40 border-indigo-800 ml-8 text-gray-100' 
                : 'bg-gray-800/80 border-gray-700 mr-8 text-gray-200'
        }`;

        // Formater le texte (Markdown simple + Blocs de code)
        messageDiv.innerHTML = formatMarkdown(text);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Activer Prism.js sur les nouveaux blocs de code
        Prism.highlightAll();

        return messageId;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Convertisseur léger avec intégration du bouton "Copier" pour les blocs de code
    function formatMarkdown(content) {
        // Échapper le HTML de base pour la sécurité, sauf les blocs de code
        let formatted = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Remplacer les blocs de code ```lang ... ``` par un conteneur avec bouton Copier
        formatted = formatted.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const codeId = 'code-' + Math.random().toString(36).substring(2, 9);
            return `
                <div class="my-3 rounded-lg overflow-hidden border border-gray-700 bg-gray-950">
                    <div class="bg-gray-900 px-4 py-1.5 text-xs text-gray-400 flex justify-between items-center border-b border-gray-800">
                        <span>${lang || 'code'}</span>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText);this.innerText='Copié !';setTimeout(()=>this.innerText='Copier',2000)" class="text-indigo-400 hover:text-indigo-300 transition">Copier</button>
                    </div>
                    <pre class="p-4 overflow-x-auto text-sm"><code id="${codeId}" class="language-${lang || 'javascript'}">${code}</code></pre>
                </div>
            `;
        });

        // Sauts de ligne simples
        return formatted.replace(/\n/g, '<br>');
    }

    // Gestion de l'historique local
    function saveChatToLocalStorage(userMsg, aiMsg) {
        chatHistory.push({ user: userMsg, ai: aiMsg });
        localStorage.setItem('octopus_chats', JSON.stringify(chatHistory));
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        chatHistory.slice(-10).reverse().forEach((chat, index) => {
            const item = document.createElement('div');
            item.className = 'text-xs text-gray-300 bg-gray-900 hover:bg-gray-800 p-2 rounded-lg cursor-pointer truncate transition';
            item.textContent = chat.user;
            historyList.appendChild(item);
        });
    }

    newChatBtn.addEventListener('click', () => {
        chatBox.innerHTML = `
            <div class="bg-gray-800/50 p-4 rounded-xl border border-gray-700 text-gray-300">
                👋 Nouvelle session prête ! Dis-moi tout, Léandre.
            </div>
        `;
    });
});
                               
