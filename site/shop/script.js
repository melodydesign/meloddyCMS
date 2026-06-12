document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('products-grid');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const priceMinInput = document.getElementById('priceMinInput');
    const priceMaxInput = document.getElementById('priceMaxInput');
    const brandTabsContainer = document.getElementById('brandFilterTabs');
    const cartCount = document.querySelector('.cart-count');
    const cartIcon = document.querySelector('.cart-icon');

    // Templates
    const brandTabTemplate = document.getElementById('brand-tab-template');
    const productCardTemplate = document.getElementById('product-card-template');

    let currentPage = 1;
    let currentSearch = '';
    let currentBrand = '';
    let minPrice = '';
    let maxPrice = '';
    let searchTimeout = null;
    let priceTimeout = null;
    
    let allCategories = [];
    let cart = []; // Массив корзины: [{productId, name, price, quantity, image, selectedVariants: {}}]

    // Load Cart from localStorage on start
    try {
        cart = JSON.parse(localStorage.getItem('meloddy_cart')) || [];
    } catch (e) {
        cart = [];
    }
    updateCartCount();

    // Initialize: Load Categories first, then Load Products
    async function initShop() {
        try {
            // 1. Fetch categories
            const catResponse = await fetch('/api/commerce/shop/public/categories');
            if (catResponse.ok) {
                allCategories = await catResponse.json();
            }
            
            // 2. Render brand tabs dynamically using template
            renderBrandTabs();
            
            // 3. Load initial products
            await loadProducts(1);
        } catch (error) {
            console.error('Initialization error:', error);
            await loadProducts(1);
        }
    }

    function renderBrandTabs() {
        if (!brandTabsContainer || !brandTabTemplate) return;
        
        brandTabsContainer.innerHTML = '';
        
        // Add "All" option manually using template
        let allHtml = brandTabTemplate.innerHTML
            .replace(/{id}/g, '')
            .replace(/{name}/g, 'Все');
            
        const allBtn = createElementFromHTML(allHtml);
        allBtn.classList.add('active');
        allBtn.addEventListener('click', () => selectBrandTab(allBtn, ''));
        brandTabsContainer.appendChild(allBtn);
        
        // Add other categories from server
        allCategories.forEach(cat => {
            let catHtml = brandTabTemplate.innerHTML
                .replace(/{id}/g, cat.id)
                .replace(/{name}/g, cat.name);
                
            const btn = createElementFromHTML(catHtml);
            btn.addEventListener('click', () => selectBrandTab(btn, cat.id));
            brandTabsContainer.appendChild(btn);
        });
    }

    function selectBrandTab(activeBtn, categoryId) {
        brandTabsContainer.querySelectorAll('.brand-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
        currentBrand = categoryId;
        loadProducts(1);
    }

    // Load products with query params
    async function loadProducts(page = 1) {
        grid.innerHTML = `
            <div class="loader-wrapper" style="grid-column: 1 / -1;">
                <div class="loader"></div>
                <p class="loader-text">Загрузка эксклюзивной коллекции...</p>
            </div>
        `;
        
        try {
            const params = new URLSearchParams({
                page: page,
                limit: 12
            });
            
            if (currentSearch) params.append('search', currentSearch);
            if (currentBrand) params.append('category', currentBrand);
            if (minPrice) params.append('minPrice', minPrice);
            if (maxPrice) params.append('maxPrice', maxPrice);

            const response = await fetch(`/api/commerce/shop/public/products?${params.toString()}`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            renderProducts(data.products || []);
            renderPagination(data.page, data.totalPages);
            
            currentPage = data.page;
        } catch (error) {
            console.error('Fetch error:', error);
            grid.innerHTML = `
                <div class="loader-wrapper" style="grid-column: 1 / -1; text-align: center;">
                    <p style="color: #dc2626; font-weight: 500;">Ошибка при загрузке каталога.</p>
                    <p style="color: var(--color-text-muted); margin-top: 8px;">Пожалуйста, проверьте соединение и обновите страницу.</p>
                </div>
            `;
        }
    }

    function renderProducts(products) {
        grid.innerHTML = '';
        
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="loader-wrapper" style="grid-column: 1 / -1; padding: 100px 0;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <p style="font-size: 1.25rem; font-weight: 600; color: var(--color-text-main);">Ничего не найдено</p>
                    <p style="margin-top: 8px; color: var(--color-text-muted);">Попробуйте изменить параметры поиска или фильтров</p>
                </div>
            `;
            return;
        }

        if (!productCardTemplate) return;

        products.forEach((product, index) => {
            let brandName = '';
            if (product.categories && product.categories.length > 0) {
                const found = allCategories.find(c => product.categories.includes(c.id));
                if (found) brandName = found.name;
            }
            if (!brandName && product.customFields && product.customFields.Brand) {
                brandName = product.customFields.Brand;
            }
            if (!brandName) brandName = 'Кроссовки';

            const imageSrc = product.images && product.images.length > 0 
                ? product.images[0] 
                : 'https://via.placeholder.com/400x400?text=A3BOOTS';

            const badgeHtml = product.badge 
                ? `<span class="product-badge">${product.badge}</span>` 
                : '';

            let cardHtml = productCardTemplate.innerHTML
                .replace(/{id}/g, product.id)
                .replace(/{name}/g, product.name)
                .replace(/{category}/g, brandName)
                .replace(/{badge}/g, badgeHtml)
                .replace(/{image}/g, imageSrc)
                .replace(/{price}/g, product.price.toLocaleString('ru-RU'));

            const card = createElementFromHTML(cardHtml);
            
            // Render basic variants tags inline
            const variantsContainer = card.querySelector('.product-variants-container');
            if (variantsContainer && product.variants && product.variants.length > 0) {
                const groups = {};
                product.variants.forEach(v => {
                    if (!groups[v.name]) groups[v.name] = [];
                    groups[v.name].push(v.value);
                });
                
                Object.keys(groups).forEach(groupName => {
                    const tag = document.createElement('div');
                    tag.style.fontSize = '0.7rem';
                    tag.style.color = 'var(--color-text-muted)';
                    // limit shown values
                    const vals = groups[groupName].slice(0, 4).join(', ') + (groups[groupName].length > 4 ? '...' : '');
                    tag.innerHTML = `<strong>${groupName}:</strong> ${vals}`;
                    variantsContainer.appendChild(tag);
                });
            }

            // Click card opens detailed Quick View Modal
            card.addEventListener('click', (e) => {
                // If clicking Add button, do not open modal
                if (e.target.closest('.btn-add')) return;
                openProductDetailModal(product, brandName);
            });

            // Bind Add button
            const addBtn = card.querySelector('.btn-add');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    quickAddToCart(product);
                });
            }
            
            // Trigger load animation
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            grid.appendChild(card);
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    function renderPagination(current, total) {
        pagination.innerHTML = '';
        if (total <= 1) return;

        // Prev
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
        prevBtn.disabled = current === 1;
        prevBtn.onclick = () => {
            loadProducts(current - 1);
            document.getElementById('catalog').scrollIntoView({behavior: 'smooth'});
        };
        pagination.appendChild(prevBtn);

        // Pages
        for (let i = 1; i <= total; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === current ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                loadProducts(i);
                document.getElementById('catalog').scrollIntoView({behavior: 'smooth'});
            };
            pagination.appendChild(btn);
        }

        // Next
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        nextBtn.disabled = current === total;
        nextBtn.onclick = () => {
            loadProducts(current + 1);
            document.getElementById('catalog').scrollIntoView({behavior: 'smooth'});
        };
        pagination.appendChild(nextBtn);
    }

    function createElementFromHTML(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstElementChild;
    }

    // Cart core methods
    function updateCartCount() {
        const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCount) cartCount.textContent = totalQty;
    }

    function saveCart() {
        localStorage.setItem('meloddy_cart', JSON.stringify(cart));
        updateCartCount();
    }

    // Quick Add from Catalog: uses first value of each variant group as default
    function quickAddToCart(product) {
        const selectedVariants = {};
        if (product.variants && product.variants.length > 0) {
            // Group and pick first options
            product.variants.forEach(v => {
                if (!selectedVariants[v.name]) {
                    selectedVariants[v.name] = v.value;
                }
            });
        }
        addCartItem(product, selectedVariants);
        
        // Animation effect on cart badge
        if (cartCount) {
            cartCount.style.transform = 'scale(1.4)';
            setTimeout(() => cartCount.style.transform = 'scale(1)', 250);
        }
    }

    function addCartItem(product, variants) {
        const image = product.images && product.images.length > 0 ? product.images[0] : '';
        
        // Find existing match by productId and same variants
        const match = cart.find(item => {
            if (item.productId !== product.id) return false;
            return JSON.stringify(item.selectedVariants) === JSON.stringify(variants);
        });

        if (match) {
            match.quantity += 1;
        } else {
            cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: image,
                selectedVariants: variants
            });
        }
        saveCart();
    }

    // ==========================================================================
    // QUICK VIEW MODAL LOGIC (Tilda-style variants selection & specs render)
    // ==========================================================================
    let currentSelectedVariants = {};

    window.openProductDetailModal = function(product, brandName) {
        const modal = document.getElementById('product-detail-modal');
        if (!modal) return;

        currentSelectedVariants = {};

        // Fill brand/name/price
        document.getElementById('detail-brand').textContent = brandName;
        document.getElementById('detail-name').textContent = product.name;
        document.getElementById('detail-sku').textContent = product.sku ? `Артикул: ${product.sku}` : '';
        document.getElementById('detail-price').textContent = `${product.price.toLocaleString('ru-RU')} ₽`;
        
        const oldPriceEl = document.getElementById('detail-oldprice');
        if (product.oldPrice) {
            oldPriceEl.textContent = `${product.oldPrice.toLocaleString('ru-RU')} ₽`;
            oldPriceEl.style.display = 'inline-block';
        } else {
            oldPriceEl.style.display = 'none';
        }

        document.getElementById('detail-description').textContent = product.description || 'Описание отсутствует.';

        // Render system properties (Color & Dimensions)
        const sysPropsContainer = document.getElementById('detail-system-properties');
        if (sysPropsContainer) {
            sysPropsContainer.innerHTML = '';
            let sysHtml = '';
            
            if (product.colorHex) {
                const colorLabel = product.colorName 
                    ? `<span class="detail-sys-value">${product.colorName}</span>` 
                    : '';
                sysHtml += `
                    <div class="detail-sys-row">
                        <span class="detail-sys-label">Цвет:</span>
                        <div class="detail-color-indicator" style="background-color: ${product.colorHex};"></div>
                        ${colorLabel}
                    </div>
                `;
            }
            
            if (product.length || product.width || product.height || product.weight) {
                const dims = [product.length || '0', product.width || '0', product.height || '0'].join(' × ') + ' см';
                const weight = product.weight ? `${product.weight} кг` : '—';
                sysHtml += `
                    <div class="detail-sys-row" style="align-items: flex-start; flex-direction: column; gap: 6px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span class="detail-sys-label">Габариты:</span>
                            <span class="detail-sys-value">${dims}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span class="detail-sys-label">Вес в упак.:</span>
                            <span class="detail-sys-value">${weight}</span>
                        </div>
                    </div>
                `;
            }
            
            sysPropsContainer.innerHTML = sysHtml;
            sysPropsContainer.style.display = sysHtml ? 'flex' : 'none';
        }


        // Gallery & Previews
        const mainImg = document.getElementById('detail-main-img');
        const previewsContainer = document.getElementById('detail-gallery-previews');
        
        const mainImageSrc = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/400x400?text=A3BOOTS';
        mainImg.src = mainImageSrc;
        
        previewsContainer.innerHTML = '';
        if (product.images && product.images.length > 1) {
            product.images.forEach((img, idx) => {
                const preview = document.createElement('img');
                preview.className = 'gallery-preview-img' + (idx === 0 ? ' active' : '');
                preview.src = img;
                preview.addEventListener('click', () => {
                    previewsContainer.querySelectorAll('.gallery-preview-img').forEach(p => p.classList.remove('active'));
                    preview.classList.add('active');
                    mainImg.src = img;
                });
                previewsContainer.appendChild(preview);
            });
        }

        // Tilda-style variants grouping & render
        const variantsContainer = document.getElementById('detail-variants');
        variantsContainer.innerHTML = '';
        
        if (product.variants && product.variants.length > 0) {
            const groups = {};
            product.variants.forEach(v => {
                if (!groups[v.name]) groups[v.name] = [];
                groups[v.name].push(v);
            });

            Object.keys(groups).forEach(groupName => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'detail-variant-group';
                
                const title = document.createElement('div');
                title.className = 'detail-variant-title';
                title.textContent = groupName;
                groupDiv.appendChild(title);

                const optionsDiv = document.createElement('div');
                optionsDiv.className = 'detail-variant-options';

                groups[groupName].forEach((opt, idx) => {
                    const btn = document.createElement('button');
                    btn.className = 'detail-variant-btn' + (idx === 0 ? ' active' : '');
                    btn.textContent = opt.value;
                    
                    // Pre-select first options
                    if (idx === 0) {
                        currentSelectedVariants[groupName] = opt.value;
                    }

                    btn.addEventListener('click', () => {
                        optionsDiv.querySelectorAll('.detail-variant-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        currentSelectedVariants[groupName] = opt.value;

                        // Tilda photo linking logic: swap main image if option has image
                        if (opt.image) {
                            let resolvedUrl = opt.image;
                            if (!opt.image.startsWith('http') && !opt.image.startsWith('/') && !opt.image.startsWith('data:')) {
                                resolvedUrl = `/real-site/shop/${opt.image}`;
                            }
                            mainImg.style.opacity = '0.5';
                            setTimeout(() => {
                                mainImg.src = resolvedUrl;
                                mainImg.style.opacity = '1';
                            }, 150);

                            // Find and activate thumbnail matching this image if exists
                            const thumbs = previewsContainer.querySelectorAll('.gallery-preview-img');
                            thumbs.forEach(t => {
                                if (t.src.includes(opt.image)) {
                                    thumbs.forEach(other => other.classList.remove('active'));
                                    t.classList.add('active');
                                }
                            });
                        }
                    });

                    optionsDiv.appendChild(btn);
                });

                groupDiv.appendChild(optionsDiv);
                variantsContainer.appendChild(groupDiv);
            });
            variantsContainer.style.display = 'flex';
        } else {
            variantsContainer.style.display = 'none';
        }

        // Specs table load from Custom Fields
        const specsWrapper = document.getElementById('detail-specs-wrapper');
        const specsTable = document.getElementById('detail-specs-table');
        specsTable.innerHTML = '';
        
        let hasSpecs = false;
        if (product.customFields) {
            Object.keys(product.customFields).forEach(key => {
                const val = product.customFields[key];
                if (val && key !== 'Brand') { // brand already rendered on top
                    hasSpecs = true;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="spec-name">${key}</td>
                        <td class="spec-value">${val}</td>
                    `;
                    specsTable.appendChild(tr);
                }
            });
        }

        if (hasSpecs) {
            specsWrapper.style.display = 'block';
        } else {
            specsWrapper.style.display = 'none';
        }

        // Bind Add to Cart button inside modal
        const addToCartModalBtn = document.getElementById('detail-add-to-cart-btn');
        // Recreate button to clear previous event listeners
        const newAddBtn = addToCartModalBtn.cloneNode(true);
        addToCartModalBtn.parentNode.replaceChild(newAddBtn, addToCartModalBtn);

        newAddBtn.addEventListener('click', () => {
            addCartItem(product, { ...currentSelectedVariants });
            closeProductDetailModal();
            // Open cart for better feedback
            openCartModal();
        });

        modal.style.display = 'flex';
    };

    window.closeProductDetailModal = function() {
        const modal = document.getElementById('product-detail-modal');
        if (modal) modal.style.display = 'none';
    };

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

    // ==========================================================================
    // CART MODAL / CHECKOUT FLOW
    // ==========================================================================
    window.openCartModal = function() {
        const modal = document.getElementById('cart-modal');
        if (!modal) return;
        renderCart();
        modal.style.display = 'flex';
    };

    window.closeCartModal = function() {
        const modal = document.getElementById('cart-modal');
        if (modal) modal.style.display = 'none';
    };

    cartIcon?.addEventListener('click', (e) => {
        e.preventDefault();
        openCartModal();
    });

    function renderCart() {
        const listContainer = document.getElementById('cart-items-list');
        const emptyMsg = document.getElementById('cart-empty-message');
        const summarySec = document.getElementById('cart-summary-section');
        const totalPriceEl = document.getElementById('cart-total-price');

        listContainer.innerHTML = '';

        if (cart.length === 0) {
            emptyMsg.style.display = 'block';
            summarySec.style.display = 'none';
            return;
        }

        emptyMsg.style.display = 'none';
        summarySec.style.display = 'block';

        let cartTotal = 0;

        cart.forEach((item, idx) => {
            cartTotal += item.price * item.quantity;

            // Generate option string (e.g. Size: S, Color: Black)
            const optionParts = [];
            if (item.selectedVariants) {
                Object.keys(item.selectedVariants).forEach(k => {
                    optionParts.push(`${k}: ${item.selectedVariants[k]}`);
                });
            }
            const optionsHtml = optionParts.length > 0 
                ? `<div class="cart-item-options">${optionParts.join(', ')}</div>`
                : '';

            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <img src="${item.image || 'https://via.placeholder.com/100?text=Sneaker'}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    ${optionsHtml}
                    <div class="cart-item-price">${(item.price * item.quantity).toLocaleString('ru-RU')} ₽</div>
                    
                    <div class="cart-item-quantity-control" style="margin-top: 6px;">
                        <button class="qty-btn dec-btn">&minus;</button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="qty-btn inc-btn">&plus;</button>
                    </div>
                </div>
                <button class="cart-item-delete-btn" title="Удалить">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            // Bind quantity events
            row.querySelector('.inc-btn').addEventListener('click', () => {
                item.quantity += 1;
                saveCart();
                renderCart();
            });

            row.querySelector('.dec-btn').addEventListener('click', () => {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    cart.splice(idx, 1);
                }
                saveCart();
                renderCart();
            });

            row.querySelector('.cart-item-delete-btn').addEventListener('click', () => {
                cart.splice(idx, 1);
                saveCart();
                renderCart();
            });

            listContainer.appendChild(row);
        });

        totalPriceEl.textContent = `${cartTotal.toLocaleString('ru-RU')} ₽`;
    }

    // Checkout Form submission
    const checkoutForm = document.getElementById('checkout-form');
    checkoutForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = checkoutForm.querySelector('.checkout-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Оформление...';

        const clientName = document.getElementById('checkout-name').value.trim();
        const clientPhone = document.getElementById('checkout-phone').value.trim();
        const clientEmail = document.getElementById('checkout-email').value.trim();
        const comment = document.getElementById('checkout-comment').value.trim();

        // Format items for server. Note that name includes variants in brackets so admin sees them in CRM
        const items = cart.map(item => {
            const variantParts = [];
            if (item.selectedVariants) {
                Object.keys(item.selectedVariants).forEach(k => {
                    variantParts.push(`${k}: ${item.selectedVariants[k]}`);
                });
            }
            const nameWithVariants = variantParts.length > 0 
                ? `${item.name} (${variantParts.join(', ')})`
                : item.name;

            return {
                productId: item.productId,
                name: nameWithVariants,
                price: item.price,
                quantity: item.quantity
            };
        });

        try {
            const res = await fetch('/api/commerce/shop/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientName,
                    clientPhone,
                    clientEmail,
                    comment,
                    items
                })
            });

            if (res.ok) {
                alert('Спасибо за заказ! Наш менеджер свяжется с вами в ближайшее время.');
                cart = [];
                saveCart();
                closeCartModal();
                checkoutForm.reset();
            } else {
                const data = await res.json();
                alert(data.error || 'Произошла ошибка при отправке заказа. Пожалуйста, попробуйте снова.');
            }
        } catch (err) {
            console.error(err);
            alert('Ошибка сети. Проверьте подключение и повторите попытку.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Подтвердить заказ';
        }
    });

    // Listen to Search
    searchInput?.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadProducts(1);
        }, 300);
    });

    // Listen to Price Inputs with debounce
    function handlePriceChange() {
        minPrice = priceMinInput.value.trim();
        maxPrice = priceMaxInput.value.trim();
        
        clearTimeout(priceTimeout);
        priceTimeout = setTimeout(() => {
            loadProducts(1);
        }, 400);
    }

    priceMinInput?.addEventListener('input', handlePriceChange);
    priceMaxInput?.addEventListener('input', handlePriceChange);

    // Run Shop Initialization
    initShop();
});
