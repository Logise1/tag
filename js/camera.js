/* ==========================================
   Camera System with Zoom & Smoothing
   ========================================== */

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.smoothing = 0.1;
        this.scale = 2.2;  // Zoom level
        this.screenWidth = 0;
        this.screenHeight = 0;
    }

    resize(width, height) {
        this.screenWidth = width;
        this.screenHeight = height;
    }

    get viewWidth() {
        return this.screenWidth / this.scale;
    }

    get viewHeight() {
        return this.screenHeight / this.scale;
    }

    follow(targetX, targetY, mapWidth, mapHeight, tileSize) {
        const vw = this.viewWidth;
        const vh = this.viewHeight;

        // Center on target
        this.targetX = targetX - vw / 2;
        this.targetY = targetY - vh / 2;

        // Clamp to map bounds
        const maxX = mapWidth * tileSize - vw;
        const maxY = mapHeight * tileSize - vh;

        this.targetX = Math.max(0, Math.min(this.targetX, maxX));
        this.targetY = Math.max(0, Math.min(this.targetY, maxY));

        // Smooth interpolation
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    apply(ctx) {
        ctx.scale(this.scale, this.scale);
        ctx.translate(-Math.round(this.x), -Math.round(this.y));
    }
}
