document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const octopusLogo = document.getElementById('octopus-logo');

    // Ouverture / Fermeture de la barre latérale sur Mobile
    function toggleSidebar() {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    }

    openSidebarBtn?.addEventListener('click', toggleSidebar);
    closeSidebarBtn?.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', toggleSidebar);

    // Fonction pour démarrer/arrêter l'animation de réflexion d'Octopus
    function setThinkingState(isThinking) {
        if (isThinking) {
            octopusLogo.classList.add('octopus-thinking');
        } else {
            octopusLogo.classList.remove('octopus-thinking');
        }
    }

    // Dans ta fonction d'envoi du message (Exemple d'intégration) :
    /*
       setThinkingState(true); // Quand l'IA cherche
       // ... appel fetch API ...
       setThinkingState(false); // Quand la réponse arrive
    */
});
