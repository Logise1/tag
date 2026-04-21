/* ==========================================
   Map Generation - No Dead Ends
   ========================================== */

const GameMap = {
    WIDTH: 100,
    HEIGHT: 30,
    TILE_SIZE: 32,
    tiles: [],
    jumpPads: [],

    EMPTY: 0,
    SOLID: 1,
    JUMP_PAD: 2,
    PLATFORM: 3,

    generate() {
        this.tiles = [];
        this.jumpPads = [];

        // Initialize empty
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

        // Walls (only 1 thick, leave room for wall platforms)
        for (let y = 0; y < this.HEIGHT; y++) {
            this.tiles[y][0] = this.SOLID;
            this.tiles[y][this.WIDTH - 1] = this.SOLID;
        }

        // Ceiling
        for (let x = 0; x < this.WIDTH; x++) {
            this.tiles[0][x] = this.SOLID;
        }

        // Wall-hugging escape platforms (every 3 tiles on both sides)
        this._generateWallPlatforms();

        // Main platforms
        this._generatePlatforms();

        // Some structures for variety
        this._generateStructures();

        // Jump pads in strategic locations
        this._generateJumpPads();

        // Validate: ensure no enclosed areas
        this._addEscapeRoutes();

        return this.tiles;
    },

    _generateWallPlatforms() {
        // Left wall escape platforms
        for (let y = this.HEIGHT - 5; y >= 3; y -= 3) {
            const len = 2 + Math.floor(Math.random() * 2);
            for (let x = 1; x < 1 + len && x < this.WIDTH - 1; x++) {
                if (this.tiles[y][x] === this.EMPTY) {
                    this.tiles[y][x] = this.PLATFORM;
                }
            }
        }

        // Right wall escape platforms
        for (let y = this.HEIGHT - 5; y >= 3; y -= 3) {
            const len = 2 + Math.floor(Math.random() * 2);
            for (let x = this.WIDTH - 2; x > this.WIDTH - 2 - len && x > 0; x--) {
                if (this.tiles[y][x] === this.EMPTY) {
                    this.tiles[y][x] = this.PLATFORM;
                }
            }
        }
    },

    _generatePlatforms() {
        const layers = [
            { y: this.HEIGHT - 5,  minLen: 3, maxLen: 7, count: 10 },
            { y: this.HEIGHT - 8,  minLen: 3, maxLen: 6, count: 9 },
            { y: this.HEIGHT - 11, minLen: 2, maxLen: 6, count: 8 },
            { y: this.HEIGHT - 14, minLen: 2, maxLen: 5, count: 7 },
            { y: this.HEIGHT - 17, minLen: 2, maxLen: 5, count: 6 },
            { y: this.HEIGHT - 20, minLen: 2, maxLen: 4, count: 5 },
            { y: this.HEIGHT - 23, minLen: 2, maxLen: 4, count: 4 },
            { y: this.HEIGHT - 26, minLen: 2, maxLen: 3, count: 3 },
        ];

        for (const layer of layers) {
            for (let i = 0; i < layer.count; i++) {
                const len = Math.floor(Math.random() * (layer.maxLen - layer.minLen + 1)) + layer.minLen;
                const x = Math.floor(Math.random() * (this.WIDTH - len - 4)) + 2;
                const yOff = Math.floor(Math.random() * 2);
                const y = layer.y + yOff;

                if (y < 2 || y >= this.HEIGHT - 2) continue;

                for (let px = x; px < x + len && px < this.WIDTH - 1; px++) {
                    if (this.tiles[y][px] === this.EMPTY) {
                        this.tiles[y][px] = this.PLATFORM;
                    }
                }
            }
        }
    },

    _generateStructures() {
        // Small pillars (max 3 high to not trap)
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * (this.WIDTH - 10)) + 5;
            const h = Math.floor(Math.random() * 3) + 1;
            const baseY = this.HEIGHT - 3;
            for (let dy = 0; dy < h; dy++) {
                const ty = baseY - dy;
                if (ty >= 2 && this.tiles[ty][x] === this.EMPTY) {
                    this.tiles[ty][x] = this.SOLID;
                }
            }
        }

        // Floating solid blocks (small, never more than 2 wide)
        for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * (this.WIDTH - 8)) + 4;
            const y = Math.floor(Math.random() * (this.HEIGHT - 12)) + 5;
            const w = Math.floor(Math.random() * 2) + 1;
            for (let dx = 0; dx < w; dx++) {
                const tx = x + dx;
                if (tx < this.WIDTH - 1 && this.tiles[y][tx] === this.EMPTY) {
                    this.tiles[y][tx] = this.SOLID;
                }
            }
        }
    },

    _generateJumpPads() {
        this.jumpPads = [];

        // Near left wall
        this._placeJumpPad(2);
        this._placeJumpPad(3);

        // Near right wall
        this._placeJumpPad(this.WIDTH - 3);
        this._placeJumpPad(this.WIDTH - 4);

        // Scattered across the map
        const count = 10 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * (this.WIDTH - 6)) + 3;
            this._placeJumpPad(x);
        }
    },

    _placeJumpPad(x) {
        for (let y = this.HEIGHT - 3; y >= 3; y--) {
            if ((this.tiles[y][x] === this.SOLID || this.tiles[y][x] === this.PLATFORM) &&
                y - 1 >= 1 && this.tiles[y - 1][x] === this.EMPTY) {
                this.jumpPads.push({ x: x, y: y - 1 });
                this.tiles[y - 1][x] = this.JUMP_PAD;
                return;
            }
        }
    },

    _addEscapeRoutes() {
        // Scan for potential trapping areas and add platforms
        // Check bottom area along both walls
        for (let y = this.HEIGHT - 4; y >= 3; y -= 4) {
            // Left side - ensure there's a platform within 5 tiles of the wall
            let hasLeftPlatform = false;
            for (let x = 1; x <= 5; x++) {
                if (this.tiles[y][x] === this.PLATFORM || this.tiles[y][x] === this.JUMP_PAD) {
                    hasLeftPlatform = true;
                    break;
                }
            }
            if (!hasLeftPlatform) {
                this.tiles[y][2] = this.PLATFORM;
                this.tiles[y][3] = this.PLATFORM;
            }

            // Right side
            let hasRightPlatform = false;
            for (let x = this.WIDTH - 2; x >= this.WIDTH - 6; x--) {
                if (this.tiles[y][x] === this.PLATFORM || this.tiles[y][x] === this.JUMP_PAD) {
                    hasRightPlatform = true;
                    break;
                }
            }
            if (!hasRightPlatform) {
                this.tiles[y][this.WIDTH - 3] = this.PLATFORM;
                this.tiles[y][this.WIDTH - 4] = this.PLATFORM;
            }
        }

        // Ensure every 10-tile horizontal span has at least one reachable platform
        for (let startX = 2; startX < this.WIDTH - 2; startX += 8) {
            for (let baseY = this.HEIGHT - 6; baseY >= 5; baseY -= 5) {
                let hasPlatform = false;
                for (let x = startX; x < startX + 8 && x < this.WIDTH - 1; x++) {
                    for (let y = baseY; y < baseY + 4 && y < this.HEIGHT - 2; y++) {
                        if (this.tiles[y][x] === this.PLATFORM || this.tiles[y][x] === this.JUMP_PAD) {
                            hasPlatform = true;
                            break;
                        }
                    }
                    if (hasPlatform) break;
                }
                if (!hasPlatform) {
                    const px = startX + Math.floor(Math.random() * 4) + 2;
                    if (px < this.WIDTH - 1) {
                        this.tiles[baseY][px] = this.PLATFORM;
                        this.tiles[baseY][px + 1 < this.WIDTH - 1 ? px + 1 : px] = this.PLATFORM;
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
        const startCol = Math.max(0, Math.floor(camera.x / ts) - 1);
        const endCol = Math.min(this.WIDTH, Math.ceil((camera.x + camera.viewWidth) / ts) + 1);
        const startRow = Math.max(0, Math.floor(camera.y / ts) - 1);
        const endRow = Math.min(this.HEIGHT, Math.ceil((camera.y + camera.viewHeight) / ts) + 1);

        // Sky
        const grad = ctx.createLinearGradient(0, 0, 0, this.HEIGHT * ts);
        grad.addColorStop(0, '#0b0f1a');
        grad.addColorStop(0.4, '#0f1629');
        grad.addColorStop(1, '#151d30');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.WIDTH * ts, this.HEIGHT * ts);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                if (((x * 7 + y * 13) % 23) === 0) {
                    const sx = x * ts + ((x * 17 + y * 3) % ts);
                    const sy = y * ts + ((x * 11 + y * 7) % ts);
                    ctx.fillRect(sx, sy, ((x + y) % 3) + 1, ((x + y) % 3) + 1);
                }
            }
        }

        // Tiles
        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                const tile = this.tiles[y][x];
                const px = x * ts;
                const py = y * ts;

                if (tile === this.SOLID) this._renderSolid(ctx, px, py, ts, x, y);
                else if (tile === this.PLATFORM) this._renderPlatform(ctx, px, py, ts);
                else if (tile === this.JUMP_PAD) this._renderJumpPad(ctx, px, py, ts);
            }
        }
    },

    _renderSolid(ctx, px, py, ts, x, y) {
        const isTop = y === 0 || (this.tiles[y-1] && this.tiles[y-1][x] !== this.SOLID);
        ctx.fillStyle = isTop ? '#3d4f6f' : '#2a3650';
        ctx.fillRect(px, py, ts, ts);

        if (isTop) {
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(px, py, ts, 2);
        }

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(px + 1, py + 1, ts - 2, 1);
        ctx.fillRect(px + ts - 1, py + 1, 1, ts - 2);

        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        if (y % 2 === 0) ctx.fillRect(px + ts / 2, py, 1, ts);
        else ctx.fillRect(px, py + ts / 2, ts, 1);

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
    },

    _renderPlatform(ctx, px, py, ts) {
        ctx.fillStyle = '#5a7090';
        ctx.fillRect(px, py, ts, 6);
        ctx.fillStyle = '#7a90b0';
        ctx.fillRect(px, py, ts, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px, py + 6, ts, 2);
    },

    _renderJumpPad(ctx, px, py, ts) {
        const time = Date.now() * 0.004;
        const pulse = Math.sin(time) * 0.3 + 0.7;

        ctx.globalAlpha = pulse * 0.25;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px + ts/2, py + ts/2, ts * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 4, py + ts - 8, ts - 8, 8);

        ctx.fillStyle = '#fef3c7';
        const cx = px + ts / 2;
        ctx.beginPath();
        ctx.moveTo(cx, py + 6);
        ctx.lineTo(cx - 5, py + 13);
        ctx.lineTo(cx + 5, py + 13);
        ctx.closePath();
        ctx.fill();
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
