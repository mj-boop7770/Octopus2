<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>🐙 MUJOS-OCTOPUS2</title>
    
    <!-- Font Awesome 6 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <!-- Highlight.js -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <!-- Marked -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/11.0.0/marked.min.js"></script>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
        body { background: #0f0f13; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e1e24; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 10px; }
        .markdown-body { color: #e2e8f0; font-size: 0.875rem; line-height: 1.6; }
        .markdown-body p { margin: 0.5rem 0; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #f1f5f9; font-weight: 600; margin: 0.75rem 0 0.5rem; }
        .markdown-body ul, .markdown-body ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .markdown-body blockquote { border-left: 3px solid #4f46e5; padding-left: 1rem; color: #94a3b8; margin: 0.5rem 0; }
        .markdown-body a { color: #818cf8; text-decoration: underline; }
        .markdown-body table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
        .markdown-body th, .markdown-body td { border: 1px solid #334155; padding: 0.4rem 0.75rem; text-align: left; }
        .markdown-body th { background: #1e293b; }
    </style>
</head>
<body>

    <!-- OVERLAY MOBILE -->
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden md:hidden"></div>

    <!-- SIDEBAR -->
    <aside id="sidebar" class="fixed top-0 left-0 z-50 h-full w-72 bg-[#14141a] border-r border-slate-800/60 shadow-2xl -translate-x-full md:translate-x-0 flex flex-col transition-transform duration-300">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
            <div class="flex items-center gap-2.5">
                <span class="text-xl">🐙</span>
                <span class="font-bold text-sm text-slate-200">MUJOS-OCTOPUS2</span>
                <span class="text-[10px] font-mono text-indigo-400 bg-indigo-600/20 px-2 py-0.5 rounded-full">v2</span>
            </div>
            <button id="close-sidebar-btn" class="md:hidden text-slate-400 hover:text-slate-200 transition">
                <i class="fa-regular fa-xmark text-lg"></i>
            </button>
        </div>
        
        <div class="px-3 pt-3">
            <button id="new-chat-btn" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-xs font-medium transition shadow-md active:scale-95">
                <i class="fa-solid fa-plus"></i> Nouvelle discussion
            </button>
        </div>
        
        <div id="chat-list" class="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1.5"></div>
        
        <div class="border-t border-slate-800/60 px-5 py-3 text-[10px] text-slate-500 flex items-center justify-between">
            <span>🧠 MUJOS-OCTOPUS2</span>
            <span class="flex items-center gap-1.5">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connecté
            </span>
        </div>
    </aside>

    <!-- ZONE PRINCIPALE -->
    <main class="md:ml-72 h-screen flex flex-col bg-[#0b0b10]">
        <!-- HEADER -->
        <header class="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/50 bg-[#0f0f13]/80 backdrop-blur-sm sticky top-0 z-20">
            <div class="flex items-center gap-3">
                <button id="open-sidebar-btn" class="md:hidden text-slate-400 hover:text-slate-200 transition text-lg">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <h1 id="current-chat-title" class="text-sm font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-xs">Nouvelle discussion</h1>
            </div>
            <div class="flex items-center gap-3">
                <select id="mode-select" class="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500/50 transition cursor-pointer">
                    <option value="standard">💬 Standard</option>
                    <option value="creative">🎨 Créatif</option>
                    <option value="code">💻 Code</option>
                    <option value="concise">📌 Précis</option>
                    <option value="music-maestro">🎵 Musique (Maestro)</option>
                </select>
                <button id="web-search-toggle" class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-3 py-1.5 text-xs transition active:scale-95">
                    <i class="fa-solid fa-globe"></i>
                    <span id="web-status" class="font-bold text-red-400">OFF</span>
                </button>
            </div>
        </header>

        <!-- MESSAGES -->
        <div id="messages-container" class="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 py-6 space-y-5"></div>

        <!-- PRÉVISUALISATION FICHIER JOINT -->
        <div id="file-preview-container" class="hidden px-4 sm:px-8 py-2 bg-slate-900/40 border-t border-slate-800/40 flex items-center gap-3">
            <div id="file-preview-content" class="text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2"></div>
            <button id="remove-file-btn" class="text-slate-500 hover:text-red-400 text-xs"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <!-- ZONE DE SAISIE -->
        <div class="border-t border-slate-800/50 bg-[#0f0f13] px-4 sm:px-8 py-4">
            <form id="chat-form" class="max-w-4xl mx-auto flex items-end gap-2 bg-slate-900/70 border border-slate-800/60 rounded-2xl p-1.5 shadow-lg focus-within:border-indigo-500/50 transition">
                
                <!-- BOUTON PIÈCE JOINTE -->
                <label for="file-input" class="text-slate-500 hover:text-indigo-400 transition p-2 text-sm cursor-pointer active:scale-95 flex items-center justify-center" title="Joindre une image ou un fichier">
                    <i class="fa-solid fa-paperclip"></i>
                </label>
                <input type="file" id="file-input" class="hidden" accept="image/*, application/pdf, text/plain, text/javascript, text/css, text/html, application/json">

                <!-- BOUTON MICRO -->
                <button id="mic-btn" type="button" class="text-slate-500 hover:text-indigo-400 transition p-2 text-sm active:scale-95" title="Dictée vocale">
                    <i class="fa-solid fa-microphone"></i>
                </button>
                
                <textarea id="user-input" rows="1" placeholder="Posez votre question..." class="flex-1 bg-transparent text-slate-200 text-sm placeholder:text-slate-500 outline-none resize-none py-2 min-h-[40px] max-h-32 leading-relaxed custom-scrollbar"></textarea>
                
                <button id="send-btn" type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-2 transition text-xs font-medium flex items-center gap-1.5 shadow-md active:scale-95">
                    <span>Envoyer</span>
                    <i class="fa-solid fa-paper-plane text-[10px]"></i>
                </button>
            </form>
            <p class="text-center text-[10px] text-slate-500 mt-2.5 tracking-wide">
                ⚡ Connecté au serveur Vercel · Code & Vision · <span class="text-indigo-400">🐙 MUJOS-OCTOPUS2</span>
            </p>
        </div>
    </main>

    <!-- SCRIPT APPLICATION -->
    <script src="js/app.js"></script>
</body>
</html>
    
