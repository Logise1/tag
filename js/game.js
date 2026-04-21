/* ==========================================
   Main Game Logic - Points, Timer, Leaderboard
   ========================================== */

const Game = {
    canvas: null,
    ctx: null,
    camera: null,
    localPlayer: null,
    players: {},
    roomId: null,
    roomData: null,
    running: false,
    lastTime: 0,
    gameTime: 0,
    phase: 'grace',
    graceEndTime: 0,
    startTime: 0,
    matchDuration: 180,       // seconds (default 3 min)
    matchEndTime: 0,
    processedTagEvents: new Set(),

    // Points system
    pointsTimer: 0,
    POINTS_INTERVAL: 1,       // 1 second

    async start(roomId, roomData) {
        this.roomId = roomId;
        this.roomData = roomData;
        this.running = true;
        this.processedTagEvents = new Set();
        this.pointsTimer = 0;

        // Canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.camera = new Camera();
        this._resize();
        window.addEventListener('resize', this._resizeHandler = () => this._resize());

        // Map
        if (roomData.map) {
            GameMap.deserialize(roomData.map);
        } else {
            GameMap.generate();
        }

        // Local player
        const uid = Auth.currentUser.uid;
        const myData = roomData.players[uid];
        const ts = GameMap.TILE_SIZE;

        this.localPlayer = new Player(
            uid,
            Auth.username,
            myData.x || (GameMap.WIDTH / 2) * ts,
            myData.y || (GameMap.HEIGHT - 4) * ts,
            myData.color
        );
        this.localPlayer.isLocal = true;
        this.localPlayer.role = myData.role || 'survivor';
        this.localPlayer.points = 0;
        this.localPlayer.banner = Shop.selectedBanner || null;
        this.localPlayer.font = Shop.selectedFont || 'outfit';

        // All players
        this.players = {};
        this.players[uid] = this.localPlayer;

        Object.entries(roomData.players).forEach(([pid, pData]) => {
            if (pid === uid) return;
            const p = new Player(pid, pData.username,
                pData.x || (GameMap.WIDTH / 2) * ts,
                pData.y || (GameMap.HEIGHT - 4) * ts,
                pData.color
            );
            p.role = pData.role || 'survivor';
            p.points = 0;
            this.players[pid] = p;
        });

        // Game state
        const gs = roomData.gameState || {};
        this.phase = gs.phase || 'grace';
        this.graceEndTime = gs.graceEndTime || (Date.now() + 20000);
        this.startTime = gs.startTime || Date.now();
        this.matchDuration = gs.matchDuration || 180;
        this.matchEndTime = this.startTime + (this.matchDuration * 1000) + 20000; // +20s grace

        // Grace = tagger frozen/blind
        if (this.phase === 'grace' && this.localPlayer.role === 'tagger') {
            this.localPlayer.frozen = true;
            this._showBlindOverlay(true);
        }

        // PeerJS
        await Network.init(roomId);

        Network.onPlayerState = (peerUid, stateData) => {
            this._handlePeerState(peerUid, stateData);
        };
        Network.onTagEvent = (tagData) => {
            this._handleTagEvent(tagData);
        };
        Network.onRoleChange = (data) => {
            this._handleRoleChange(data);
        };

        Network.startSync(this.localPlayer);

        // RTDB for phase changes only
        Network.onGameStateChanged((state) => {
            if (state) {
                if (state.phase && state.phase !== this.phase) {
                    this._onPhaseChange(state.phase);
                }
                this.graceEndTime = state.graceEndTime || this.graceEndTime;
            }
        });

        Network.onPlayersListChanged((playersData) => {
            this._syncPlayerList(playersData);
        });

        // Show game
        UI.showScreen('game');
        UI.updateRole(this.localPlayer.role);
        this._updatePointsDisplay();
        this._updateLeaderboard();

        if (this.localPlayer.role === 'survivor') {
            UI.showMessage('¡Tienes 20 segundos para escapar!', '', 5000);
        }

        Stats.addGame();

        // Hide end game overlay
        document.getElementById('end-game-overlay').classList.remove('active');

        // Game loop
        this.lastTime = performance.now();
        this._loop();
    },

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.camera) this.camera.resize(this.canvas.width, this.canvas.height);
    },

    _loop() {
        if (!this.running) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        this.gameTime += dt;

        this._update(dt);
        this._render();
        requestAnimationFrame(() => this._loop());
    },

    _update(dt) {
        this.localPlayer.update(dt);
        Object.values(this.players).forEach(p => {
            if (!p.isLocal) p.update(dt);
        });

        // Camera
        this.camera.follow(
            this.localPlayer.x,
            this.localPlayer.y + this.localPlayer.height / 2,
            GameMap.WIDTH, GameMap.HEIGHT, GameMap.TILE_SIZE
        );

        // Phase
        this._updatePhase();

        // Points scoring
        this._updatePoints(dt);

        // Match timer
        this._updateMatchTimer();

        // Tag collisions
        if (this.phase === 'active') {
            this._checkTagCollisions();
        }
    },

    // ── Points System ──────────────────────────────
    _updatePoints(dt) {
        if (this.phase !== 'active') return;

        this.pointsTimer += dt;
        if (this.pointsTimer >= this.POINTS_INTERVAL) {
            this.pointsTimer -= this.POINTS_INTERVAL;

            if (this.localPlayer.role === 'survivor') {
                this.localPlayer.points += 1;
            } else {
                this.localPlayer.points = Math.max(0, this.localPlayer.points - 1);
            }

            this._updatePointsDisplay();
            this._updateLeaderboard();
        }
    },

    _updatePointsDisplay() {
        const el = document.getElementById('pts-value');
        const container = document.getElementById('game-points');
        if (el) el.textContent = this.localPlayer.points;
        if (container) {
            container.classList.remove('gaining', 'losing');
            if (this.phase === 'active') {
                container.classList.add(this.localPlayer.role === 'survivor' ? 'gaining' : 'losing');
            }
        }
    },

    _updateLeaderboard() {
        const entries = document.getElementById('leaderboard-entries');
        if (!entries) return;

        const sorted = Object.values(this.players)
            .sort((a, b) => b.points - a.points);

        const uid = Auth.currentUser.uid;
        entries.innerHTML = '';

        sorted.forEach((p, i) => {
            const div = document.createElement('div');
            div.className = 'hud-lb-entry' + (p.id === uid ? ' is-me' : '');
            const rankClass = i < 3 ? ` rank-${i+1}` : '';
            const bannerUrl = p.banner ? Shop.getBannerUrl(p.banner) : null;
            const fontFamily = Shop.getFontFamily(p.font || 'outfit');

            let bgHtml = '';
            if (bannerUrl) {
                bgHtml = `<div class="hud-lb-namecard-bg" style="background-image:url('${bannerUrl}')"></div>`;
            } else {
                const c = p.color || '#3b82f6';
                bgHtml = `<div class="hud-lb-namecard-nobg" style="background:${c}22;border:1px solid ${c}44;border-radius:4px"></div>`;
            }

            div.innerHTML = `
                <span class="hud-lb-rank${rankClass}">${i+1}</span>
                <div class="hud-lb-namecard">
                    ${bgHtml}
                    <span class="hud-lb-name" style="font-family:${fontFamily}">${p.username}</span>
                </div>
                <span class="hud-lb-pts">${p.points}</span>
            `;
            entries.appendChild(div);
        });
    },

    // ── Match Timer ────────────────────────────────
    _updateMatchTimer() {
        const remaining = Math.max(0, Math.ceil((this.matchEndTime - Date.now()) / 1000));

        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        document.getElementById('game-timer').textContent =
            `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;

        // End game
        if (remaining <= 0 && this.phase === 'active') {
            this._endGame();
        }

        // Warning at 30s
        if (remaining === 30 && this.phase === 'active') {
            UI.showMessage('⚠️ ¡30 segundos restantes!', 'tag-swap', 3000);
        }
        if (remaining === 10 && this.phase === 'active') {
            UI.showMessage('⚠️ ¡10 segundos!', 'tag-swap', 2000);
        }
    },

    // ── End Game ───────────────────────────────────
    _endGame() {
        if (this.phase === 'ended') return;
        this.phase = 'ended';

        // Calculate coins earned: floor(points / 8)
        const myPoints = this.localPlayer.points;
        const coinsEarned = Math.floor(myPoints / 8);

        // Save coins to Firebase
        if (coinsEarned > 0) {
            Stats.addCoins(coinsEarned);
        }

        // Build final standings
        const sorted = Object.values(this.players)
            .sort((a, b) => b.points - a.points);

        const uid = Auth.currentUser.uid;
        const listEl = document.getElementById('end-game-list');
        listEl.innerHTML = '';

        sorted.forEach((p, i) => {
            const pCoins = Math.floor(p.points / 8);
            const isMe = p.id === uid;
            const posClass = i < 3 ? ` pos-${i+1}` : '';
            const bannerUrl = p.banner ? Shop.getBannerUrl(p.banner) : null;
            const fontFamily = Shop.getFontFamily(p.font || 'outfit');

            let bgHtml = '';
            if (bannerUrl) {
                bgHtml = `<div class="end-rank-namecard-bg" style="background-image:url('${bannerUrl}')"></div>`;
            }

            const div = document.createElement('div');
            div.className = 'end-rank-entry' + (isMe ? ' is-me' : '');
            div.innerHTML = `
                <span class="end-rank-pos${posClass}">#${i+1}</span>
                <div class="end-rank-namecard">
                    ${bgHtml}
                    <span class="end-rank-name" style="font-family:${fontFamily}">${p.username}</span>
                </div>
                <span class="end-rank-pts">⭐ ${p.points}</span>
                <span class="end-rank-coins">🪙 +${pCoins}</span>
            `;
            listEl.appendChild(div);
        });

        document.getElementById('end-coins-earned').textContent = coinsEarned;
        document.getElementById('end-game-overlay').classList.add('active');

        // Update game state in RTDB
        if (Lobby.isHost) {
            Network.updateGameState({ phase: 'ended' });
        }
    },

    async backToLobby() {
        await this.leave();
    },

    // ── Phase Management ───────────────────────────
    _updatePhase() {
        if (this.phase !== 'grace') return;

        const remaining = Math.ceil((this.graceEndTime - Date.now()) / 1000);

        if (this.localPlayer.role === 'tagger') {
            const timerEl = document.getElementById('blind-timer');
            if (timerEl) timerEl.textContent = Math.max(0, remaining);
        }

        if (remaining <= 5 && remaining > 0 && this.localPlayer.role === 'survivor') {
            UI.showCountdownNumber(remaining);
        }

        if (remaining <= 0) {
            if (Lobby.isHost) {
                Network.updateGameState({ phase: 'active' });
            }
            this._onPhaseChange('active');
        }
    },

    _onPhaseChange(newPhase) {
        if (this.phase === newPhase) return;
        this.phase = newPhase;

        if (newPhase === 'active') {
            this.localPlayer.frozen = false;
            this._showBlindOverlay(false);
            UI.hideCountdown();

            if (this.localPlayer.role === 'tagger') {
                UI.showMessage('¡A pillar! 🏃', 'tag-swap', 3000);
            } else {
                UI.showMessage('¡Los que ligan ya pueden verte!', 'tag-swap', 3000);
            }
        } else if (newPhase === 'ended') {
            this._endGame();
        }
    },

    _showBlindOverlay(show) {
        const el = document.getElementById('tagger-blind');
        if (el) {
            if (show) el.classList.add('active');
            else el.classList.remove('active');
        }
    },

    // ── Tag Collisions ─────────────────────────────
    _checkTagCollisions() {
        const uid = Auth.currentUser.uid;
        const local = this.localPlayer;
        if (local.role !== 'tagger' || local.isImmune()) return;

        Object.values(this.players).forEach(other => {
            if (other.id === uid) return;
            if (other.role !== 'survivor' || other.isImmune()) return;

            if (local.collidesWith(other)) {
                this._performTag(local, other);
            }
        });
    },

    _performTag(tagger, survivor) {
        const immuneDuration = 3000;
        tagger.setImmune(immuneDuration);
        survivor.setImmune(immuneDuration);
        tagger.role = 'survivor';
        survivor.role = 'tagger';

        Network.broadcastTag(tagger.id, tagger.username, survivor.id, survivor.username);
        Network.broadcastRoleChange(tagger.id, 'survivor', tagger.immuneUntil);
        Network.broadcastRoleChange(survivor.id, 'tagger', survivor.immuneUntil);

        if (tagger.isLocal) {
            UI.updateRole('survivor');
            Stats.addTag();
        }

        UI.showMessage(
            `⚡ ${tagger.username} pilló a ${survivor.username} → ¡${survivor.username} liga!`,
            'tag-swap', 4000
        );
    },

    // ── Network Handlers ───────────────────────────
    _handlePeerState(peerUid, stateData) {
        if (peerUid === Auth.currentUser.uid) return;

        if (this.players[peerUid]) {
            const p = this.players[peerUid];
            p.targetX = stateData.x !== undefined ? stateData.x : p.targetX;
            p.targetY = stateData.y !== undefined ? stateData.y : p.targetY;
            p.role = stateData.role || p.role;
            p.facing = stateData.facing || p.facing;
            p.immuneUntil = stateData.immuneUntil || 0;
            if (stateData.points !== undefined) p.points = stateData.points;
            if (stateData.banner !== undefined) p.banner = stateData.banner;
            if (stateData.font !== undefined) p.font = stateData.font;
        } else {
            const p = new Player(peerUid, stateData.username || 'Player',
                stateData.x || 0, stateData.y || 0, stateData.color);
            p.role = stateData.role || 'survivor';
            p.points = stateData.points || 0;
            p.banner = stateData.banner || null;
            p.font = stateData.font || 'outfit';
            this.players[peerUid] = p;
        }
    },

    _handleTagEvent(tagData) {
        const key = `${tagData.taggerId}-${tagData.survivorId}-${tagData.timestamp}`;
        if (this.processedTagEvents.has(key)) return;
        this.processedTagEvents.add(key);

        UI.showMessage(
            `⚡ ${tagData.taggerName} pilló a ${tagData.survivorName} → ¡${tagData.survivorName} liga!`,
            'tag-swap', 4000
        );
    },

    _handleRoleChange(data) {
        const { playerId, newRole, immuneUntil } = data;
        if (playerId === Auth.currentUser.uid) {
            this.localPlayer.role = newRole;
            this.localPlayer.immuneUntil = immuneUntil || 0;
            UI.updateRole(newRole);
            if (newRole === 'tagger') Stats.addTagged();
        } else if (this.players[playerId]) {
            this.players[playerId].role = newRole;
            this.players[playerId].immuneUntil = immuneUntil || 0;
        }
    },

    _syncPlayerList(playersData) {
        const uid = Auth.currentUser.uid;
        const activeIds = Object.keys(playersData);

        activeIds.forEach(pid => {
            if (pid === uid) return;
            if (!this.players[pid]) {
                const pData = playersData[pid];
                const p = new Player(pid, pData.username, pData.x || 0, pData.y || 0, pData.color);
                p.role = pData.role || 'survivor';
                this.players[pid] = p;
            }
        });

        Object.keys(this.players).forEach(pid => {
            if (pid !== uid && !activeIds.includes(pid)) {
                delete this.players[pid];
            }
        });

        UI.updatePlayerListHUD(this.players);
        this._updateLeaderboard();
    },

    // ── Render ─────────────────────────────────────
    _render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        this.camera.apply(ctx);

        GameMap.render(ctx, this.camera);

        Object.values(this.players).forEach(p => {
            if (!p.isLocal) p.render(ctx);
        });
        this.localPlayer.render(ctx);

        ctx.restore();
    },

    // ── Leave ──────────────────────────────────────
    async leave() {
        this.running = false;
        window.removeEventListener('resize', this._resizeHandler);

        await Network.cleanup();

        const uid = Auth.currentUser.uid;
        try {
            await db.ref('rooms/' + this.roomId + '/players/' + uid).remove();
            const snap = await db.ref('rooms/' + this.roomId + '/players').once('value');
            const remaining = snap.val();
            if (!remaining || Object.keys(remaining).length === 0) {
                await db.ref('rooms/' + this.roomId).remove();
            }
        } catch (e) { /* ignore */ }

        this.players = {};
        this.localPlayer = null;
        this.roomId = null;
        this.phase = 'grace';
        Lobby.currentRoom = null;
        Lobby.isHost = false;

        this._showBlindOverlay(false);
        UI.hideCountdown();
        document.getElementById('end-game-overlay').classList.remove('active');

        // Refresh coins in lobby
        Stats.refreshCoins();

        UI.showScreen('lobby');
    }
};
