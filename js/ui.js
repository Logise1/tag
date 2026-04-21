/* ==========================================
   UI Management
   ========================================== */

const UI = {
    screens: {},

    init() {
        this.screens = {
            loading: document.getElementById('loading-screen'),
            auth: document.getElementById('auth-screen'),
            lobby: document.getElementById('lobby-screen'),
            waiting: document.getElementById('waiting-screen'),
            game: document.getElementById('game-screen')
        };
        this.createParticles();
    },

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        const screen = this.screens[name];
        if (screen) {
            screen.classList.add('active');
        }
    },

    switchAuthTab(tab) {
        const loginTab = document.getElementById('tab-login');
        const registerTab = document.getElementById('tab-register');
        const submitBtn = document.getElementById('auth-submit');
        const errorEl = document.getElementById('auth-error');

        errorEl.textContent = '';

        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            submitBtn.textContent = 'Entrar';
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            submitBtn.textContent = 'Registrarse';
        }
    },

    getActiveTab() {
        return document.getElementById('tab-login').classList.contains('active') ? 'login' : 'register';
    },

    showError(message) {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = message;
    },

    closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    },

    showMessage(text, type = '', duration = 3000) {
        const msg = document.getElementById('game-message');
        msg.textContent = text;
        msg.className = 'hud-message visible';
        if (type) msg.classList.add(type);

        clearTimeout(this._messageTimeout);
        this._messageTimeout = setTimeout(() => {
            msg.classList.remove('visible');
        }, duration);
    },

    updateRole(role) {
        const roleEl = document.getElementById('game-role');
        roleEl.textContent = role === 'tagger' ? '🔴 LIGAS' : '🔵 SUPERVIVIENTE';
        roleEl.className = 'hud-role ' + role;
    },

    updateTimer(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('game-timer').textContent =
            `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
    },

    updatePlayerListHUD(players) {
        const container = document.getElementById('player-list-hud');
        container.innerHTML = '';
        Object.values(players).forEach(p => {
            const entry = document.createElement('div');
            entry.className = 'hud-player-entry';
            const dot = document.createElement('div');
            dot.className = 'hud-player-dot';
            dot.style.background = p.role === 'tagger' ? 'var(--tagger)' : 'var(--survivor)';
            const name = document.createElement('span');
            name.className = 'hud-player-name';
            name.textContent = p.username;
            entry.appendChild(dot);
            entry.appendChild(name);
            container.appendChild(entry);
        });
    },

    showCountdown(text) {
        const cd = document.getElementById('game-countdown');
        cd.innerHTML = `<div class="countdown-text">${text}</div>`;
        cd.classList.add('active');
    },

    showCountdownNumber(num) {
        const cd = document.getElementById('game-countdown');
        cd.innerHTML = `<div class="countdown-number">${num}</div>`;
        cd.classList.add('active');
    },

    hideCountdown() {
        document.getElementById('game-countdown').classList.remove('active');
    },

    createParticles() {
        const container = document.getElementById('auth-particles');
        if (!container) return;
        const colors = ['#7c3aed', '#a78bfa', '#f59e0b', '#3b82f6', '#10b981'];

        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'auth-particle';
            const size = Math.random() * 8 + 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.background = color;
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px');
            p.style.setProperty('--dy', (Math.random() - 0.5) * 200 + 'px');
            p.style.animationDuration = (Math.random() * 8 + 6) + 's';
            p.style.animationDelay = (Math.random() * 5) + 's';
            container.appendChild(p);
        }
    }
};
