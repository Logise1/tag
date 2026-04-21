/* ==========================================
   Player - Square Blob Character
   ========================================== */

class Player {
    constructor(id, username, x, y, color) {
        this.id = id;
        this.username = username;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color || '#3b82f6';
        this.width = 22;
        this.height = 22;
        this.role = 'survivor';
        this.isLocal = false;
        this.onGround = false;
        this.facing = 1;
        this.immuneUntil = 0;
        this.frozen = false; // For grace period taggers
        this.lastSync = 0;

        // Physics
        this.speed = 190;
        this.jumpForce = -400;
        this.gravity = 950;
        this.jumpPadForce = -620;
        this.friction = 0.82;
        this.maxFallSpeed = 600;

        // Animation
        this.animTimer = 0;
        this.squash = 1.0;      // Squash/stretch
        this.targetSquash = 1.0;
        this.eyeBlink = 0;
        this.blinkTimer = 0;
        this.bounceY = 0;
        this.isMoving = false;
        this.wasOnGround = false;

        // Interpolation for remote players
        this.targetX = x;
        this.targetY = y;
        this.interpSpeed = 0.25;
    }

    update(dt) {
        if (this.isLocal) {
            this._updateLocal(dt);
        } else {
            this._updateRemote(dt);
        }

        // Squash animation
        this.squash += (this.targetSquash - this.squash) * 0.15;
        this.targetSquash += (1.0 - this.targetSquash) * 0.1;

        // Blink timer
        this.blinkTimer += dt;
        if (this.blinkTimer > 3 + Math.random() * 2) {
            this.eyeBlink = 1;
            this.blinkTimer = 0;
        }
        if (this.eyeBlink > 0) {
            this.eyeBlink -= dt * 8;
            if (this.eyeBlink < 0) this.eyeBlink = 0;
        }

        // Bounce animation when moving
        this.animTimer += dt;
        if (this.isMoving && this.onGround) {
            this.bounceY = Math.sin(this.animTimer * 12) * 2;
        } else {
            this.bounceY *= 0.9;
        }
    }

    _updateLocal(dt) {
        if (this.frozen) return; // Can't move during grace period

        let moveX = 0;
        if (Input.left) moveX -= 1;
        if (Input.right) moveX += 1;

        if (moveX !== 0) {
            this.vx = moveX * this.speed;
            this.facing = moveX;
            this.isMoving = true;
        } else {
            this.vx *= this.friction;
            if (Math.abs(this.vx) < 5) this.vx = 0;
            this.isMoving = Math.abs(this.vx) > 5;
        }

        // Jump
        if (Input.up && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false;
            this.targetSquash = 1.3; // Stretch when jumping
        }

        // Gravity
        this.vy += this.gravity * dt;
        if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;

        this.wasOnGround = this.onGround;
        this._moveAndCollide(dt);

        // Landing squash
        if (this.onGround && !this.wasOnGround) {
            this.targetSquash = 0.7;
        }

        this._checkJumpPads();
    }

    _updateRemote(dt) {
        this.x += (this.targetX - this.x) * this.interpSpeed;
        this.y += (this.targetY - this.y) * this.interpSpeed;

        this.isMoving = Math.abs(this.targetX - this.x) > 2;
        if (this.isMoving) {
            this.facing = this.targetX > this.x ? 1 : -1;
        }
    }

    _moveAndCollide(dt) {
        const ts = GameMap.TILE_SIZE;

        // Horizontal
        const newX = this.x + this.vx * dt;
        const left = Math.floor((newX - this.width / 2) / ts);
        const right = Math.floor((newX + this.width / 2 - 1) / ts);
        const topT = Math.floor(this.y / ts);
        const botT = Math.floor((this.y + this.height - 1) / ts);

        let canMoveX = true;
        for (let ty = topT; ty <= botT; ty++) {
            if (this.vx > 0 && GameMap.isSolid(right, ty)) {
                this.x = right * ts - this.width / 2 - 0.01;
                this.vx = 0;
                canMoveX = false;
                break;
            }
            if (this.vx < 0 && GameMap.isSolid(left, ty)) {
                this.x = (left + 1) * ts + this.width / 2 + 0.01;
                this.vx = 0;
                canMoveX = false;
                break;
            }
        }
        if (canMoveX) this.x = newX;

        // Vertical
        const newY = this.y + this.vy * dt;
        const leftT = Math.floor((this.x - this.width / 2) / ts);
        const rightT = Math.floor((this.x + this.width / 2 - 1) / ts);
        const newTop = Math.floor(newY / ts);
        const newBot = Math.floor((newY + this.height - 1) / ts);

        this.onGround = false;

        if (this.vy > 0) {
            for (let tx = leftT; tx <= rightT; tx++) {
                if (GameMap.isSolid(tx, newBot)) {
                    this.y = newBot * ts - this.height;
                    this.vy = 0;
                    this.onGround = true;
                    return;
                }
                if (GameMap.isPlatform(tx, newBot)) {
                    const curBot = Math.floor((this.y + this.height - 1) / ts);
                    if (curBot < newBot) {
                        this.y = newBot * ts - this.height;
                        this.vy = 0;
                        this.onGround = true;
                        return;
                    }
                }
            }
            this.y = newY;
        } else if (this.vy < 0) {
            for (let tx = leftT; tx <= rightT; tx++) {
                if (GameMap.isSolid(tx, newTop)) {
                    this.y = (newTop + 1) * ts + 0.01;
                    this.vy = 0;
                    return;
                }
            }
            this.y = newY;
        } else {
            this.y = newY;
        }

        // Ground check
        const belowBot = Math.floor((this.y + this.height + 1) / ts);
        for (let tx = leftT; tx <= rightT; tx++) {
            if (GameMap.isSolid(tx, belowBot) || GameMap.isPlatform(tx, belowBot)) {
                this.onGround = true;
                break;
            }
        }
    }

    _checkJumpPads() {
        const ts = GameMap.TILE_SIZE;
        const cx = Math.floor(this.x / ts);
        const cy = Math.floor((this.y + this.height - 4) / ts);

        if (GameMap.isJumpPad(cx, cy) && this.vy >= 0) {
            this.vy = this.jumpPadForce;
            this.onGround = false;
            this.targetSquash = 1.4;
        }
    }

    isImmune() {
        return Date.now() < this.immuneUntil;
    }

    setImmune(durationMs) {
        this.immuneUntil = Date.now() + durationMs;
    }

    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y,
            bottom: this.y + this.height
        };
    }

    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.left < b.right && a.right > b.left &&
               a.top < b.bottom && a.bottom > b.top;
    }

    render(ctx) {
        const immune = this.isImmune();

        // Immune blink
        if (immune && Math.floor(Date.now() / 120) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }

        const w = this.width;
        const h = this.height;
        const bx = this.x - w / 2;
        const by = this.y + this.bounceY;

        // Squash/stretch transform
        const sx = 2 - this.squash;
        const sy = this.squash;

        ctx.save();
        ctx.translate(this.x, this.y + h / 2);
        ctx.scale(sx, sy);
        ctx.translate(-this.x, -(this.y + h / 2));

        const isTagger = this.role === 'tagger';

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + h + 3, w / 2 + 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tagger glow aura
        if (isTagger) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
        }

        // Body - rounded square blob
        const bodyColor = isTagger ? '#ef4444' : this.color;
        const r = 5; // corner radius
        ctx.fillStyle = bodyColor;
        this._roundRect(ctx, bx, by, w, h, r);
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Body highlight (top)
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this._roundRect(ctx, bx + 2, by + 1, w - 4, h / 3, r - 2);
        ctx.fill();

        // Body dark bottom
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(bx + 2, by + h * 0.65, w - 4, h * 0.3);

        // Eyes
        const eyeSize = 6;
        const eyeY = by + 7;
        const eyeSpacing = 5;
        const leftEyeX = this.x - eyeSpacing;
        const rightEyeX = this.x + eyeSpacing - eyeSize;

        const blinkH = Math.max(1, eyeSize * (1 - this.eyeBlink));

        // Eye whites
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(leftEyeX, eyeY + (eyeSize - blinkH) / 2, eyeSize, blinkH);
        ctx.fillRect(rightEyeX, eyeY + (eyeSize - blinkH) / 2, eyeSize, blinkH);

        // Pupils
        if (this.eyeBlink < 0.5) {
            const pupilOff = this.facing * 1.5;
            ctx.fillStyle = isTagger ? '#7f1d1d' : '#1e293b';
            ctx.fillRect(leftEyeX + 2 + pupilOff, eyeY + 2, 3, 3);
            ctx.fillRect(rightEyeX + 2 + pupilOff, eyeY + 2, 3, 3);
        }

        // Tagger angry eyebrows
        if (isTagger) {
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 2;
            // Left brow
            ctx.beginPath();
            ctx.moveTo(leftEyeX - 1, eyeY - 2);
            ctx.lineTo(leftEyeX + eyeSize + 1, eyeY - 4);
            ctx.stroke();
            // Right brow
            ctx.beginPath();
            ctx.moveTo(rightEyeX - 1, eyeY - 4);
            ctx.lineTo(rightEyeX + eyeSize + 1, eyeY - 2);
            ctx.stroke();
        }

        // Mouth
        if (isTagger) {
            // Angry zigzag mouth
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const my = by + 16;
            ctx.moveTo(this.x - 5, my);
            ctx.lineTo(this.x - 2, my + 2);
            ctx.lineTo(this.x + 1, my);
            ctx.lineTo(this.x + 4, my + 2);
            ctx.stroke();
        } else {
            // Happy smile
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, by + 14, 4, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
        }

        // Cheek blush (survivors only)
        if (!isTagger) {
            ctx.fillStyle = 'rgba(255, 150, 150, 0.25)';
            ctx.beginPath();
            ctx.ellipse(leftEyeX - 1, by + 14, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(rightEyeX + eyeSize + 1, by + 14, 3, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Immune shield
        if (immune) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y + h / 2, w * 0.85, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Tagger lightning icon
        if (isTagger) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 10px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', this.x, by - 5);
        }

        ctx.restore();
        ctx.globalAlpha = 1;

        // Username above (outside squash transform)
        ctx.fillStyle = isTagger ? '#fca5a5' : '#e2e8f0';
        ctx.font = '600 10px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(this.username, this.x, this.y - 8);
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    toNetworkData() {
        return {
            x: Math.round(this.x),
            y: Math.round(this.y),
            vx: Math.round(this.vx),
            role: this.role,
            facing: this.facing,
            username: this.username,
            color: this.color,
            immuneUntil: this.immuneUntil,
            points: this.points || 0,
            banner: this.banner || null
        };
    }
}
