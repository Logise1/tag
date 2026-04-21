/* ==========================================
   Shop & Banner System
   ========================================== */

const Shop = {
    BANNERS: [
        { id: 'galaxy',   name: 'Galaxia',       price: 80,  rarity: 'common',    img: 'assets/banners/galaxy.png' },
        { id: 'forest',   name: 'Bosque Mágico',  price: 120, rarity: 'common',    img: 'assets/banners/forest.png' },
        { id: 'mountains',name: 'Montañas',       price: 150, rarity: 'rare',      img: 'assets/banners/mountains.png' },
        { id: 'ocean',    name: 'Océano Profundo', price: 200, rarity: 'rare',      img: 'assets/banners/ocean.png' },
        { id: 'cyberpunk',name: 'Cyberpunk',       price: 250, rarity: 'rare',      img: 'assets/banners/cyberpunk.png' },
        { id: 'cherry',   name: 'Sakura',          price: 350, rarity: 'epic',      img: 'assets/banners/cherry.png' },
        { id: 'lava',     name: 'Volcán',          price: 400, rarity: 'epic',      img: 'assets/banners/lava.png' },
        { id: 'geometric',name: 'Neón Abstracto',  price: 500, rarity: 'epic',      img: 'assets/banners/geometric.png' },
        { id: 'lightning', name: 'Tormenta',       price: 700, rarity: 'legendary', img: 'assets/banners/lightning.png' },
        { id: 'pixel',    name: 'Retro Pixel',     price: 900, rarity: 'legendary', img: 'assets/banners/pixel.png' },
    ],

    ownedBanners: [],
    selectedBanner: null,
    coins: 0,

    async init() {
        if (!Auth.currentUser) return;
        const uid = Auth.currentUser.uid;

        // Load owned banners and coins
        const snap = await db.ref('users/' + uid).once('value');
        const data = snap.val() || {};

        this.coins = (data.stats && data.stats.coins) || 0;
        this.ownedBanners = data.ownedBanners ? Object.keys(data.ownedBanners) : [];
        this.selectedBanner = data.selectedBanner || null;
    },

    show() {
        if (!Auth.currentUser) return;
        this.init().then(() => this._renderShop());
        document.getElementById('modal-shop').classList.add('active');
    },

    _renderShop() {
        // Update coins display
        document.getElementById('shop-coins').textContent = this.coins;

        const grid = document.getElementById('banner-grid');
        grid.innerHTML = '';

        this.BANNERS.forEach(banner => {
            const owned = this.ownedBanners.includes(banner.id);
            const selected = this.selectedBanner === banner.id;

            const card = document.createElement('div');
            card.className = 'banner-card' + (owned ? ' owned' : '') + (selected ? ' selected' : '');
            card.onclick = () => this._handleBannerClick(banner);

            card.innerHTML = `
                <img class="banner-card-img" src="${banner.img}" alt="${banner.name}" loading="lazy" onerror="this.style.background='linear-gradient(135deg,#1a1a3e,#2d1b69)';this.style.minHeight='80px'">
                <div class="banner-card-info">
                    <span class="banner-card-name">${banner.name}</span>
                    <span class="banner-card-rarity rarity-${banner.rarity}">${banner.rarity}</span>
                    <div class="banner-card-price ${owned ? 'owned-label' : ''}">
                        ${owned ? (selected ? '✅ Equipado' : '✓ Comprado') : `🪙 ${banner.price}`}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    async _handleBannerClick(banner) {
        const owned = this.ownedBanners.includes(banner.id);
        const uid = Auth.currentUser.uid;

        if (owned) {
            // Toggle equip
            if (this.selectedBanner === banner.id) {
                this.selectedBanner = null;
                await db.ref('users/' + uid + '/selectedBanner').remove();
            } else {
                this.selectedBanner = banner.id;
                await db.ref('users/' + uid + '/selectedBanner').set(banner.id);
            }
            this._renderShop();
        } else {
            // Try to buy
            if (this.coins < banner.price) {
                alert(`No tienes suficientes monedas. Necesitas 🪙${banner.price} y tienes 🪙${this.coins}`);
                return;
            }

            if (!confirm(`¿Comprar "${banner.name}" por 🪙${banner.price}?`)) return;

            // Deduct coins atomically
            const coinsRef = db.ref('users/' + uid + '/stats/coins');
            const result = await coinsRef.transaction(current => {
                const cur = current || 0;
                if (cur < banner.price) return; // Abort
                return cur - banner.price;
            });

            if (!result.committed) {
                alert('No tienes suficientes monedas');
                return;
            }

            // Add to owned
            await db.ref('users/' + uid + '/ownedBanners/' + banner.id).set(true);

            // Auto-equip
            this.selectedBanner = banner.id;
            await db.ref('users/' + uid + '/selectedBanner').set(banner.id);

            this.coins -= banner.price;
            this.ownedBanners.push(banner.id);
            this._renderShop();
        }
    },

    getBannerUrl(bannerId) {
        const banner = this.BANNERS.find(b => b.id === bannerId);
        return banner ? banner.img : null;
    },

    getSelectedBannerUrl() {
        return this.getBannerUrl(this.selectedBanner);
    }
};
