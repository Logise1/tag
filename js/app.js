/* ==========================================
   App Entry Point
   ========================================== */

(function () {
    // Initialize UI
    UI.init();

    // Initialize input handler
    Input.init();

    // Initialize auth
    Auth.init();

    // On auth state change
    auth.onAuthStateChanged(async (user) => {
        // Small delay for smooth transition
        setTimeout(() => {
            document.getElementById('loading-screen').classList.remove('active');
        }, 500);

        if (user) {
            // Load shop data and coins
            await Shop.init();
            Stats.refreshCoins();
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (Lobby.currentRoom && Auth.currentUser) {
            const uid = Auth.currentUser.uid;
            const url = db.ref('rooms/' + Lobby.currentRoom + '/players/' + uid).toString() + '.json';
            if (navigator.sendBeacon) navigator.sendBeacon(url);
        }
    });

    // Prevent right-click on canvas
    document.addEventListener('contextmenu', (e) => {
        if (e.target.id === 'game-canvas') e.preventDefault();
    });

    console.log('TAG! Game initialized');
})();
