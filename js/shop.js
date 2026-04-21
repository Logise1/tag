/* ==========================================
   Shop - Full Screen, Banners & Fonts
   ========================================== */

const Shop = {
    BANNERS: [
        { id: 'galaxy',    name: 'Galaxia',        price: 80,  rarity: 'common',    img: 'assets/banners/galaxy.png' },
        { id: 'forest',    name: 'Bosque Mágico',  price: 120, rarity: 'common',    img: 'assets/banners/forest.png' },
        { id: 'mountains', name: 'Montañas',       price: 150, rarity: 'rare',      img: 'assets/banners/mountains.png' },
        { id: 'ocean',     name: 'Océano Profundo',price: 200, rarity: 'rare',      img: 'assets/banners/ocean.png' },
        { id: 'cyberpunk', name: 'Cyberpunk',       price: 250, rarity: 'rare',      img: 'assets/banners/cyberpunk.png' },
        { id: 'cherry',    name: 'Sakura',          price: 350, rarity: 'epic',      img: 'assets/banners/cherry.png' },
        { id: 'lava',      name: 'Volcán',          price: 400, rarity: 'epic',      img: 'assets/banners/lava.png' },
        { id: 'geometric', name: 'Neón Abstracto',  price: 500, rarity: 'epic',      img: 'assets/banners/geometric.png' },
        { id: 'lightning',  name: 'Tormenta',       price: 700, rarity: 'legendary', img: 'assets/banners/lightning.png' },
        { id: 'pixel',     name: 'Retro Pixel',     price: 900, rarity: 'legendary', img: 'assets/banners/pixel.png' },
    ],

    FONTS: [
        // ── Common (Gratis / Baratas) ──
        { id: 'outfit',      name: 'Outfit',            price: 0,    rarity: 'common',    family: 'Outfit' },
        { id: 'caveat',      name: 'Manuscrita',        price: 60,   rarity: 'common',    family: 'Caveat' },
        { id: 'comfortaa',   name: 'Redondeada',        price: 80,   rarity: 'common',    family: 'Comfortaa' },
        { id: 'quicksand',   name: 'Suave',             price: 80,   rarity: 'common',    family: 'Quicksand' },

        // ── Rare ──
        { id: 'pressstart',  name: 'Pixel Retro',       price: 150,  rarity: 'rare',      family: "'Press Start 2P'" },
        { id: 'silkscreen',  name: 'Pixel Mini',        price: 150,  rarity: 'rare',      family: 'Silkscreen' },
        { id: 'vt323',       name: 'Terminal',          price: 150,  rarity: 'rare',      family: 'VT323' },
        { id: 'pacifico',    name: 'Pacifico',          price: 200,  rarity: 'rare',      family: 'Pacifico' },
        { id: 'marker',      name: 'Rotulador',         price: 200,  rarity: 'rare',      family: "'Permanent Marker'" },
        { id: 'satisfy',     name: 'Elegante',          price: 200,  rarity: 'rare',      family: 'Satisfy' },
        { id: 'righteous',   name: 'Retro',             price: 220,  rarity: 'rare',      family: 'Righteous' },
        { id: 'bangers',     name: 'Cómic',             price: 250,  rarity: 'rare',      family: 'Bangers' },

        // ── Epic ──
        { id: 'fredoka',     name: 'Fredoka',           price: 300,  rarity: 'epic',      family: "'Fredoka One'" },
        { id: 'luckiest',    name: 'Cartoon',           price: 350,  rarity: 'epic',      family: "'Luckiest Guy'" },
        { id: 'bungee',      name: 'Bungee',            price: 350,  rarity: 'epic',      family: 'Bungee' },
        { id: 'audiowide',   name: 'Tecno',             price: 400,  rarity: 'epic',      family: 'Audiowide' },
        { id: 'orbitron',    name: 'Futurista',         price: 400,  rarity: 'epic',      family: 'Orbitron' },
        { id: 'russo',       name: 'Militar',           price: 400,  rarity: 'epic',      family: "'Russo One'" },
        { id: 'blackops',    name: 'Black Ops',         price: 450,  rarity: 'epic',      family: "'Black Ops One'" },
        { id: 'creepster',   name: 'Terror',            price: 500,  rarity: 'epic',      family: 'Creepster' },
        { id: 'lacquer',     name: 'Grunge',            price: 500,  rarity: 'epic',      family: 'Lacquer' },

        // ── Legendary ──
        { id: 'monoton',     name: 'Neón',              price: 600,  rarity: 'legendary', family: 'Monoton' },
        { id: 'metal',       name: 'Metal',             price: 700,  rarity: 'legendary', family: "'Metal Mania'" },
        { id: 'nosifer',     name: 'Sangre',            price: 800,  rarity: 'legendary', family: 'Nosifer' },
        { id: 'rubikglitch', name: 'Glitch',            price: 900,  rarity: 'legendary', family: "'Rubik Glitch'" },
    ],

    ownedBanners: [],
    ownedFonts: ['outfit'], // Default font is free
    selectedBanner: null,
    selectedFont: 'outfit',
    coins: 0,
    currentTab: 'banners',

    async init() {
        if (!Auth.currentUser) return;
        const uid = Auth.currentUser.uid;

        try {
            const snap = await db.ref('users/' + uid).once('value');
            const data = snap.val() || {};

            this.coins = (data.stats && data.stats.coins) || 0;
            this.ownedBanners = data.ownedBanners ? Object.keys(data.ownedBanners) : [];
            this.ownedFonts = ['outfit', ...(data.ownedFonts ? Object.keys(data.ownedFonts) : [])];
            this.selectedBanner = data.selectedBanner || null;
            this.selectedFont = data.selectedFont || 'outfit';
        } catch (e) {
            console.error('Shop init error:', e);
        }
    },

    show() {
        if (!Auth.currentUser) return;
        this.init().then(() => {
            this._render();
            UI.showScreen('shop');
        });
    },

    close() {
        UI.showScreen('lobby');
        Stats.refreshCoins();
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('shop-tab-' + tab).classList.add('active');
        this._render();
    },

    _render() {
        document.getElementById('shop-coins-val').textContent = this.coins;
        const grid = document.getElementById('shop-grid');
        grid.innerHTML = '';

        if (this.currentTab === 'banners') {
            this._renderBanners(grid);
        } else {
            this._renderFonts(grid);
        }
    },

    _renderBanners(grid) {
        grid.className = 'shop-items-grid banners-grid';

        this.BANNERS.forEach(banner => {
            const owned = this.ownedBanners.includes(banner.id);
            const selected = this.selectedBanner === banner.id;

            const card = document.createElement('div');
            card.className = 'shop-item-card' + (owned ? ' owned' : '') + (selected ? ' selected' : '');
            card.onclick = () => this._handleBannerClick(banner);

            card.innerHTML = `
                <div class="shop-item-preview banner-preview-card" style="position:relative;overflow:hidden">
                    <img src="${banner.img}" alt="${banner.name}" loading="lazy"
                         style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0"
                         onerror="this.style.background='linear-gradient(135deg,#1a1a3e,#2d1b69)';this.style.minHeight='80px'">
                    <span class="banner-name-overlay">${Auth.username}</span>
                </div>
                <div class="shop-item-info">
                    <span class="shop-item-name">${banner.name}</span>
                    <span class="shop-item-rarity rarity-${banner.rarity}">${banner.rarity}</span>
                    <div class="shop-item-price ${owned ? 'price-owned' : ''}">
                        ${owned ? (selected ? '✅ Equipado' : '✓ Comprado') : `🪙 ${banner.price}`}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    _renderFonts(grid) {
        grid.className = 'shop-items-grid fonts-grid';

        this.FONTS.forEach(font => {
            const owned = this.ownedFonts.includes(font.id);
            const selected = this.selectedFont === font.id;

            const card = document.createElement('div');
            card.className = 'shop-item-card' + (owned ? ' owned' : '') + (selected ? ' selected' : '');
            card.onclick = () => this._handleFontClick(font);

            // Get banner URL for font preview background
            const bannerUrl = this.getSelectedBannerUrl();
            const bgStyle = bannerUrl
                ? `background-image:url('${bannerUrl}');background-size:cover;background-position:center`
                : `background:linear-gradient(135deg,#1a1a3e,#2d1b69)`;

            card.innerHTML = `
                <div class="shop-item-preview font-preview-card" style="position:relative;overflow:hidden;${bgStyle}">
                    <span class="font-preview-text" style="font-family:${font.family}">${Auth.username}</span>
                </div>
                <div class="shop-item-info">
                    <span class="shop-item-name">${font.name}</span>
                    <span class="shop-item-rarity rarity-${font.rarity}">${font.rarity}</span>
                    <div class="shop-item-price ${owned ? 'price-owned' : ''}">
                        ${font.price === 0 ? '✅ Gratis' : (owned ? (selected ? '✅ Equipada' : '✓ Comprada') : `🪙 ${font.price}`)}
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
            if (this.selectedBanner === banner.id) {
                this.selectedBanner = null;
                await db.ref('users/' + uid + '/selectedBanner').remove();
            } else {
                this.selectedBanner = banner.id;
                await db.ref('users/' + uid + '/selectedBanner').set(banner.id);
            }
            this._render();
        } else {
            // Read current coins from server
            const snap = await db.ref('users/' + uid + '/stats/coins').once('value');
            const currentCoins = snap.val() || 0;

            if (currentCoins < banner.price) {
                alert(`Necesitas 🪙${banner.price} monedas (tienes 🪙${currentCoins})`);
                return;
            }
            if (!confirm(`¿Comprar "${banner.name}" por 🪙${banner.price}?`)) return;

            await db.ref('users/' + uid + '/stats/coins').set(currentCoins - banner.price);
            await db.ref('users/' + uid + '/ownedBanners/' + banner.id).set(true);
            this.selectedBanner = banner.id;
            await db.ref('users/' + uid + '/selectedBanner').set(banner.id);

            this.coins = currentCoins - banner.price;
            this.ownedBanners.push(banner.id);
            this._render();
        }
    },

    async _handleFontClick(font) {
        const owned = this.ownedFonts.includes(font.id);
        const uid = Auth.currentUser.uid;

        if (owned) {
            if (this.selectedFont === font.id) return; // Already equipped
            this.selectedFont = font.id;
            await db.ref('users/' + uid + '/selectedFont').set(font.id);
            this._render();
        } else {
            // Read current coins from server
            const snap = await db.ref('users/' + uid + '/stats/coins').once('value');
            const currentCoins = snap.val() || 0;

            if (currentCoins < font.price) {
                alert(`Necesitas 🪙${font.price} monedas (tienes 🪙${currentCoins})`);
                return;
            }
            if (!confirm(`¿Comprar "${font.name}" por 🪙${font.price}?`)) return;

            await db.ref('users/' + uid + '/stats/coins').set(currentCoins - font.price);
            await db.ref('users/' + uid + '/ownedFonts/' + font.id).set(true);
            this.selectedFont = font.id;
            await db.ref('users/' + uid + '/selectedFont').set(font.id);

            this.coins = currentCoins - font.price;
            this.ownedFonts.push(font.id);
            this._render();
        }
    },

    getBannerUrl(bannerId) {
        const banner = this.BANNERS.find(b => b.id === bannerId);
        return banner ? banner.img : null;
    },

    getSelectedBannerUrl() {
        return this.getBannerUrl(this.selectedBanner);
    },

    getFontFamily(fontId) {
        const font = this.FONTS.find(f => f.id === (fontId || this.selectedFont));
        return font ? font.family : 'Outfit';
    },

    getSelectedFontFamily() {
        return this.getFontFamily(this.selectedFont);
    }
};
