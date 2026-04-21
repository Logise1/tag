/* ==========================================
   Input Handler
   ========================================== */

const Input = {
    keys: {},

    init() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Prevent focus loss issues
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    },

    isDown(code) {
        return !!this.keys[code];
    },

    get left() {
        return this.isDown('ArrowLeft') || this.isDown('KeyA');
    },

    get right() {
        return this.isDown('ArrowRight') || this.isDown('KeyD');
    },

    get up() {
        return this.isDown('ArrowUp') || this.isDown('KeyW') || this.isDown('Space');
    }
};
