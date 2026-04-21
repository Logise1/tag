/* ==========================================
   Map Generation - Clean Block Style
   ========================================== */

const GameMap = {
    WIDTH: 100,
    HEIGHT: 30,
    TILE_SIZE: 32,
    tiles: [],
    jumpPads: [],

    // Tile types
    EMPTY: 0,
    SOLID: 1,
    JUMP_PAD: 2,
    PLATFORM: 3,

    generate() {
        this.tiles = [];
        this.jumpPads = [];

        // Initialize empty map
        for (let y = 0; y < this.HEIGHT; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.WIDTH; x++) {
                this.tiles[y][x] = this.EMPTY;
            }
        }

        // Ground (bottom 2 rows)
        for (let x = 0; x < this.WIDTH; x++) {
            this.tiles[this.HEIGHT - 1][x] = this.SOLID;
            this.tiles[this.HEIGHT - 2][x] = this.SOLID;
        }

        // Walls
        for (let y = 0; y < this.HEIGHT; y++) {
            this.tiles[y][0] = this.SOLID;
            this.tiles[y][1] = this.SOLID;
            this.tiles[y][this.WIDTH - 1] = this.SOLID;
            this.tiles[y][this.WIDTH - 2] = this.SOLID;
        }

        // Generate platforms
        this._generatePlatforms();

        // Pillars and structures
        this._generateStructures();

        // Jump pads
        this._generateJumpPads();

        return this.tiles;
    },

    _generatePlatforms() {
        const layers = [
            { y: this.HEIGHT - 5,  minLen: 3, maxLen: 8, count: 9 },
            { y: this.HEIGHT - 8,  minLen: 3, maxLen: 7, count: 8 },
            { y: this.HEIGHT - 11, minLen: 2, maxLen: 6, count: 7 },
            { y: this.HEIGHT - 14, minLen: 2, maxLen: 5, count: 6 },
            { y: this.HEIGHT - 17, minLen: 2, maxLen: 5, count: 5 },
            { y: this.HEIGHT - 20, minLen: 2, maxLen: 4, count: 4 },
            { y: this.HEIGHT - 23, minLen: 2, maxLen: 4, count: 3 },
        ];

        for (const layer of layers) {
            for (let i = 0; i < layer.count; i++) {
                const len = Math.floor(Math.random() * (layer.maxLen - layer.minLen + 1)) + layer.minLen;
                const x = Math.floor(Math.random() * (this.WIDTH - len - 6)) + 3;
                const yOff = Math.floor(Math.random() * 3) - 1;
                const y = layer.y + yOff;

                if (y < 2 || y >= this.HEIGHT - 2) continue;

                for (let px = x; px < x + len && px < this.WIDTH - 2; px++) {
                    if (this.tiles[y][px] === this.EMPTY) {
                        this.tiles[y][px] = this.PLATFORM;
                    }
                }
            }
        }
    },

    _generateStructures() {
        // Pillars
        for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * (this.WIDTH - 10)) + 5;
            const h = Math.floor(Math.random() * 4) + 2;
            const baseY = this.HEIGHT - 3;
            for (let dy = 0; dy < h; dy++) {
                const ty = baseY - dy;
                if (ty >= 2) {
                    if (this.tiles[ty][x] === this.EMPTY) this.tiles[ty][x] = this.SOLID;
                    if (x + 1 < this.WIDTH - 2 && this.tiles[ty][x+1] === this.EMPTY) {
                        this.tiles[ty][x+1] = this.SOLID;
                    }
                }
            }
        }

        // Floating solid blocks
        for (let i = 0; i < 12; i++) {
            const x = Math.floor(Math.random() * (this.WIDTH - 8)) + 4;
            const y = Math.floor(Math.random() * (this.HEIGHT - 10)) + 4;
            const w = Math.floor(Math.random() * 3) + 1;
            for (let dx = 0; dx < w; dx++) {
                const tx = x + dx;
                if (tx < this.WIDTH - 2 && this.tiles[y][tx] === this.EMPTY) {
                    this.tiles[y][tx] = this.SOLID;
                }
            }
        }

        // Stairs
        for (let i = 0; i < 3; i++) {
            const startX = Math.floor(Math.random() * (this.WIDTH - 15)) + 4;
            const startY = this.HEIGHT - 3;
            const dir = Math.random() > 0.5 ? 1 : -1;
            const steps = Math.floor(Math.random() * 4) + 3;

            for (let s = 0; s < steps; s++) {
                const sx = startX + s * dir * 2;
                const sy = startY - s;
                if (sx >= 2 && sx < this.WIDTH - 2 && sy >= 2) {
                    if (this.tiles[sy][sx] === this.EMPTY) this.tiles[sy][sx] = this.SOLID;
                    const nx = sx + dir;
                    if (nx >= 2 && nx < this.WIDTH - 2 && this.tiles[sy][nx] === this.EMPTY) {
                        this.tiles[sy][nx] = this.SOLID;
                    }
                }
            }
        }
    },

    _generateJumpPads() {
        const count = 8 + Math.floor(Math.random() * 4);
        this.jumpPads = [];

        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * (this.WIDTH - 8)) + 4;

            for (let y = this.HEIGHT - 3; y >= 4; y--) {
                if (this.tiles[y][x] === this.SOLID || this.tiles[y][x] === this.PLATFORM) {
                    if (y - 1 >= 0 && this.tiles[y-1][x] === this.EMPTY) {
                        this.jumpPads.push({ x: x, y: y - 1 });
                        this.tiles[y-1][x] = this.JUMP_PAD;
                        break;
                    }
                }
            }
        }
    },

    isSolid(tileX, tileY) {
        if (tileX < 0 || tileX >= this.WIDTH || tileY < 0 || tileY >= this.HEIGHT) return true;
        return this.tiles[tileY][tileX] === this.SOLID;
    },

    isPlatform(tileX, tileY) {
        if (tileX < 0 || tileX >= this.WIDTH || tileY < 0 || tileY >= this.HEIGHT) return false;
        return this.tiles[tileY][tileX] === this.PLATFORM;
    },

    isJumpPad(tileX, tileY) {
        if (tileX < 0 || tileX >= this.WIDTH || tileY < 0 || tileY >= this.HEIGHT) return false;
        return this.tiles[tileY][tileX] === this.JUMP_PAD;
    },

    render(ctx, camera) {
        const ts = this.TILE_SIZE;

        // Visible range
        const startCol = Math.max(0, Math.floor(camera.x / ts) - 1);
        const endCol = Math.min(this.WIDTH, Math.ceil((camera.x + camera.viewWidth) / ts) + 1);
        const startRow = Math.max(0, Math.floor(camera.y / ts) - 1);
        const endRow = Math.min(this.HEIGHT, Math.ceil((camera.y + camera.viewHeight) / ts) + 1);

        // Sky background
        const grad = ctx.createLinearGradient(0, 0, 0, this.HEIGHT * ts);
        grad.addColorStop(0, '#0b0f1a');
        grad.addColorStop(0.4, '#0f1629');
        grad.addColorStop(1, '#151d30');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.WIDTH * ts, this.HEIGHT * ts);

        // Stars (static dots in background)
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                // Deterministic pseudo-random stars
                if (((x * 7 + y * 13) % 23) === 0) {
                    const sx = x * ts + ((x * 17 + y * 3) % ts);
                    const sy = y * ts + ((x * 11 + y * 7) % ts);
                    const size = ((x + y) % 3) + 1;
                    ctx.fillRect(sx, sy, size, size);
                }
            }
        }

        // Render tiles
        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                const tile = this.tiles[y][x];
                const px = x * ts;
                const py = y * ts;

                if (tile === this.SOLID) {
                    this._renderSolid(ctx, px, py, ts, x, y);
                } else if (tile === this.PLATFORM) {
                    this._renderPlatform(ctx, px, py, ts);
                } else if (tile === this.JUMP_PAD) {
                    this._renderJumpPad(ctx, px, py, ts);
                }
            }
        }
    },

    _renderSolid(ctx, px, py, ts, x, y) {
        // Main block
        const isTop = y === 0 || this.tiles[y-1] && this.tiles[y-1][x] !== this.SOLID;
        const baseColor = isTop ? '#3d4f6f' : '#2a3650';
        ctx.fillStyle = baseColor;
        ctx.fillRect(px, py, ts, ts);

        // Top highlight
        if (isTop) {
            ctx.fillStyle = '#56708f';
            ctx.fillRect(px, py, ts, 3);
            // Grass-like top edge
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(px, py, ts, 2);
        }

        // Inner detail lines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(px + 1, py + 1, ts - 2, 1);
        ctx.fillRect(px + 1, py + ts - 1, ts - 2, 1);
        ctx.fillRect(px + ts - 1, py + 1, 1, ts - 2);

        // Subtle brick pattern
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        if (y % 2 === 0) {
            ctx.fillRect(px + ts / 2, py, 1, ts);
        } else {
            ctx.fillRect(px, py + ts / 2, ts, 1);
        }

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
    },

    _renderPlatform(ctx, px, py, ts) {
        // Thin solid platform
        ctx.fillStyle = '#5a7090';
        ctx.fillRect(px, py, ts, 6);
        // Top highlight
        ctx.fillStyle = '#7a90b0';
        ctx.fillRect(px, py, ts, 2);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px, py + 6, ts, 2);
    },

    _renderJumpPad(ctx, px, py, ts) {
        const time = Date.now() * 0.004;
        const pulse = Math.sin(time) * 0.3 + 0.7;

        // Glow circle
        ctx.globalAlpha = pulse * 0.25;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px + ts/2, py + ts/2, ts * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Pad base
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 4, py + ts - 8, ts - 8, 8);

        // Chevron arrows
        ctx.fillStyle = '#fef3c7';
        const cx = px + ts / 2;
        // Arrow 1
        ctx.beginPath();
        ctx.moveTo(cx, py + 6);
        ctx.lineTo(cx - 5, py + 13);
        ctx.lineTo(cx + 5, py + 13);
        ctx.closePath();
        ctx.fill();
        // Arrow 2
        ctx.beginPath();
        ctx.moveTo(cx, py + 13);
        ctx.lineTo(cx - 4, py + 19);
        ctx.lineTo(cx + 4, py + 19);
        ctx.closePath();
        ctx.fill();
    },

    serialize() {
        const data = [];
        for (let y = 0; y < this.HEIGHT; y++) {
            data.push(this.tiles[y].join(''));
        }
        return data;
    },

    deserialize(data) {
        this.tiles = [];
        this.jumpPads = [];
        for (let y = 0; y < this.HEIGHT; y++) {
            this.tiles[y] = [];
            const row = data[y];
            for (let x = 0; x < this.WIDTH; x++) {
                const val = parseInt(row[x]) || 0;
                this.tiles[y][x] = val;
                if (val === this.JUMP_PAD) {
                    this.jumpPads.push({ x, y });
                }
            }
        }
    }
};
