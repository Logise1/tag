/* ==========================================
   Network - PeerJS for game data, RTDB for signaling
   ========================================== */

const Network = {
    peer: null,
    connections: {},       // peerId -> DataConnection
    peerUidMap: {},        // peerId -> uid
    uidPeerMap: {},        // uid -> peerId
    localPeerId: null,
    roomId: null,
    onPlayerState: null,   // callback(uid, stateData)
    onTagEvent: null,      // callback(tagData)
    syncInterval: null,
    SYNC_RATE: 50,
    rtdbListeners: [],
    _ready: false,

    async init(roomId) {
        this.roomId = roomId;
        this.connections = {};
        this.peerUidMap = {};
        this.uidPeerMap = {};
        this._ready = false;

        return new Promise((resolve, reject) => {
            this.peer = new Peer();

            this.peer.on('open', async (id) => {
                this.localPeerId = id;
                console.log('PeerJS open:', id);

                // Store peer ID in RTDB for discovery
                const uid = Auth.currentUser.uid;
                await db.ref(`rooms/${roomId}/peers/${uid}`).set(id);

                // Set up disconnect cleanup
                db.ref(`rooms/${roomId}/peers/${uid}`).onDisconnect().remove();

                // Watch for other peers
                this._watchPeers();

                this._ready = true;
                resolve();
            });

            // Handle incoming connections from other peers
            this.peer.on('connection', (conn) => {
                this._setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                // Don't reject - try to continue
            });

            // Timeout fallback
            setTimeout(() => {
                if (!this._ready) {
                    console.warn('PeerJS timeout, continuing...');
                    resolve();
                }
            }, 5000);
        });
    },

    _watchPeers() {
        const ref = db.ref(`rooms/${this.roomId}/peers`);
        const handler = ref.on('value', (snap) => {
            const peers = snap.val() || {};
            const uid = Auth.currentUser.uid;

            Object.entries(peers).forEach(([peerUid, peerId]) => {
                if (peerUid === uid) return;
                if (this.uidPeerMap[peerUid] === peerId) return;

                this.uidPeerMap[peerUid] = peerId;
                this.peerUidMap[peerId] = peerUid;

                // Connect to this peer
                console.log('Connecting to peer:', peerUid, peerId);
                const conn = this.peer.connect(peerId, { reliable: false });
                this._setupConnection(conn, peerUid);
            });
        });
        this.rtdbListeners.push({ ref, event: 'value', handler });
    },

    _setupConnection(conn, knownUid) {
        conn.on('open', () => {
            this.connections[conn.peer] = conn;
            if (knownUid) {
                this.peerUidMap[conn.peer] = knownUid;
            }
            console.log('Peer connected:', conn.peer);
        });

        conn.on('data', (msg) => {
            if (!msg || !msg.type) return;

            if (msg.type === 'state' && this.onPlayerState) {
                this.onPlayerState(msg.uid, msg.data);
                // Learn uid->peerId mapping
                if (msg.uid) {
                    this.peerUidMap[conn.peer] = msg.uid;
                    this.uidPeerMap[msg.uid] = conn.peer;
                }
            } else if (msg.type === 'tag' && this.onTagEvent) {
                this.onTagEvent(msg.data);
            } else if (msg.type === 'roleChange') {
                // Role update from tagger
                if (this.onRoleChange) {
                    this.onRoleChange(msg.data);
                }
            }
        });

        conn.on('close', () => {
            const uid = this.peerUidMap[conn.peer];
            delete this.connections[conn.peer];
            if (uid) {
                delete this.uidPeerMap[uid];
            }
            delete this.peerUidMap[conn.peer];
            console.log('Peer disconnected:', conn.peer);
        });

        conn.on('error', (err) => {
            console.warn('Connection error:', err);
        });
    },

    broadcast(message) {
        Object.values(this.connections).forEach(conn => {
            if (conn.open) {
                try {
                    conn.send(message);
                } catch (e) {
                    console.warn('Send error:', e);
                }
            }
        });
    },

    startSync(localPlayer) {
        if (this.syncInterval) clearInterval(this.syncInterval);

        const uid = Auth.currentUser.uid;
        this.syncInterval = setInterval(() => {
            if (localPlayer) {
                this.broadcast({
                    type: 'state',
                    uid: uid,
                    data: localPlayer.toNetworkData()
                });
            }
        }, this.SYNC_RATE);
    },

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    },

    broadcastTag(taggerId, taggerName, survivorId, survivorName) {
        this.broadcast({
            type: 'tag',
            data: {
                taggerId, taggerName,
                survivorId, survivorName,
                timestamp: Date.now()
            }
        });
    },

    broadcastRoleChange(playerId, newRole, immuneUntil) {
        this.broadcast({
            type: 'roleChange',
            data: { playerId, newRole, immuneUntil }
        });
    },

    // RTDB only for critical game state (phase changes)
    async updateGameState(state) {
        if (!this.roomId) return;
        await db.ref(`rooms/${this.roomId}/gameState`).update(state);
    },

    onGameStateChanged(callback) {
        if (!this.roomId) return;
        const ref = db.ref(`rooms/${this.roomId}/gameState`);
        const handler = ref.on('value', (snap) => {
            callback(snap.val());
        });
        this.rtdbListeners.push({ ref, event: 'value', handler });
    },

    // Listen for players joining/leaving via RTDB
    onPlayersListChanged(callback) {
        if (!this.roomId) return;
        const ref = db.ref(`rooms/${this.roomId}/players`);
        const handler = ref.on('value', (snap) => {
            callback(snap.val() || {});
        });
        this.rtdbListeners.push({ ref, event: 'value', handler });
    },

    async cleanup() {
        this.stopSync();

        // Remove peer ID from RTDB
        if (this.roomId && Auth.currentUser) {
            try {
                await db.ref(`rooms/${this.roomId}/peers/${Auth.currentUser.uid}`).remove();
            } catch (e) { /* ignore */ }
        }

        // Close all connections
        Object.values(this.connections).forEach(conn => {
            try { conn.close(); } catch (e) { /* ignore */ }
        });
        this.connections = {};

        // Destroy peer
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) { /* ignore */ }
            this.peer = null;
        }

        // Remove RTDB listeners
        for (const l of this.rtdbListeners) {
            l.ref.off(l.event, l.handler);
        }
        this.rtdbListeners = [];
        this.roomId = null;
        this._ready = false;
    },

    onRoleChange: null
};
