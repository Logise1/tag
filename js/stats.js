/* ==========================================
   Player Statistics & Coins
   ========================================== */

const Stats = {
    async show() {
        if (!Auth.currentUser) return;

        const modal = document.getElementById('modal-stats');
        modal.classList.add('active');

        try {
            const snap = await db.ref('users/' + Auth.currentUser.uid + '/stats').once('value');
            const stats = snap.val() || {};

            document.getElementById('stat-games').textContent = stats.gamesPlayed || 0;
            document.getElementById('stat-tags').textContent = stats.tagsMade || 0;
            document.getElementById('stat-tagged').textContent = stats.timesTagged || 0;
            document.getElementById('stat-coins').textContent = stats.coins || 0;
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    },

    async addGame() {
        if (!Auth.currentUser) return;
        await db.ref('users/' + Auth.currentUser.uid + '/stats/gamesPlayed')
            .transaction(v => (v || 0) + 1);
    },

    async addTag() {
        if (!Auth.currentUser) return;
        await db.ref('users/' + Auth.currentUser.uid + '/stats/tagsMade')
            .transaction(v => (v || 0) + 1);
    },

    async addTagged() {
        if (!Auth.currentUser) return;
        await db.ref('users/' + Auth.currentUser.uid + '/stats/timesTagged')
            .transaction(v => (v || 0) + 1);
    },

    async addCoins(amount) {
        if (!Auth.currentUser || amount <= 0) return;
        await db.ref('users/' + Auth.currentUser.uid + '/stats/coins')
            .transaction(v => (v || 0) + amount);
    },

    async getCoins() {
        if (!Auth.currentUser) return 0;
        const snap = await db.ref('users/' + Auth.currentUser.uid + '/stats/coins').once('value');
        return snap.val() || 0;
    },

    async refreshCoins() {
        const coins = await this.getCoins();
        const el = document.getElementById('lobby-coins');
        if (el) el.textContent = `🪙 ${coins}`;
    }
};
