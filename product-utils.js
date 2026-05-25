/**
 * Developer Signature & Watermark
 * Name: Mada Dhivakar
 * Contact: dhivakarmada@gmail.com
 * Project: Wild Saala E-Commerce Platform
 */
/**
 * Wild Saala — shared product cart, variant picker, and navigation
 */
(function (global) {
    const CART_KEY = 'wildsaala_cart';
    const productCache = new Map();

    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartCount();
    }

    function updateCartCount() {
        const cart = getCart();
        document.querySelectorAll('.cart-count, .cart-count-mobile').forEach(el => {
            el.textContent = cart.length;
        });
    }

    function getProductImage(p) {
        if (p.image_url) return p.image_url;
        if (p.media && p.media.length && p.media[0] && p.media[0].url) return p.media[0].url;
        return 'https://placehold.co/600x800/111/39FF14?text=Wild+Saala';
    }

    async function fetchProduct(id) {
        const key = String(id);
        if (productCache.has(key)) return productCache.get(key);
        const res = await fetch(`/api/products/${key}`);
        if (!res.ok) throw new Error('Product not found');
        const product = await res.json();
        productCache.set(key, product);
        return product;
    }

    function goToProduct(id) {
        window.location.href = `product-details.html?id=${encodeURIComponent(id)}`;
    }

    function buildCartItem(product, variant) {
        const basePrice = Number(product.price) || 0;
        const vPrice = variant && variant.price ? Number(variant.price) : basePrice;
        const color = variant && variant.color ? variant.color : '';
        const size = variant && variant.size ? variant.size : '';
        const variantId = variant && variant.id ? variant.id : null;
        const sku = variant && variant.sku ? variant.sku : '';
        let name = product.name || 'Product';
        if (color || size) {
            const parts = [color, size].filter(Boolean);
            name = `${name} — ${parts.join(' / ')}`;
        }
        return {
            id: variantId ? `${product.id}-${variantId}` : String(product.id),
            productId: product.id,
            variantId,
            name,
            price: vPrice,
            color,
            size,
            sku,
            image: getProductImage(product),
            category: product.category || ''
        };
    }

    function addToCart(product, variant) {
        const cart = getCart();
        const item = buildCartItem(product, variant);
        cart.push(item);
        saveCart(cart);
        return item;
    }

    function uniqueValues(variants, field) {
        const set = new Set();
        variants.forEach(v => {
            const val = (v[field] || '').trim();
            if (val) set.add(val);
        });
        return Array.from(set);
    }

    function findVariant(variants, color, size) {
        return variants.find(v => {
            const vc = (v.color || '').trim();
            const vs = (v.size || '').trim();
            const colorOk = !color || vc === color;
            const sizeOk = !size || vs === size;
            return colorOk && sizeOk;
        });
    }

    function variantInStock(v) {
        if (!v) return false;
        const stock = Number(v.stock);
        if (v.is_backorder_allowed) return true;
        return stock > 0;
    }

    let pickerState = null;

    function ensureVariantModal() {
        if (document.getElementById('ws-variant-overlay')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <motion-div id="ws-variant-overlay" class="ws-variant-overlay" role="dialog" aria-modal="true" aria-labelledby="ws-variant-title">
                <motion-div class="ws-variant-modal">
                    <motion-div class="ws-variant-header">
                        <motion-div class="ws-variant-thumb" id="ws-variant-thumb"></motion-div>
                        <motion-div>
                            <h3 id="ws-variant-title">Select options</h3>
                            <motion-div class="ws-variant-price" id="ws-variant-price">₹0</motion-div>
                        </motion-div>
                        <button type="button" class="ws-variant-close" id="ws-variant-close" aria-label="Close">&times;</button>
                    </motion-div>
                    <motion-div class="ws-variant-body">
                        <motion-div id="ws-color-section" style="display:none;">
                            <motion-div class="ws-variant-label">Color</motion-div>
                            <motion-div class="ws-variant-options" id="ws-color-options"></motion-div>
                        </motion-div>
                        <motion-div id="ws-size-section" style="display:none;">
                            <motion-div class="ws-variant-label">Size</motion-div>
                            <motion-div class="ws-variant-options" id="ws-size-options"></motion-div>
                        </motion-div>
                        <motion-div class="ws-variant-stock" id="ws-variant-stock"></motion-div>
                        <button type="button" class="ws-variant-confirm" id="ws-variant-confirm" disabled>Add to bag</button>
                    </motion-div>
                </motion-div>
            </motion-div>
        `.replace(/motion-div/g, 'div'));

        const overlay = document.getElementById('ws-variant-overlay');
        document.getElementById('ws-variant-close').addEventListener('click', closeVariantPicker);
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeVariantPicker();
        });
        document.getElementById('ws-variant-confirm').addEventListener('click', confirmVariantPicker);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeVariantPicker();
        });
    }

    function formatPrice(n) {
        return '₹' + (Number(n) || 0).toLocaleString('en-IN');
    }

    function renderPickerUI() {
        const { product, variants, selectedColor, selectedSize } = pickerState;
        const overlay = document.getElementById('ws-variant-overlay');
        const thumb = document.getElementById('ws-variant-thumb');
        const title = document.getElementById('ws-variant-title');
        const priceEl = document.getElementById('ws-variant-price');
        const stockEl = document.getElementById('ws-variant-stock');
        const confirmBtn = document.getElementById('ws-variant-confirm');
        const colorSection = document.getElementById('ws-color-section');
        const sizeSection = document.getElementById('ws-size-section');
        const colorOpts = document.getElementById('ws-color-options');
        const sizeOpts = document.getElementById('ws-size-options');

        thumb.style.backgroundImage = `url('${getProductImage(product)}')`;
        title.textContent = product.name || 'Product';

        const colors = uniqueValues(variants, 'color');
        const sizes = uniqueValues(variants, 'size');

        colorSection.style.display = colors.length ? 'block' : 'none';
        sizeSection.style.display = sizes.length ? 'block' : 'none';

        colorOpts.innerHTML = '';
        colors.forEach(c => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ws-variant-chip' + (selectedColor === c ? ' active' : '');
            btn.textContent = c;
            const hasStock = variants.some(v => (v.color || '').trim() === c && variantInStock(v));
            if (!hasStock) btn.disabled = true;
            btn.addEventListener('click', () => {
                pickerState.selectedColor = c;
                if (selectedSize) {
                    const stillValid = findVariant(variants, c, selectedSize);
                    if (!stillValid || !variantInStock(stillValid)) pickerState.selectedSize = null;
                }
                renderPickerUI();
            });
            colorOpts.appendChild(btn);
        });

        sizeOpts.innerHTML = '';
        sizes.forEach(s => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ws-variant-chip' + (selectedSize === s ? ' active' : '');
            btn.textContent = s;
            const match = findVariant(variants, selectedColor || null, s);
            if (!match || !variantInStock(match)) btn.disabled = true;
            btn.addEventListener('click', () => {
                pickerState.selectedSize = s;
                renderPickerUI();
            });
            sizeOpts.appendChild(btn);
        });

        let variant = null;
        if (variants.length === 0) {
            variant = null;
        } else if (variants.length === 1) {
            variant = variants[0];
        } else {
            const needColor = colors.length > 0;
            const needSize = sizes.length > 0;
            if ((needColor && !selectedColor) || (needSize && !selectedSize)) {
                variant = null;
            } else {
                variant = findVariant(variants, selectedColor || null, selectedSize || null);
            }
        }

        pickerState.selectedVariant = variant;
        const displayPrice = variant && variant.price ? variant.price : product.price;
        priceEl.textContent = formatPrice(displayPrice);

        stockEl.className = 'ws-variant-stock';
        if (variants.length === 0) {
            stockEl.textContent = 'Ready to ship';
            confirmBtn.disabled = (product.status || '').toLowerCase() === 'sold out';
        } else if (!variant) {
            stockEl.textContent = 'Select color and size to continue';
            confirmBtn.disabled = true;
        } else if (!variantInStock(variant)) {
            stockEl.textContent = 'Out of stock for this combination';
            stockEl.classList.add('out');
            confirmBtn.disabled = true;
        } else {
            const stock = Number(variant.stock);
            if (stock > 0 && stock <= 5) {
                stockEl.textContent = `Only ${stock} left — move fast`;
                stockEl.classList.add('low');
            } else if (stock > 5) {
                stockEl.textContent = 'In stock';
            } else {
                stockEl.textContent = 'Available (backorder)';
            }
            confirmBtn.disabled = false;
        }
    }

    function openVariantPicker(productOrId, options) {
        options = options || {};
        ensureVariantModal();
        const overlay = document.getElementById('ws-variant-overlay');

        const open = async () => {
            let product = productOrId;
            if (typeof productOrId === 'number' || typeof productOrId === 'string') {
                product = await fetchProduct(productOrId);
            }
            if (!product) return;

            if ((product.status || '').toLowerCase() === 'sold out') {
                if (options.onError) options.onError('This drop is sold out.');
                return;
            }

            const variants = Array.isArray(product.variants) ? product.variants : [];
            pickerState = {
                product,
                variants,
                selectedColor: null,
                selectedSize: null,
                selectedVariant: null,
                onAdded: options.onAdded
            };

            if (variants.length === 1) {
                pickerState.selectedColor = (variants[0].color || '').trim() || null;
                pickerState.selectedSize = (variants[0].size || '').trim() || null;
            }

            renderPickerUI();
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        };

        open().catch(err => {
            console.error(err);
            if (options.onError) options.onError('Could not load product options.');
        });
    }

    function closeVariantPicker() {
        const overlay = document.getElementById('ws-variant-overlay');
        if (overlay) overlay.classList.remove('show');
        document.body.style.overflow = '';
        pickerState = null;
    }

    function confirmVariantPicker() {
        if (!pickerState) return;
        const { product, variants, selectedVariant, onAdded } = pickerState;
        if (variants.length > 0 && !selectedVariant) return;
        if (selectedVariant && !variantInStock(selectedVariant)) return;

        const item = addToCart(product, selectedVariant || null);
        closeVariantPicker();
        if (typeof onAdded === 'function') onAdded(item, product);
    }

    function bindProductCards(container, options) {
        if (!container) return;
        options = options || {};
        container.addEventListener('click', async e => {
            const atc = e.target.closest('.add-to-cart');
            if (atc) {
                e.preventDefault();
                e.stopPropagation();
                if (atc.disabled) return;
                const card = atc.closest('.product-card');
                const id = card && card.dataset.id;
                if (!id) return;
                openVariantPicker(id, {
                    onAdded: options.onAdded,
                    onError: options.onError
                });
                return;
            }

            const card = e.target.closest('.product-card[data-id]');
            if (!card) return;
            if (e.target.closest('button, a, input')) return;
            goToProduct(card.dataset.id);
        });
    }

    function injectDialogStyles() {
        if (document.getElementById('ws-dialog-styles')) return;
        const style = document.createElement('style');
        style.id = 'ws-dialog-styles';
        style.innerHTML = `
            .ws-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999999;
                opacity: 0;
                transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .ws-dialog-overlay.show {
                opacity: 1;
            }
            .ws-dialog-modal {
                background: rgba(10, 10, 10, 0.9);
                border: 1px solid rgba(57, 255, 20, 0.3);
                border-radius: 12px;
                padding: 30px;
                width: 90%;
                max-width: 440px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(57, 255, 20, 0.1);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
                font-family: 'Inter', -apple-system, sans-serif;
                color: #fff;
                opacity: 0;
            }
            .ws-dialog-overlay.show .ws-dialog-modal {
                transform: scale(1) translateY(0);
                opacity: 1;
            }
            .ws-dialog-body {
                display: flex;
                gap: 20px;
                margin-bottom: 25px;
                align-items: flex-start;
            }
            .ws-dialog-icon {
                font-size: 1.8rem;
                line-height: 1;
                margin-top: 2px;
            }
            .ws-dialog-icon.info { color: #39FF14; text-shadow: 0 0 10px rgba(57, 255, 20, 0.5); }
            .ws-dialog-icon.warn { color: #ffcc00; text-shadow: 0 0 10px rgba(255, 204, 0, 0.5); }
            .ws-dialog-icon.error { color: #ff3333; text-shadow: 0 0 10px rgba(255, 51, 51, 0.5); }
            .ws-dialog-content h4 {
                margin: 0 0 8px 0;
                color: #fff;
                font-size: 1.1rem;
                font-weight: 800;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            .ws-dialog-content p {
                margin: 0;
                color: #b0b0b0;
                font-size: 0.9rem;
                line-height: 1.6;
            }
            .ws-dialog-input-wrapper {
                margin-bottom: 25px;
            }
            .ws-dialog-input {
                width: 100%;
                background: rgba(20, 20, 20, 0.8);
                border: 1px solid #333;
                border-radius: 6px;
                padding: 10px 14px;
                color: #fff;
                font-size: 0.95rem;
                transition: border-color 0.2s, box-shadow 0.2s;
                outline: none;
                box-sizing: border-box;
            }
            .ws-dialog-input:focus {
                border-color: #39FF14;
                box-shadow: 0 0 8px rgba(57, 255, 20, 0.2);
            }
            .ws-dialog-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            .ws-dialog-btn {
                padding: 10px 24px;
                border-radius: 6px;
                font-size: 0.85rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: none;
                outline: none;
            }
            .ws-dialog-btn-outline {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #aaa;
            }
            .ws-dialog-btn-outline:hover {
                border-color: rgba(255, 255, 255, 0.4);
                color: #fff;
            }
            .ws-dialog-btn-primary {
                background: #39FF14;
                border: 1px solid #39FF14;
                color: #000;
                box-shadow: 0 4px 12px rgba(57, 255, 20, 0.2);
            }
            .ws-dialog-btn-primary:hover {
                background: #2ee60f;
                box-shadow: 0 6px 18px rgba(57, 255, 20, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    const CustomDialog = {
        alert: function (message) {
            injectDialogStyles();
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'ws-dialog-overlay';
                
                overlay.innerHTML = `
                    <div class="ws-dialog-modal">
                        <div class="ws-dialog-body">
                            <div class="ws-dialog-icon info"><i class="fas fa-info-circle"></i></div>
                            <div class="ws-dialog-content">
                                <h4>System Notification</h4>
                                <p>${message}</p>
                            </div>
                        </div>
                        <div class="ws-dialog-actions">
                            <button class="ws-dialog-btn ws-dialog-btn-primary" id="ws-alert-ok">Acknowledge</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(overlay);
                setTimeout(() => overlay.classList.add('show'), 10);
                
                const closeBtn = overlay.querySelector('#ws-alert-ok');
                const close = () => {
                    overlay.classList.remove('show');
                    setTimeout(() => {
                        overlay.remove();
                        resolve();
                    }, 250);
                };
                
                closeBtn.focus();
                closeBtn.addEventListener('click', close);
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close();
                });
                
                const handleKeyDown = (e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault();
                        document.removeEventListener('keydown', handleKeyDown);
                        close();
                    }
                };
                document.addEventListener('keydown', handleKeyDown);
            });
        },
        
        confirm: function (message) {
            injectDialogStyles();
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'ws-dialog-overlay';
                
                overlay.innerHTML = `
                    <div class="ws-dialog-modal">
                        <div class="ws-dialog-body">
                            <div class="ws-dialog-icon warn"><i class="fas fa-exclamation-triangle"></i></div>
                            <div class="ws-dialog-content">
                                <h4>Confirm Request</h4>
                                <p>${message}</p>
                            </div>
                        </div>
                        <div class="ws-dialog-actions">
                            <button class="ws-dialog-btn ws-dialog-btn-outline" id="ws-confirm-cancel">Cancel</button>
                            <button class="ws-dialog-btn ws-dialog-btn-primary" id="ws-confirm-ok">Proceed</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(overlay);
                setTimeout(() => overlay.classList.add('show'), 10);
                
                const okBtn = overlay.querySelector('#ws-confirm-ok');
                const cancelBtn = overlay.querySelector('#ws-confirm-cancel');
                
                const close = (result) => {
                    overlay.classList.remove('show');
                    setTimeout(() => {
                        overlay.remove();
                        resolve(result);
                    }, 250);
                };
                
                okBtn.focus();
                okBtn.addEventListener('click', () => close(true));
                cancelBtn.addEventListener('click', () => close(false));
                
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close(false);
                });
                
                const handleKeyDown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        document.removeEventListener('keydown', handleKeyDown);
                        close(true);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        document.removeEventListener('keydown', handleKeyDown);
                        close(false);
                    }
                };
                document.addEventListener('keydown', handleKeyDown);
            });
        },
        
        prompt: function (message, defaultValue = "") {
            injectDialogStyles();
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'ws-dialog-overlay';
                
                overlay.innerHTML = `
                    <div class="ws-dialog-modal">
                        <div class="ws-dialog-body">
                            <div class="ws-dialog-icon info"><i class="fas fa-pen-nib"></i></div>
                            <div class="ws-dialog-content" style="width: 100%;">
                                <h4>Input Required</h4>
                                <p>${message}</p>
                            </div>
                        </div>
                        <div class="ws-dialog-input-wrapper">
                            <input type="text" class="ws-dialog-input" id="ws-prompt-input" value="${defaultValue}">
                        </div>
                        <div class="ws-dialog-actions">
                            <button class="ws-dialog-btn ws-dialog-btn-outline" id="ws-prompt-cancel">Cancel</button>
                            <button class="ws-dialog-btn ws-dialog-btn-primary" id="ws-prompt-ok">Submit</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(overlay);
                setTimeout(() => overlay.classList.add('show'), 10);
                
                const input = overlay.querySelector('#ws-prompt-input');
                const okBtn = overlay.querySelector('#ws-prompt-ok');
                const cancelBtn = overlay.querySelector('#ws-prompt-cancel');
                
                input.focus();
                input.select();
                
                const close = (submitted) => {
                    const value = input.value;
                    overlay.classList.remove('show');
                    setTimeout(() => {
                        overlay.remove();
                        resolve(submitted ? value : null);
                    }, 250);
                };
                
                okBtn.addEventListener('click', () => close(true));
                cancelBtn.addEventListener('click', () => close(false));
                
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close(false);
                });
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        close(true);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        close(false);
                    }
                });
            });
        }
    };

    // Override default global alert/confirm/prompt
    window.alert = function (msg) {
        CustomDialog.alert(msg);
    };
    window.confirm = function (msg) {
        CustomDialog.confirm(msg);
        return false;
    };
    window.prompt = function (msg, def) {
        CustomDialog.prompt(msg, def);
        return null;
    };

    global.TribeDialog = CustomDialog;

    function getMediaElementHtml(url, mediaType, options = {}) {
        const { 
            className = '', 
            style = 'width: 100%; height: 100%; object-fit: cover;', 
            videoAttrs = 'autoplay muted loop playsinline'
        } = options;

        if (mediaType !== 'video') {
            return `<img src="${url}" class="${className}" style="${style}" alt="Media">`;
        }

        if (!url) {
            return '';
        }

        // Check if the URL is a YouTube URL
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const matches = String(url).match(youtubeRegex);
        
        let isShorts = String(url).includes('youtube.com/shorts/');
        let videoId = null;
        if (matches && matches[1]) {
            videoId = matches[1];
        } else if (isShorts) {
            const parts = String(url).split('/shorts/');
            if (parts[1]) {
                videoId = parts[1].split(/[?#]/)[0];
            }
        }

        if (videoId) {
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1`;
            return `<iframe src="${embedUrl}" class="${className}" style="${style} border: none; pointer-events: none;" allow="autoplay; encrypted-media" frameborder="0"></iframe>`;
        }

        // Default to HTML5 video
        return `
            <video ${videoAttrs} class="${className}" style="${style}">
                <source src="${url}" type="video/mp4">
            </video>
        `;
    }

    function ensureCartModal() {
        if (window.location.pathname.includes('admin')) return;
        if (document.getElementById('cart-modal')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="cart-modal">
                <div class="cart-content">
                    <div class="cart-header">
                        <h3>Your Cart</h3>
                        <button class="cart-close-btn">&times;</button>
                    </div>
                    <ul id="cart-items-list"></ul>
                    <div class="cart-total" id="cart-total">Total: ₹0</div>
                    <div class="cart-actions">
                        <button class="btn btn-outline cart-close-btn">Continue Shopping</button>
                        <button class="btn" id="checkout-btn">Checkout</button>
                    </div>
                </div>
            </div>
        `);

        const cartModal = document.getElementById('cart-modal');
        const closeBtns = cartModal.querySelectorAll('.cart-close-btn');
        closeBtns.forEach(btn => btn.addEventListener('click', closeCartModal));
        cartModal.addEventListener('click', e => {
            if (e.target === cartModal) closeCartModal();
        });
        
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                window.location.href = 'checkout.html';
            });
        }
    }

    function renderCart() {
        ensureCartModal();
        const cartItemsList = document.getElementById('cart-items-list');
        const cartTotalElement = document.getElementById('cart-total');
        if (!cartItemsList || !cartTotalElement) return;
        
        const cart = getCart();
        cartItemsList.innerHTML = '';
        let total = 0;
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<p style="text-align: center; color: #aaa; padding: 20px 0;">Your cart is empty.</p>';
            cartTotalElement.textContent = 'Total: ₹0';
        } else {
            cart.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'cart-item';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                li.style.marginBottom = '15px';
                li.style.paddingBottom = '10px';
                li.style.borderBottom = '1px solid #222';
                
                li.innerHTML = `
                    <div class="cart-item-info">
                        <h4 style="font-size: 0.95rem; font-weight: 600; color: #f5f5f5; font-family: 'Montserrat', sans-serif;">${item.name}</h4>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="cart-item-price" style="font-weight: 700; color: #39FF14; font-family: 'Montserrat', sans-serif;">₹${Number(item.price).toLocaleString()}</span>
                        <button type="button" class="remove-cart-item" data-index="${index}" style="background: none; border: none; color: #ff4d4d; cursor: pointer; font-size: 1rem;"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                cartItemsList.appendChild(li);
                total += Number(item.price) || 0;
            });
            cartTotalElement.textContent = `Total: ₹${total.toLocaleString()}`;
            
            // Bind remove button events
            cartItemsList.querySelectorAll('.remove-cart-item').forEach(btn => {
                btn.addEventListener('click', e => {
                    const idx = parseInt(btn.dataset.index);
                    const currentCart = getCart();
                    currentCart.splice(idx, 1);
                    saveCart(currentCart);
                    renderCart();
                });
            });
        }
    }

    function openCartModal() {
        renderCart();
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) cartModal.classList.add('show');
    }

    function closeCartModal() {
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) cartModal.classList.remove('show');
    }

    function initCartEvents() {
        const desktopCart = document.getElementById('cart-icon-desktop');
        const mobileCart = document.getElementById('mobile-cart-icon');
        const shopCart = document.getElementById('cart-icon-shop');
        const viewCartBtn = document.getElementById('view-cart-btn');
        
        if (desktopCart) desktopCart.addEventListener('click', openCartModal);
        if (mobileCart) mobileCart.addEventListener('click', openCartModal);
        if (shopCart) shopCart.addEventListener('click', openCartModal);
        if (viewCartBtn) {
            viewCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openCartModal();
            });
        }
    }

    function updateCartCount() {
        const cart = getCart();
        document.querySelectorAll('.cart-count, .cart-count-mobile').forEach(el => {
            el.textContent = cart.length;
        });

        // Dynamic Auth button check in header
        const tribeUser = JSON.parse(localStorage.getItem('wildsaala_user'));
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            if (tribeUser) {
                loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> MY PROFILE`;
                loginBtn.href = 'user-dashboard.html';
                loginBtn.style.color = 'var(--accent)';
            } else {
                loginBtn.innerHTML = `<i class="fas fa-user"></i> LOGIN`;
                loginBtn.href = 'login.html';
                loginBtn.style.color = '';
            }
        }
        
        // Also mobile login
        const mobileLoginBtn = document.getElementById('mobile-login-btn');
        if (mobileLoginBtn) {
            if (tribeUser) {
                mobileLoginBtn.innerHTML = `<i class="fas fa-user-circle mobile-nav-icon"></i> <span>Profile</span>`;
                mobileLoginBtn.href = 'user-dashboard.html';
            } else {
                mobileLoginBtn.innerHTML = `<i class="fas fa-user mobile-nav-icon"></i> <span>Login</span>`;
                mobileLoginBtn.href = 'login.html';
            }
        }
    }

    global.WildSaala = {
        getCart,
        saveCart,
        updateCartCount,
        getProductImage,
        fetchProduct,
        goToProduct,
        buildCartItem,
        addToCart,
        openVariantPicker,
        closeVariantPicker,
        bindProductCards,
        getMediaElementHtml,
        openCartModal,
        closeCartModal,
        renderCart
    };

    function setup() {
        if (window.location.pathname.includes('admin')) return;
        updateCartCount();
        ensureCartModal();
        initCartEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})(window);
