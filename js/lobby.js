/* ==========================================
   Lobby & Room Management
   ========================================== */

const Lobby = {
    currentRoom: null,
    roomListener: null,
    isHost: false,

    showCreateRoom() {
        document.getElementById('modal-create').classList.add('active');
    },

    showJoinRoom() {
        const modal = document.getElementById('modal-join');
        modal.classList.add('active');
        this.loadRooms();
    },

    async loadRooms() {
        const listEl = document.getElementById('room-list');
        listEl.innerHTML = '<p class="room-list-empty">Buscando salas...</p>';

        try {
            const snap = await db.ref('rooms').orderByChild('state').equalTo('waiting').once('value');
            const rooms = snap.val();

            if (!rooms || Object.keys(rooms).length === 0) {
                listEl.innerHTML = '<p class="room-list-empty">No hay salas disponibles</p>';
                return;
            }

            listEl.innerHTML = '';
            Object.entries(rooms).forEach(([id, room]) => {
                const playerCount = room.players ? Object.keys(room.players).length : 0;
                if (playerCount >= room.maxPlayers) return; // Full

                const item = document.createElement('div');
                item.className = 'room-item';
                item.innerHTML = `
                    <div class="room-item-info">
                        <h3>${this._escapeHtml(room.name)}</h3>
                        <p>${playerCount}/${room.maxPlayers} jugadores</p>
                    </div>
                    <button class="btn btn-primary btn-small" onclick="Lobby.joinRoom('${id}')">Unirse</button>
                `;
                listEl.appendChild(item);
            });

            if (listEl.children.length === 0) {
                listEl.innerHTML = '<p class="room-list-empty">No hay salas disponibles</p>';
            }
        } catch (err) {
            console.error('Error loading rooms:', err);
            listEl.innerHTML = '<p class="room-list-empty">Error al cargar salas</p>';
        }
    },

    async createRoom() {
        const nameInput = document.getElementById('room-name');
        const maxPlayersInput = document.getElementById('room-max-players');
        const name = nameInput.value.trim() || `Sala de ${Auth.username}`;
        const maxPlayers = Math.min(8, Math.max(2, parseInt(maxPlayersInput.value) || 4));
        const matchDuration = Math.min(600, Math.max(60, parseInt(document.getElementById('room-match-duration').value) || 180));

        const uid = Auth.currentUser.uid;
        const roomCode = this._generateCode();

        // Generate the map
        GameMap.generate();
        const mapData = GameMap.serialize();

        const roomData = {
            name: name,
            code: roomCode,
            hostId: uid,
            maxPlayers: maxPlayers,
            matchDuration: matchDuration,
            state: 'waiting',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            map: mapData,
            players: {
                [uid]: {
                    username: Auth.username,
                    color: this._randomColor(),
                    banner: Shop.selectedBanner || null,
                    ready: false,
                    x: 0, y: 0,
                    role: 'survivor'
                }
            }
        };

        try {
            const newRef = db.ref('rooms').push();
            await newRef.set(roomData);

            this.currentRoom = newRef.key;
            this.isHost = true;

            UI.closeModals();
            this._enterWaitingRoom(newRef.key, roomData);
        } catch (err) {
            console.error('Error creating room:', err);
        }
    },

    async joinRoom(roomId) {
        const uid = Auth.currentUser.uid;

        try {
            const snap = await db.ref('rooms/' + roomId).once('value');
            const room = snap.val();

            if (!room || room.state !== 'waiting') {
                alert('Esta sala ya no está disponible');
                return;
            }

            const playerCount = room.players ? Object.keys(room.players).length : 0;
            if (playerCount >= room.maxPlayers) {
                alert('La sala está llena');
                return;
            }

            // Add player to room
            await db.ref('rooms/' + roomId + '/players/' + uid).set({
                username: Auth.username,
                color: this._randomColor(),
                banner: Shop.selectedBanner || null,
                ready: false,
                x: 0, y: 0,
                role: 'survivor'
            });

            this.currentRoom = roomId;
            this.isHost = room.hostId === uid;

            UI.closeModals();
            this._enterWaitingRoom(roomId, room);
        } catch (err) {
            console.error('Error joining room:', err);
        }
    },

    _enterWaitingRoom(roomId, roomData) {
        UI.showScreen('waiting');

        document.getElementById('waiting-room-name').textContent = roomData.name;
        document.getElementById('waiting-room-code').textContent = roomData.code;

        // Show host controls
        const hostControls = document.getElementById('host-controls');
        hostControls.style.display = this.isHost ? 'block' : 'none';

        // Listen for player changes in this room
        const roomRef = db.ref('rooms/' + roomId);
        this.roomListener = roomRef.on('value', (snap) => {
            const data = snap.val();
            if (!data) {
                // Room was deleted
                this._handleRoomDeleted();
                return;
            }

            // Update player list
            this._updateWaitingPlayers(data.players || {}, data.hostId);

            // Update start button state
            const playerCount = Object.keys(data.players || {}).length;
            const startBtn = document.getElementById('btn-start-game');
            if (startBtn) {
                startBtn.disabled = playerCount < 2;
                if (playerCount < 2) {
                    startBtn.textContent = 'Necesitas al menos 2 jugadores';
                } else {
                    startBtn.textContent = `Iniciar Partida (${playerCount} jugadores)`;
                }

                // Max taggers
                const taggerInput = document.getElementById('tagger-count');
                if (taggerInput) {
                    taggerInput.max = Math.max(1, playerCount - 1);
                }
            }

            // Check if game has started (for non-host)
            if (data.state === 'playing' && !this.isHost) {
                roomRef.off('value', this.roomListener);
                this.roomListener = null;
                Game.start(roomId, data);
            }
        });
    },

    _updateWaitingPlayers(players, hostId) {
        const container = document.getElementById('waiting-players');
        container.innerHTML = '';

        const colors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];

        Object.entries(players).forEach(([uid, player], i) => {
            const div = document.createElement('div');
            div.className = 'waiting-player';
            const color = player.color || colors[i % colors.length];
            div.innerHTML = `
                <div class="waiting-player-avatar" style="background:${color}">${player.username[0].toUpperCase()}</div>
                <span class="waiting-player-name">${this._escapeHtml(player.username)}</span>
                ${uid === hostId ? '<span class="waiting-player-host">Host</span>' : ''}
            `;
            container.appendChild(div);
        });
    },

    async startGame() {
        if (!this.isHost || !this.currentRoom) return;

        const roomId = this.currentRoom;
        const snap = await db.ref('rooms/' + roomId).once('value');
        const room = snap.val();
        if (!room) return;

        const playerIds = Object.keys(room.players || {});
        if (playerIds.length < 2) return;

        const taggerCount = Math.min(
            parseInt(document.getElementById('tagger-count').value) || 1,
            playerIds.length - 1
        );

        // Randomly pick taggers
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
        const taggers = shuffled.slice(0, taggerCount);

        // Set roles and spawn positions
        const ts = GameMap.TILE_SIZE;
        const centerX = Math.floor(GameMap.WIDTH / 2) * ts;
        const groundY = (GameMap.HEIGHT - 4) * ts;

        // Tagger spawn points (edges of the map)
        const taggerSpawns = [
            { x: 4 * ts, y: groundY },
            { x: (GameMap.WIDTH - 5) * ts, y: groundY },
            { x: 15 * ts, y: groundY },
            { x: (GameMap.WIDTH - 16) * ts, y: groundY }
        ];

        const updates = {};
        let taggerIdx = 0;
        let survivorIdx = 0;

        playerIds.forEach((pid) => {
            const isTagger = taggers.includes(pid);
            let spawnX, spawnY;

            if (isTagger) {
                // Taggers spawn at edges
                const spawn = taggerSpawns[taggerIdx % taggerSpawns.length];
                spawnX = spawn.x;
                spawnY = spawn.y;
                taggerIdx++;
            } else {
                // Survivors spawn spread around center
                spawnX = centerX + (survivorIdx - (playerIds.length - taggerCount) / 2) * 50;
                spawnY = groundY;
                survivorIdx++;
            }

            updates[`players/${pid}/role`] = isTagger ? 'tagger' : 'survivor';
            updates[`players/${pid}/x`] = Math.round(spawnX);
            updates[`players/${pid}/y`] = spawnY;
            updates[`players/${pid}/immuneUntil`] = 0;
        });

        // Get match duration from host controls
        const matchDur = parseInt(document.getElementById('match-duration').value) || 180;

        updates['state'] = 'playing';
        updates['gameState'] = {
            phase: 'grace',
            graceEndTime: Date.now() + 20000,
            startTime: Date.now(),
            matchDuration: matchDur,
            taggerCount: taggerCount,
            taggers: taggers
        };

        await db.ref('rooms/' + roomId).update(updates);

        // Stop listening for waiting room changes
        if (this.roomListener) {
            db.ref('rooms/' + roomId).off('value', this.roomListener);
            this.roomListener = null;
        }

        // Start the game for the host too
        const updatedSnap = await db.ref('rooms/' + roomId).once('value');
        Game.start(roomId, updatedSnap.val());
    },

    async leaveRoom() {
        if (!this.currentRoom) return;

        const roomId = this.currentRoom;
        const uid = Auth.currentUser.uid;

        // Stop listening
        if (this.roomListener) {
            db.ref('rooms/' + roomId).off('value', this.roomListener);
            this.roomListener = null;
        }

        // Remove self from room
        await db.ref('rooms/' + roomId + '/players/' + uid).remove();

        // If host, delete room or transfer host
        if (this.isHost) {
            const snap = await db.ref('rooms/' + roomId + '/players').once('value');
            const remaining = snap.val();
            if (!remaining || Object.keys(remaining).length === 0) {
                await db.ref('rooms/' + roomId).remove();
            } else {
                // Transfer host
                const newHostId = Object.keys(remaining)[0];
                await db.ref('rooms/' + roomId + '/hostId').set(newHostId);
            }
        }

        this.currentRoom = null;
        this.isHost = false;
        UI.showScreen('lobby');
    },

    _handleRoomDeleted() {
        if (this.roomListener) {
            db.ref('rooms/' + this.currentRoom).off('value', this.roomListener);
            this.roomListener = null;
        }
        this.currentRoom = null;
        this.isHost = false;
        UI.showScreen('lobby');
        alert('La sala ha sido eliminada');
    },

    _generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    },

    _randomColor() {
        const colors = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
