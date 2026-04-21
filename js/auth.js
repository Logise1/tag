/* ==========================================
   Authentication
   ========================================== */

const Auth = {
    currentUser: null,
    username: '',

    init() {
        const form = document.getElementById('auth-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                // Extract username from email
                this.username = user.email.replace(EMAIL_DOMAIN, '');
                document.getElementById('lobby-username').textContent = this.username;
                UI.showScreen('lobby');
            } else {
                this.currentUser = null;
                this.username = '';
                UI.showScreen('auth');
            }
        });
    },

    async handleSubmit() {
        const username = document.getElementById('auth-username').value.trim().toLowerCase();
        const password = document.getElementById('auth-password').value;
        const tab = UI.getActiveTab();

        if (!username || !password) {
            UI.showError('Rellena todos los campos');
            return;
        }

        if (username.length < 3) {
            UI.showError('El usuario debe tener al menos 3 caracteres');
            return;
        }

        if (password.length < 6) {
            UI.showError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        // Validate username (alphanumeric only)
        if (!/^[a-z0-9_]+$/.test(username)) {
            UI.showError('Solo letras, números y guiones bajos');
            return;
        }

        const email = username + EMAIL_DOMAIN;
        const submitBtn = document.getElementById('auth-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Cargando...';

        try {
            if (tab === 'register') {
                await auth.createUserWithEmailAndPassword(email, password);
                // Initialize user stats
                await db.ref('users/' + auth.currentUser.uid).set({
                    username: username,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    stats: {
                        gamesPlayed: 0,
                        tagsMade: 0,
                        timesTagged: 0,
                        timeSurvived: 0
                    }
                });
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
        } catch (error) {
            let msg = 'Error desconocido';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    msg = 'Ese usuario ya existe';
                    break;
                case 'auth/user-not-found':
                    msg = 'Usuario no encontrado';
                    break;
                case 'auth/wrong-password':
                    msg = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    msg = 'Usuario inválido';
                    break;
                case 'auth/weak-password':
                    msg = 'Contraseña muy débil (mín. 6 caracteres)';
                    break;
                case 'auth/too-many-requests':
                    msg = 'Demasiados intentos. Espera un momento';
                    break;
                case 'auth/invalid-credential':
                    msg = 'Usuario o contraseña incorrectos';
                    break;
                default:
                    msg = error.message;
            }
            UI.showError(msg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = tab === 'login' ? 'Entrar' : 'Registrarse';
        }
    },

    async logout() {
        // Leave any room first
        if (Lobby.currentRoom) {
            await Lobby.leaveRoom();
        }
        await auth.signOut();
    }
};
