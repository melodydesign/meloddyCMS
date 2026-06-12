/**
 * meloddyCMS Client Cart Helper
 * 
 * Сохраняет корзину в localStorage и отправляет заказы в CRM платформы.
 */
(function() {
    const CART_KEY = 'meloddy_cart';

    // Helper to get active site ID
    function getSiteId() {
        if (window.meloddySiteId) return window.meloddySiteId;
        
        // Auto-detect from preview URL path: /real-site/siteId/page.html
        const pathParts = window.location.pathname.split('/');
        if (pathParts[1] === 'real-site' && pathParts[2]) {
            return pathParts[2];
        }
        
        // Return null or placeholder if cannot detect
        console.warn('meloddyCMS site ID not defined. Set window.meloddySiteId.');
        return null;
    }

    const Cart = {
        getItems() {
            try {
                return JSON.parse(localStorage.getItem(CART_KEY)) || [];
            } catch (e) {
                return [];
            }
        },

        saveItems(items) {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
            // Dispatch custom event to notify UI
            window.dispatchEvent(new CustomEvent('meloddy-cart-updated', { detail: items }));
        },

        addItem(product) {
            if (!product || !product.id) return;
            const items = this.getItems();
            const existing = items.find(item => item.productId === product.id || item.productId === product.productId);
            
            if (existing) {
                existing.quantity += parseInt(product.quantity) || 1;
            } else {
                items.push({
                    productId: product.id || product.productId,
                    name: product.name || 'Товар',
                    price: parseFloat(product.price) || 0,
                    quantity: parseInt(product.quantity) || 1,
                    image: product.image || (product.images && product.images[0]) || ''
                });
            }
            this.saveItems(items);
        },

        removeItem(productId) {
            let items = this.getItems();
            items = items.filter(item => item.productId !== productId);
            this.saveItems(items);
        },

        updateQuantity(productId, quantity) {
            const items = this.getItems();
            const item = items.find(item => item.productId === productId);
            if (item) {
                item.quantity = Math.max(1, parseInt(quantity) || 1);
                this.saveItems(items);
            }
        },

        clear() {
            this.saveItems([]);
        },

        getTotalCount() {
            return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
        },

        getTotalPrice() {
            return this.getItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },

        async submitOrder(orderData) {
            const siteId = getSiteId();
            if (!siteId) {
                throw new Error('meloddyCMS site ID is missing.');
            }

            const items = this.getItems();
            if (items.length === 0) {
                throw new Error('Корзина пуста');
            }

            const payload = {
                clientName: orderData.name,
                clientPhone: orderData.phone,
                clientEmail: orderData.email || '',
                comment: orderData.comment || '',
                items: items
            };

            const response = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Ошибка при оформлении заказа');
            }

            // Clear cart upon successful order
            this.clear();
            return await response.json();
        }
    };

    // Export globally
    window.MeloddyCart = Cart;
})();
