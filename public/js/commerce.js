// Check authentication first
async function checkAuth() {
    const res = await fetch('/api/check-auth');
    if (!res.ok) {
        window.location.href = '/login.html';
    }
}

// Global states
const urlParams = new URLSearchParams(window.location.search);
let siteId = urlParams.get('site') || localStorage.getItem('activeSite');
if (siteId === 'null' || siteId === 'undefined') {
    siteId = null;
}
let currentCommerceTab = 'analytics';

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backToDashboardBtn');
    if (backBtn && siteId) {
        backBtn.href = `/dashboard.html?site=${encodeURIComponent(siteId)}`;
    }
});
let salesChart = null;
let allCategories = [];
let allProducts = []; // for bundles selection dropdowns
let productSchema = { groups: [] };
let selectedGroupId = null;

let productsCurrentPage = 1;
let productsTotalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!siteId) {
        showToast('Проект не выбран', 'error');
        setTimeout(() => window.location.href = '/dashboard.html', 1500);
        return;
    }
    localStorage.setItem('activeSite', siteId);

    // Load site details to set title
    try {
        const res = await fetch(`/api/site-settings/${encodeURIComponent(siteId)}`);
        if (!res.ok) throw new Error();
        const settings = await res.json();
        document.getElementById('commerceSiteHeader').textContent = `Коммерция: ${settings.displayName || siteId}`;
    } catch (err) {
        console.error('Failed to load site settings', err);
    }

    // User info is loaded via theme.js check-auth

    // Wire up events
    let searchTimeout = null;
    document.getElementById('prodSearchInput')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadProducts(1);
        }, 300);
    });
    document.getElementById('prodCategoryFilter')?.addEventListener('change', () => loadProducts(1));
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (productsCurrentPage > 1) loadProducts(productsCurrentPage - 1);
    });
    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        if (productsCurrentPage < productsTotalPages) loadProducts(productsCurrentPage + 1);
    });

    document.getElementById('openAddProductBtn')?.addEventListener('click', openAddProductModal);
    document.getElementById('closeProductModalBtn')?.addEventListener('click', closeProductModal);
    document.getElementById('cancelProductBtn')?.addEventListener('click', closeProductModal);
    
    // Закрытие по клику на оверлей вне Drawer
    document.getElementById('productModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) {
            closeProductModal();
        }
    });
    document.getElementById('productActionForm')?.addEventListener('submit', saveProduct);

    document.getElementById('openTrashBinBtn')?.addEventListener('click', openTrashBinModal);
    
    initProductImageUpload();
    
    // CSV Actions
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportToCSV);
    document.getElementById('importCsvBtn')?.addEventListener('click', triggerCSVImport);
    document.getElementById('exportOrdersCsvBtn')?.addEventListener('click', exportOrdersToCSV);

    // Categories Form
    document.getElementById('categoryActionForm')?.addEventListener('submit', saveCategory);
    document.getElementById('catFormCancelBtn')?.addEventListener('click', resetCategoryForm);

    // Schema Actions
    document.getElementById('addSchemaGroupBtn')?.addEventListener('click', addSchemaGroup);
    document.getElementById('addSchemaFieldBtn')?.addEventListener('click', addSchemaField);

    // Initial load
    await initCommerce();
});

async function initCommerce() {
    await loadCategories();
    await loadProductsDropdown(); // for bundle selection
    await loadProducts(1);
    await loadSchemas();
    await loadOrders();
    await loadAnalytics();
    updateTrashCount();
}

// ----------------------------------------------------
// TAB SWITCHING
// ----------------------------------------------------
function switchCommerceTab(tab) {
    currentCommerceTab = tab;
    
    // Toggle active tab class
    document.querySelectorAll('.segmented-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeTabButton = document.getElementById(`tabCommerce${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (activeTabButton) activeTabButton.classList.add('active');

    // Toggle panels visibility
    document.querySelectorAll('.commerce-tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`panelCommerce${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (activePanel) activePanel.classList.add('active');

    // Show/hide Export Orders CSV button
    const exportBtn = document.getElementById('exportOrdersCsvBtn');
    if (exportBtn) {
        exportBtn.style.display = tab === 'orders' ? 'flex' : 'none';
    }

    // Specific tab loads
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'products') loadProducts(1);
    if (tab === 'categories') loadCategories();
    if (tab === 'fields') loadSchemas();
    if (tab === 'orders') loadOrders();
}

// ----------------------------------------------------
// 1. ANALYTICS
// ----------------------------------------------------
async function loadAnalytics() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/analytics`);
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById('statRevenue').textContent = `${data.totalRevenue.toLocaleString()} ₽`;
        document.getElementById('statOrders').textContent = data.completedOrdersCount;
        document.getElementById('statAvgCheck').textContent = `${data.avgCheck.toLocaleString()} ₽`;
        document.getElementById('statConversion').textContent = `${data.conversionRate}%`;

        // Render top products
        const topProductsList = document.getElementById('topProductsList');
        topProductsList.innerHTML = '';
        if (data.topProducts && data.topProducts.length > 0) {
            data.topProducts.forEach(p => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '8px 12px';
                row.style.background = 'var(--bg-body)';
                row.style.borderRadius = '8px';
                row.style.border = '1px solid var(--border)';
                row.innerHTML = `
                    <div style="font-weight: 500; color: var(--text-main); font-size: 0.9rem;">${p.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">${p.quantity} шт. (${p.revenue.toLocaleString()} ₽)</div>
                `;
                topProductsList.appendChild(row);
            });
        } else {
            topProductsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">Нет данных о продажах</div>';
        }

        // Render Sales Chart
        renderSalesChart();
    } catch (err) {
        console.error('Failed to load analytics', err);
    }
}

async function renderSalesChart() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/orders`);
        if (!res.ok) return;
        const orders = await res.json();

        // Group orders by last 7 days
        const last7Days = [];
        const revenueMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days.push(dateStr);
            revenueMap[dateStr] = 0;
        }

        orders.forEach(order => {
            if (order.status === 'completed' && order.createdAt) {
                const dateStr = order.createdAt.split('T')[0];
                if (revenueMap[dateStr] !== undefined) {
                    revenueMap[dateStr] += order.totalPrice;
                }
            }
        });

        const chartData = last7Days.map(d => revenueMap[d]);
        const chartLabels = last7Days.map(d => {
            const parts = d.split('-');
            return `${parts[2]}.${parts[1]}`;
        });

        const ctx = document.getElementById('commerceSalesChart');
        if (!ctx) return;

        if (salesChart) {
            salesChart.destroy();
        }

        const canvasCtx = ctx.getContext('2d');
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(0, 112, 243, 0.25)');
        gradient.addColorStop(1, 'rgba(0, 112, 243, 0)');

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Доход от продаж (₽)',
                    data: chartData,
                    borderColor: '#0070f3',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#0070f3',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#0070f3',
                    pointHoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Chart error', err);
    }
}

// ----------------------------------------------------
// 2. PRODUCTS
// ----------------------------------------------------
async function loadProducts(page = 1) {
    const search = document.getElementById('prodSearchInput').value;
    const category = document.getElementById('prodCategoryFilter').value;
    
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products?page=${page}&limit=10&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`);
        if (!res.ok) return;
        const data = await res.json();

        productsCurrentPage = data.page;
        productsTotalPages = data.totalPages;

        document.getElementById('paginatedShowingCount').textContent = data.products.length;
        document.getElementById('paginatedTotalCount').textContent = data.total;
        document.getElementById('pageNumberDisplay').textContent = `Страница ${data.page} из ${data.totalPages || 1}`;

        // Buttons state
        document.getElementById('prevPageBtn').disabled = productsCurrentPage <= 1;
        document.getElementById('nextPageBtn').disabled = productsCurrentPage >= productsTotalPages;

        renderProductsTable(data.products);
    } catch (err) {
        console.error('Failed to load products', err);
    }
}

async function loadProductsDropdown() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products?limit=1000`);
        if (res.ok) {
            const data = await res.json();
            allProducts = data.products || [];
        }
    } catch (err) {
        console.error(err);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: var(--text-muted);">Товары не найдены</td></tr>`;
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border)';
        tr.style.transition = 'background-color 0.15s ease';
        tr.style.cursor = 'pointer';
        tr.addEventListener('mouseenter', () => tr.style.backgroundColor = 'rgba(255,255,255,0.01)');
        tr.addEventListener('mouseleave', () => tr.style.backgroundColor = 'transparent');
        
        // Клик на саму строку открывает Drawer
        tr.addEventListener('click', () => {
            openEditProductModal(p.id);
        });

        const typeLabel = p.type === 'bundle' 
            ? '<span style="background: rgba(121, 40, 202, 0.1); color: #a155e8; font-size: 0.75rem; padding: 4px 8px; border-radius: 12px; font-weight: 600; border: 1px solid rgba(121, 40, 202, 0.15);">Комплект</span>' 
            : '<span style="background: rgba(255, 255, 255, 0.03); color: var(--text-muted); font-size: 0.75rem; padding: 4px 8px; border-radius: 12px; font-weight: 600; border: 1px solid var(--border);">Товар</span>';

        let imgUrl = (p.images && p.images.length > 0) ? p.images[0] : '';
        if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/') && !imgUrl.startsWith('data:')) {
            imgUrl = `/real-site/${siteId}/${imgUrl}`;
        }
        const imgHtml = imgUrl 
            ? `<img src="${imgUrl}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border);" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23666%22 stroke-width=%222%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22></rect><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22></circle><polyline points=%2221 15 16 10 5 21%22></polyline></svg>'">` 
            : `<div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-muted);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;

        // Опции для статуса
        const statusOptions = `
            <option value="active" ${p.status === 'active' ? 'selected' : ''}>Активен</option>
            <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Черновик</option>
            <option value="out_of_stock" ${p.status === 'out_of_stock' ? 'selected' : ''}>Нет в наличии</option>
            <option value="disabled" ${p.status === 'disabled' ? 'selected' : ''}>Скрыт</option>
        `;

        tr.innerHTML = `
            <td style="padding: 12px 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    ${imgHtml}
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">${p.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">ID: ${p.id.split('_')[1] || p.id}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 16px 20px;">
                <input type="text" class="inline-edit-sku" data-id="${p.id}" value="${p.sku || ''}" style="width: 130px; padding: 6px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-family: monospace; font-size: 0.9rem;" placeholder="SKU...">
            </td>
            <td style="padding: 16px 20px;">
                <input type="number" class="inline-edit-price" data-id="${p.id}" value="${p.price}" style="width: 100px; padding: 6px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-weight: 700; font-size: 0.9rem;" placeholder="Цена...">
            </td>
            <td style="padding: 16px 20px;">
                <input type="number" class="inline-edit-oldprice" data-id="${p.id}" value="${p.oldPrice || ''}" style="width: 100px; padding: 6px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-muted); font-size: 0.9rem;" placeholder="Старая цена...">
            </td>
            <td style="padding: 16px 20px;">
                <input type="number" class="inline-edit-stock" data-id="${p.id}" value="${p.stock}" style="width: 80px; padding: 6px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem;" placeholder="0">
            </td>
            <td style="padding: 16px 20px;">${typeLabel}</td>
            <td style="padding: 16px 20px;">
                <select class="inline-edit-status" data-id="${p.id}" style="padding: 6px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem; cursor: pointer; box-sizing: border-box;">
                    ${statusOptions}
                </select>
            </td>
            <td style="padding: 16px 20px; text-align: right;">
                <button class="btn btn-outline product-delete-btn" style="padding: 6px 12px; font-size: 0.8rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); border-radius: 6px;">Удалить</button>
            </td>
        `;

        // Останавливаем всплытие и вешаем обработчики на инпуты/кнопки
        tr.querySelectorAll('input, select, button').forEach(el => {
            el.addEventListener('click', e => e.stopPropagation());
        });

        // Кнопка удаления
        tr.querySelector('.product-delete-btn').addEventListener('click', () => {
            deleteProduct(p.id);
        });

        // Навешиваем автосохранение
        tr.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', async () => {
                const prodId = el.getAttribute('data-id');
                const val = el.value;
                let fieldName = '';
                
                if (el.classList.contains('inline-edit-sku')) fieldName = 'sku';
                else if (el.classList.contains('inline-edit-price')) fieldName = 'price';
                else if (el.classList.contains('inline-edit-oldprice')) fieldName = 'oldPrice';
                else if (el.classList.contains('inline-edit-stock')) fieldName = 'stock';
                else if (el.classList.contains('inline-edit-status')) fieldName = 'status';

                if (fieldName) {
                    await updateProductField(prodId, fieldName, val);
                }
            });
        });

        tbody.appendChild(tr);
    });
}

async function updateProductField(productId, fieldName, value) {
    const payload = {};
    
    // Преобразуем типы в зависимости от поля
    if (fieldName === 'price') {
        payload[fieldName] = value === '' ? 0 : parseFloat(value);
    } else if (fieldName === 'oldPrice') {
        payload[fieldName] = value === '' ? null : parseFloat(value);
    } else if (fieldName === 'stock') {
        payload[fieldName] = value === '' ? 0 : parseInt(value);
    } else {
        payload[fieldName] = value;
    }

    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products/${encodeURIComponent(productId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const data = await res.json();
            showToast(data.error || 'Ошибка при сохранении', 'error');
            loadProducts(productsCurrentPage);
        } else {
            showToast('Изменения сохранены', 'success');
            loadProductsDropdown();
        }
    } catch (err) {
        console.error(err);
        showToast('Ошибка сети при сохранении', 'error');
        loadProducts(productsCurrentPage);
    }
}

function initProductImageUpload() {
    const fileInput = document.getElementById('prodFormImageFileInput');
    const uploadStatus = document.getElementById('prodFormUploadStatus');
    const imagesTextarea = document.getElementById('prodFormImages');
    
    imagesTextarea?.addEventListener('input', updateImagePreviews);
    
    fileInput?.addEventListener('change', async () => {
        if (!fileInput.files.length) return;
        
        // Count existing images split by newline or comma
        const existingImages = imagesTextarea.value.split(/\r?\n|,/)
            .map(s => s.trim())
            .filter(Boolean);
            
        // 1. Validation: Limit max 10 images per product
        const totalImages = existingImages.length + fileInput.files.length;
        if (totalImages > 10) {
            showToast('Максимум 10 изображений на один товар', 'error');
            fileInput.value = ''; // reset selection
            return;
        }
        
        // 2. Validation: Limit max 5MB per file
        const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            if (file.size > maxSizeBytes) {
                showToast(`Файл "${file.name}" превышает 5 МБ`, 'error');
                fileInput.value = ''; // reset selection
                return;
            }
        }
        
        uploadStatus.textContent = 'Загрузка...';
        
        const formData = new FormData();
        formData.append('path', siteId + '/images'); // save in site/shop/images
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }
        
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: formData
            });
            const data = await res.json();
            if (data.success && data.files) {
                // Convert full URLs to relative (site-relative) paths
                // e.g. "/real-site/shop/images/name.jpg" -> "images/name.jpg"
                const relativePaths = data.files.map(f => {
                    const prefix = `/real-site/${siteId}/`;
                    return f.url.startsWith(prefix) ? f.url.substring(prefix.length) : f.url;
                });
                
                const currentVal = imagesTextarea.value.trim();
                const separator = currentVal ? '\n' : '';
                imagesTextarea.value = currentVal + separator + relativePaths.join('\n');
                
                uploadStatus.textContent = `Загружено: ${data.files.length}`;
                setTimeout(() => uploadStatus.textContent = '', 3000);
                
                // Live preview update
                updateImagePreviews();
            } else {
                uploadStatus.textContent = 'Ошибка загрузки';
            }
        } catch (err) {
            uploadStatus.textContent = 'Ошибка сети';
            console.error(err);
        } finally {
            fileInput.value = ''; // clear input for next upload
        }
    });
}

function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Добавить товар';
    document.getElementById('editingProductId').value = '';
    document.getElementById('productActionForm').reset();
    
    // Reset selections
    document.getElementById('prodFormType').value = 'product';
    toggleBundlePanel();
    document.getElementById('bundleItemsList').innerHTML = '';
    
    renderCategoriesCheckboxes([]);
    renderCustomFieldsSchemaInputs({});
    
    // Reset variants list
    document.getElementById('prodFormVariantsList').innerHTML = '';
    
    // Reset image previews
    updateImagePreviews();

    // Reset system properties
    document.getElementById('prodFormBadge').value = '';
    document.getElementById('prodFormUseColor').checked = false;
    document.getElementById('prodFormUseDimensions').checked = false;
    document.getElementById('prodFormColorHex').value = '#000000';
    document.getElementById('prodFormColorName').value = '';
    document.getElementById('prodFormLength').value = '';
    document.getElementById('prodFormWidth').value = '';
    document.getElementById('prodFormHeight').value = '';
    document.getElementById('prodFormWeight').value = '';
    toggleSystemColorPanel();
    toggleSystemDimensionsPanel();

    if (typeof initCustomSelect === 'function') {
        initCustomSelect(document.getElementById('prodFormType'));
        initCustomSelect(document.getElementById('prodFormStatus'));
    }
    
    document.getElementById('productModal').style.display = 'flex';
}

async function openEditProductModal(productId) {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products?limit=1000`);
        if (!res.ok) return;
        const data = await res.json();
        const p = data.products.find(item => item.id === productId);
        if (!p) return;

        document.getElementById('productModalTitle').textContent = 'Редактировать товар';
        document.getElementById('editingProductId').value = p.id;
        
        document.getElementById('prodFormName').value = p.name;
        document.getElementById('prodFormSku').value = p.sku || '';
        document.getElementById('prodFormPrice').value = p.price;
        document.getElementById('prodFormOldPrice').value = p.oldPrice || '';
        document.getElementById('prodFormStock').value = p.stock !== undefined ? p.stock : '';
        document.getElementById('prodFormStatus').value = p.status;
        document.getElementById('prodFormDescription').value = p.description || '';
        document.getElementById('prodFormImages').value = (p.images || []).join('\n');
        document.getElementById('prodFormType').value = p.type || 'product';
        
        document.getElementById('prodFormSeoTitle').value = p.seo?.title || '';
        document.getElementById('prodFormSeoDesc').value = p.seo?.description || '';

        // Categories check
        renderCategoriesCheckboxes(p.categories || []);
        
        // Custom fields inputs populate
        renderCustomFieldsSchemaInputs(p.customFields || {});

        // Bundle composition
        toggleBundlePanel();
        const bundleItemsList = document.getElementById('bundleItemsList');
        bundleItemsList.innerHTML = '';
        if (p.bundleItems && p.bundleItems.length > 0) {
            p.bundleItems.forEach(item => {
                addBundleRow(item.productId, item.quantity, item.customPrice, item.customDescription);
            });
        }

        // Render variants (grouped by property name - Tilda style)
        const variantsList = document.getElementById('prodFormVariantsList');
        variantsList.innerHTML = '';
        if (p.variants && p.variants.length > 0) {
            const groups = {};
            p.variants.forEach(v => {
                const name = v.name || 'Свойство';
                if (!groups[name]) groups[name] = [];
                groups[name].push({ value: v.value || '', image: v.image || '' });
            });
            Object.keys(groups).forEach(name => {
                addVariantPropertyBlock(name, groups[name]);
            });
        }

        // Render image previews
        updateImagePreviews();

        // Populate system properties
        document.getElementById('prodFormBadge').value = p.badge || '';
        
        const useColor = !!(p.colorHex || p.colorName);
        document.getElementById('prodFormUseColor').checked = useColor;
        document.getElementById('prodFormColorHex').value = p.colorHex || '#000000';
        document.getElementById('prodFormColorName').value = p.colorName || '';
        
        const useDim = !!(p.length || p.width || p.height || p.weight);
        document.getElementById('prodFormUseDimensions').checked = useDim;
        document.getElementById('prodFormLength').value = p.length || '';
        document.getElementById('prodFormWidth').value = p.width || '';
        document.getElementById('prodFormHeight').value = p.height || '';
        document.getElementById('prodFormWeight').value = p.weight || '';
        
        toggleSystemColorPanel();
        toggleSystemDimensionsPanel();

        if (typeof initCustomSelect === 'function') {
            initCustomSelect(document.getElementById('prodFormType'));
            initCustomSelect(document.getElementById('prodFormStatus'));
        }

        document.getElementById('productModal').style.display = 'flex';
    } catch (err) {
        showToast('Ошибка при загрузке товара', 'error');
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    modal.classList.add('closing');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
        document.getElementById('editingProductId').value = '';
        document.getElementById('productActionForm').reset();
        document.getElementById('prodFormImagePreviewContainer').innerHTML = '';
        document.getElementById('prodFormVariantsList').innerHTML = '';
    }, 250);
}

function toggleBundlePanel() {
    const type = document.getElementById('prodFormType').value;
    const panel = document.getElementById('bundleItemsPanel');
    if (type === 'bundle') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function addBundleRow(selectedProdId = '', qty = 1, customPrice = '', customDesc = '') {
    const list = document.getElementById('bundleItemsList');
    const rowId = 'bundle_row_' + Math.random().toString(36).substring(2, 9);
    
    const div = document.createElement('div');
    div.id = rowId;
    div.style.display = 'grid';
    div.style.gridTemplateColumns = '2fr 1fr 1fr 2fr auto';
    div.style.gap = '8px';
    div.style.alignItems = 'center';
    
    // Select dropdown for items
    let optionsStr = `<option value="">Выберите товар...</option>`;
    allProducts.forEach(p => {
        if (p.type !== 'bundle') { // Prevent nesting bundles in bundles
            optionsStr += `<option value="${p.id}" ${p.id === selectedProdId ? 'selected' : ''}>${p.name} (${p.price} ₽)</option>`;
        }
    });
    
    div.innerHTML = `
        <select class="bundle-prod-select" style="padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); cursor: pointer;">
            ${optionsStr}
        </select>
        <input type="number" class="bundle-prod-qty" placeholder="Кол-во" value="${qty}" style="padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);">
        <input type="number" class="bundle-prod-price" placeholder="Своя цена" value="${customPrice}" style="padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);">
        <input type="text" class="bundle-prod-desc" placeholder="Кастомное описание" value="${customDesc}" style="padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);">
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="btn btn-outline" style="padding: 8px; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">&times;</button>
    `;
    list.appendChild(div);

    const sel = div.querySelector('.bundle-prod-select');
    if (sel && typeof initCustomSelect === 'function') {
        initCustomSelect(sel);
    }
}

function renderCategoriesCheckboxes(checkedIds = []) {
    const container = document.getElementById('prodFormCategoriesContainer');
    container.innerHTML = '';
    
    if (allCategories.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0; grid-column: span 3;">Создайте категории на вкладке «Категории»</div>';
        return;
    }

    allCategories.forEach(cat => {
        const btn = document.createElement('div');
        btn.className = 'cat-btn';
        const isChecked = checkedIds.includes(cat.id);
        if (isChecked) {
            btn.classList.add('active');
        }
        
        const prefix = cat.parentId ? '— ' : '';
        btn.textContent = `${prefix}${cat.name}`;
        btn.setAttribute('data-id', cat.id);
        
        // Скрытый чекбокс для совместимости с saveProduct()
        const hiddenCheckbox = document.createElement('input');
        hiddenCheckbox.type = 'checkbox';
        hiddenCheckbox.className = 'prod-cat-checkbox';
        hiddenCheckbox.value = cat.id;
        hiddenCheckbox.checked = isChecked;
        hiddenCheckbox.style.display = 'none';
        btn.appendChild(hiddenCheckbox);
        
        btn.addEventListener('click', () => {
            const cb = btn.querySelector('.prod-cat-checkbox');
            cb.checked = !cb.checked;
            if (cb.checked) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        container.appendChild(btn);
    });
}

function renderCustomFieldsSchemaInputs(values = {}) {
    const container = document.getElementById('prodFormCustomFieldsContainer');
    container.innerHTML = '';
    
    let hasFields = false;
    productSchema.groups.forEach(group => {
        if (group.fields && group.fields.length > 0) {
            hasFields = true;
            group.fields.forEach(field => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                div.style.gap = '4px';
                
                const val = values[field.id] !== undefined ? values[field.id] : '';
                
                let inputHtml = '';
                if (field.type === 'text') {
                    inputHtml = `<input type="text" class="prod-custom-field-input" data-field-id="${field.id}" value="${val}" style="padding: 8px 12px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);">`;
                } else if (field.type === 'number') {
                    inputHtml = `<input type="number" step="any" class="prod-custom-field-input" data-field-id="${field.id}" value="${val}" style="padding: 8px 12px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);">`;
                } else if (field.type === 'boolean') {
                    const checked = val === 'true' || val === true;
                    inputHtml = `
                        <label class="switch" style="width: fit-content;">
                            <input type="checkbox" class="prod-custom-field-input" data-field-id="${field.id}" ${checked ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    `;
                } else if (field.type === 'select') {
                    let opts = `<option value="">Не выбрано</option>`;
                    if (field.options) {
                        field.options.forEach(opt => {
                            opts += `<option value="${opt}" ${opt === val ? 'selected' : ''}>${opt}</option>`;
                        });
                    }
                    inputHtml = `<select class="prod-custom-field-input" data-field-id="${field.id}" style="padding: 8px 12px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); cursor: pointer;">${opts}</select>`;
                }
                
                div.innerHTML = `
                    <label style="font-size: 0.8rem; color: var(--text-muted);">${field.name} (${group.name})</label>
                    ${inputHtml}
                `;
                container.appendChild(div);
            });
        }
    });
    
    container.querySelectorAll('select').forEach(sel => {
        if (typeof initCustomSelect === 'function') initCustomSelect(sel);
    });

    const block = document.getElementById('prodFormCustomFieldsBlock');
    if (hasFields) {
        block.style.display = 'block';
    } else {
        block.style.display = 'none';
    }
}

async function saveProduct(e) {
    e.preventDefault();
    const editingId = document.getElementById('editingProductId').value;
    
    // Checked categories
    const checkedCats = [];
    document.querySelectorAll('.prod-cat-checkbox:checked').forEach(cb => {
        checkedCats.push(cb.value);
    });

    // Custom fields value
    const customFields = {};
    document.querySelectorAll('.prod-custom-field-input').forEach(el => {
        const fId = el.getAttribute('data-field-id');
        if (el.type === 'checkbox') {
            customFields[fId] = el.checked;
        } else {
            customFields[fId] = el.value;
        }
    });

    // Bundle items
    const bundleItems = [];
    if (document.getElementById('prodFormType').value === 'bundle') {
        const rows = document.querySelectorAll('#bundleItemsList > div');
        let valid = true;
        rows.forEach(row => {
            const pSelect = row.querySelector('.bundle-prod-select');
            const pQty = row.querySelector('.bundle-prod-qty');
            const pPrice = row.querySelector('.bundle-prod-price');
            const pDesc = row.querySelector('.bundle-prod-desc');
            
            if (pSelect && pSelect.value) {
                bundleItems.push({
                    productId: pSelect.value,
                    quantity: parseInt(pQty.value) || 1,
                    customPrice: pPrice.value ? parseFloat(pPrice.value) : null,
                    customDescription: pDesc.value || ''
                });
            } else {
                valid = false;
            }
        });
        if (!valid) {
            showToast('Заполните товары в комплекте или удалите лишние строки', 'error');
            return;
        }
    }

    // Variants config (collecting from Tilda-style property blocks)
    const variants = [];
    document.querySelectorAll('#prodFormVariantsList .variant-property-block').forEach(block => {
        const propNameInput = block.querySelector('.variant-prop-name-input');
        const propName = propNameInput ? propNameInput.value.trim() : '';
        if (!propName) return;

        block.querySelectorAll('.variant-value-row').forEach(row => {
            const valInput = row.querySelector('.variant-val-input');
            const imgSelect = row.querySelector('.variant-img-select');
            
            const val = valInput ? valInput.value.trim() : '';
            const img = imgSelect ? imgSelect.value : '';
            
            if (val) {
                variants.push({
                    name: propName,
                    value: val,
                    image: img
                });
            }
        });
    });

    const useColor = document.getElementById('prodFormUseColor').checked;
    const useDim = document.getElementById('prodFormUseDimensions').checked;

    const payload = {
        name: document.getElementById('prodFormName').value,
        sku: document.getElementById('prodFormSku').value,
        price: parseFloat(document.getElementById('prodFormPrice').value) || 0,
        oldPrice: document.getElementById('prodFormOldPrice').value ? parseFloat(document.getElementById('prodFormOldPrice').value) : null,
        stock: parseInt(document.getElementById('prodFormStock').value) || 0,
        status: document.getElementById('prodFormStatus').value,
        categories: checkedCats,
        tags: [], // extension for future
        description: document.getElementById('prodFormDescription').value,
        images: document.getElementById('prodFormImages').value.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean),
        customFields,
        seo: {
            title: document.getElementById('prodFormSeoTitle').value,
            description: document.getElementById('prodFormSeoDesc').value,
            keywords: ''
        },
        type: document.getElementById('prodFormType').value,
        bundleItems,
        variants,
        badge: document.getElementById('prodFormBadge').value.trim(),
        colorHex: useColor ? document.getElementById('prodFormColorHex').value : null,
        colorName: useColor ? document.getElementById('prodFormColorName').value.trim() : null,
        length: useDim ? (parseFloat(document.getElementById('prodFormLength').value) || null) : null,
        width: useDim ? (parseFloat(document.getElementById('prodFormWidth').value) || null) : null,
        height: useDim ? (parseFloat(document.getElementById('prodFormHeight').value) || null) : null,
        weight: useDim ? (parseFloat(document.getElementById('prodFormWeight').value) || null) : null
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
        ? `/api/commerce/${encodeURIComponent(siteId)}/products/${encodeURIComponent(editingId)}`
        : `/api/commerce/${encodeURIComponent(siteId)}/products`;

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(editingId ? 'Товар изменен' : 'Товар добавлен', 'success');
            closeProductModal();
            loadProducts(productsCurrentPage);
            loadProductsDropdown(); // reload list
        } else {
            const err = await res.json();
            showToast(err.error || 'Ошибка сохранения товара', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
}

async function deleteProduct(productId) {
    if (!await showCustomConfirm('Вы уверены, что хотите переместить товар в корзину?')) return;
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products/${encodeURIComponent(productId)}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        if (res.ok) {
            showToast('Товар перемещен в корзину', 'success');
            loadProducts(productsCurrentPage);
            updateTrashCount();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
}

// ----------------------------------------------------
// TRASH BIN
// ----------------------------------------------------
async function updateTrashCount() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products-trash`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('trashCount').textContent = data.length;
        }
    } catch (e) {}
}

async function openTrashBinModal() {
    await loadTrashBin();
    document.getElementById('trashBinModal').style.display = 'flex';
}

async function loadTrashBin() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products-trash`);
        if (!res.ok) return;
        const trash = await res.json();
        
        const tbody = document.getElementById('trashTableBody');
        tbody.innerHTML = '';
        
        if (trash.length === 0) {
            document.getElementById('trashEmptyMsg').style.display = 'block';
            return;
        }
        document.getElementById('trashEmptyMsg').style.display = 'none';

        trash.forEach(p => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            const delDate = p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : '—';
            tr.innerHTML = `
                <td style="padding: 10px; font-weight: 500; color: var(--text-main);">${p.name}</td>
                <td style="padding: 10px; font-family: monospace;">${p.sku || '—'}</td>
                <td style="padding: 10px; font-size: 0.85rem; color: var(--text-muted);">${delDate}</td>
                <td style="padding: 10px; text-align: right;">
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: var(--primary); border-color: rgba(0, 112, 243, 0.2); margin-right: 6px;" onclick="restoreProduct('${p.id}')">Восстановить</button>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);" onclick="forceDeleteProduct('${p.id}')">Навсегда</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function restoreProduct(id) {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products/${encodeURIComponent(id)}/restore`, {
            method: 'POST',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        if (res.ok) {
            showToast('Товар восстановлен', 'success');
            loadTrashBin();
            loadProducts(productsCurrentPage);
            updateTrashCount();
        } else {
            showToast('Ошибка восстановления', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

async function forceDeleteProduct(id) {
    if (!await showCustomConfirm('Вы уверены, что хотите окончательно удалить этот товар? Это действие необратимо.')) return;
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products/${encodeURIComponent(id)}/force`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        if (res.ok) {
            showToast('Товар удален навсегда', 'success');
            loadTrashBin();
            updateTrashCount();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

// ----------------------------------------------------
// 3. CATEGORIES
// ----------------------------------------------------
async function loadCategories() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/categories`);
        if (!res.ok) return;
        allCategories = await res.json();

        // Sort categories by tree order
        const tree = buildTreeList(allCategories);
        renderCategoriesTree(tree);
        populateCategoriesDropdowns();
    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

function buildTreeList(flatList) {
    // Sort flat list by parentId and sortOrder
    const sorted = [...flatList].sort((a, b) => a.sortOrder - b.sortOrder);
    const result = [];
    
    function addChildren(parentId, level) {
        const children = sorted.filter(c => c.parentId === parentId);
        children.forEach(child => {
            result.push({
                ...child,
                level
            });
            addChildren(child.id, level + 1);
        });
    }
    
    // Level 1 roots
    const roots = sorted.filter(c => !c.parentId);
    roots.forEach(root => {
        result.push({
            ...root,
            level: 1
        });
        addChildren(root.id, 2);
    });
    
    return result;
}

function renderCategoriesTree(tree) {
    const list = document.getElementById('categoriesTreeList');
    list.innerHTML = '';
    
    if (tree.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">Нет категорий</div>';
        return;
    }

    const container = document.createElement('div');
    container.className = 'categories-tree-container';

    tree.forEach(cat => {
        const div = document.createElement('div');
        div.className = `category-tree-item category-level-${cat.level}`;
        
        let iconHtml = '';
        if (cat.level === 1) {
            iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; color: var(--primary); display: inline-block; vertical-align: middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        } else if (cat.level === 2) {
            iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; color: var(--accent); display: inline-block; vertical-align: middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        } else if (cat.level === 3) {
            iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; color: var(--text-muted); display: inline-block; vertical-align: middle;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7" y2="7"></line></svg>`;
        }

        // Кнопка быстрого добавления подкатегории (только для уровней 1 и 2)
        const addSubBtn = cat.level < 3 
            ? `<button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; color: var(--primary); border-color: rgba(0, 112, 243, 0.2); display: flex; align-items: center;" onclick="quickAddSubcategory('${cat.id}')" title="Добавить подкатегорию">+</button>`
            : '';

        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                ${iconHtml}
                <span style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">${cat.name}</span>
            </div>
            <div class="category-actions" style="display: flex; gap: 8px; align-items: center;">
                ${addSubBtn}
                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px;" onclick="editCategory('${cat.id}')">Изменить</button>
                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); border-radius: 6px;" onclick="deleteCategory('${cat.id}')">Удалить</button>
            </div>
        `;
        container.appendChild(div);
    });
    list.appendChild(container);
}

window.quickAddSubcategory = function(parentId) {
    document.getElementById('editingCategoryId').value = '';
    document.getElementById('categoryFormTitle').textContent = 'Добавить категорию';
    document.getElementById('catFormSubmitBtn').textContent = 'Создать категорию';
    document.getElementById('catFormCancelBtn').style.display = 'none';
    
    const select = document.getElementById('catFormParent');
    select.value = parentId;
    if (typeof initCustomSelect === 'function') {
        initCustomSelect(select);
    }
    
    const nameInput = document.getElementById('catFormName');
    nameInput.value = '';
    nameInput.focus();
};

function populateCategoriesDropdowns() {
    const parentSelect = document.getElementById('catFormParent');
    const filterSelect = document.getElementById('prodCategoryFilter');
    
    // Clear
    parentSelect.innerHTML = '<option value="">Без родителя (Верхний уровень)</option>';
    filterSelect.innerHTML = '<option value="">Все категории</option>';
    
    allCategories.forEach(cat => {
        // Parent select inside form
        const isSelected = cat.parentId ? '— ' : '';
        parentSelect.innerHTML += `<option value="${cat.id}">${isSelected}${cat.name}</option>`;
        
        // Product list filter
        filterSelect.innerHTML += `<option value="${cat.id}">${isSelected}${cat.name}</option>`;
    });

    if (typeof initCustomSelect === 'function') {
        initCustomSelect(parentSelect);
        initCustomSelect(filterSelect);
    }
}

async function saveCategory(e) {
    e.preventDefault();
    const editingId = document.getElementById('editingCategoryId').value;
    const name = document.getElementById('catFormName').value;
    const parentId = document.getElementById('catFormParent').value;

    const payload = {
        name,
        parentId: parentId || null
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
        ? `/api/commerce/${encodeURIComponent(siteId)}/categories/${encodeURIComponent(editingId)}`
        : `/api/commerce/${encodeURIComponent(siteId)}/categories`;

    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(editingId ? 'Категория изменена' : 'Категория создана', 'success');
            resetCategoryForm();
            loadCategories();
        } else {
            const err = await res.json();
            showToast(err.error || 'Ошибка сохранения категории', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
}

function editCategory(id) {
    const cat = allCategories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('categoryFormTitle').textContent = 'Редактировать категорию';
    document.getElementById('editingCategoryId').value = cat.id;
    document.getElementById('catFormName').value = cat.name;
    document.getElementById('catFormParent').value = cat.parentId || '';
    
    document.getElementById('catFormSubmitBtn').textContent = 'Сохранить изменения';
    document.getElementById('catFormCancelBtn').style.display = 'inline-block';
}

function resetCategoryForm() {
    document.getElementById('categoryFormTitle').textContent = 'Добавить категорию';
    document.getElementById('editingCategoryId').value = '';
    document.getElementById('catFormName').value = '';
    document.getElementById('catFormParent').value = '';
    
    document.getElementById('catFormSubmitBtn').textContent = 'Создать категорию';
    document.getElementById('catFormCancelBtn').style.display = 'none';
}

async function deleteCategory(id) {
    if (!await showCustomConfirm('При удалении категории все дочерние подкатегории поднимутся на уровень выше. Продолжить?')) return;
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/categories/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        if (res.ok) {
            showToast('Категория удалена', 'success');
            loadCategories();
        } else {
            showToast('Ошибка удаления категории', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
}

// ----------------------------------------------------
// 4. FIELDS CONSTRUCTOR
// ----------------------------------------------------
async function loadSchemas() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/schemas`);
        if (!res.ok) return;
        productSchema = await res.json();

        renderSchemaGroups();
        if (selectedGroupId) {
            selectSchemaGroup(selectedGroupId);
        } else {
            document.getElementById('selectedGroupFieldsBlock').style.display = 'none';
            document.getElementById('noGroupSelectedMessage').style.display = 'block';
        }
    } catch (err) {
        console.error('Failed to load schemas', err);
    }
}

function renderSchemaGroups() {
    const container = document.getElementById('schemaGroupsContainer');
    container.innerHTML = '';

    if (productSchema.groups.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">Группы полей не созданы</div>';
        return;
    }

    productSchema.groups.forEach(group => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '12px 16px';
        div.style.border = '1px solid var(--border)';
        div.style.borderRadius = '8px';
        div.style.background = selectedGroupId === group.id ? 'var(--bg-active)' : 'var(--bg-body)';
        div.style.cursor = 'pointer';
        div.style.transition = 'all 0.15s ease';
        
        div.addEventListener('click', () => selectSchemaGroup(group.id));

        div.innerHTML = `
            <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">${group.name}</div>
            <div style="display: flex; gap: 8px; align-items: center;" onclick="event.stopPropagation();">
                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="renameSchemaGroup('${group.id}')">Переименовать</button>
                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);" onclick="deleteSchemaGroup('${group.id}')">Удалить</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function selectSchemaGroup(groupId) {
    selectedGroupId = groupId;
    
    // Highlight group card
    renderSchemaGroups();

    const group = productSchema.groups.find(g => g.id === groupId);
    if (!group) {
        selectedGroupId = null;
        document.getElementById('selectedGroupFieldsBlock').style.display = 'none';
        document.getElementById('noGroupSelectedMessage').style.display = 'block';
        return;
    }

    document.getElementById('selectedGroupNameHeader').textContent = group.name;
    document.getElementById('selectedGroupFieldsBlock').style.display = 'block';
    document.getElementById('noGroupSelectedMessage').style.display = 'none';

    renderSchemaFields(group.fields);
}

function renderSchemaFields(fields) {
    const list = document.getElementById('schemaFieldsList');
    list.innerHTML = '';

    if (!fields || fields.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px;">Нет полей в этой группе</div>';
        return;
    }

    fields.forEach(field => {
        const card = document.createElement('div');
        card.className = 'field-card';
        
        let typeText = '';
        if (field.type === 'text') typeText = 'Текст';
        else if (field.type === 'number') typeText = 'Число';
        else if (field.type === 'boolean') typeText = 'Логическое';
        else if (field.type === 'select') typeText = `Список (${(field.options || []).join(', ')})`;
        else if (field.type === 'color') typeText = `Цвета (${(field.options || []).map(o => o.split('|')[1] || o).join(', ')})`;

        card.innerHTML = `
            <div>
                <div style="font-weight: 500; color: var(--text-main); font-size: 0.9rem;">${field.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${typeText}</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editSchemaField('${field.id}')">Изменить</button>
                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);" onclick="deleteSchemaField('${field.id}')">Удалить</button>
            </div>
        `;
        list.appendChild(card);
    });
}

async function addSchemaGroup() {
    const name = await showCustomPrompt('Введите название группы характеристик (например, Экран):');
    if (!name) return;

    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/schemas/groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            showToast('Группа создана', 'success');
            const data = await res.json();
            selectedGroupId = data.id;
            loadSchemas();
        } else {
            showToast('Ошибка создания группы', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

async function renameSchemaGroup(groupId) {
    const group = productSchema.groups.find(g => g.id === groupId);
    if (!group) return;

    const name = await showCustomPrompt('Введите новое название группы:', group.name);
    if (!name || name === group.name) return;

    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/schemas/groups/${encodeURIComponent(groupId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ name })
        });
        if (res.ok) {
            showToast('Группа изменена', 'success');
            loadSchemas();
        } else {
            showToast('Ошибка переименования', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

async function deleteSchemaGroup(groupId) {
    if (!await showCustomConfirm('Вы уверены, что хотите удалить эту группу вместе со всеми её полями?')) return;
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/schemas/groups/${encodeURIComponent(groupId)}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        if (res.ok) {
            showToast('Группа удалена', 'success');
            if (selectedGroupId === groupId) selectedGroupId = null;
            loadSchemas();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

async function addSchemaField() {
    if (!selectedGroupId) return;

    const name = await showCustomPrompt('Введите название поля (например, Разрешение экрана):');
    if (!name) return;

    const type = await showCustomPrompt('Введите тип поля: text (текст), number (число), boolean (да/нет), select (список), color (цвета вариантов):');
    if (!type || !['text', 'number', 'boolean', 'select', 'color'].includes(type)) {
        showToast('Неверный тип поля', 'error');
        return;
    }

    let options = [];
    if (type === 'select') {
        const optsStr = await showCustomPrompt('Введите варианты списка через запятую (например, Amoled, IPS, OLED):');
        if (optsStr) {
            options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
        }
    } else if (type === 'color') {
        const optsStr = await showCustomPrompt('Введите варианты цветов через запятую в формате #Код|Название (например, #ff0000|Красный, #0000ff|Синий):');
        if (optsStr) {
            options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/schemas/groups/${encodeURIComponent(selectedGroupId)}/fields`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ name, type, options })
        });
        if (res.ok) {
            showToast('Поле добавлено', 'success');
            loadSchemas();
        } else {
            showToast('Ошибка добавления поля', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

async function editSchemaField(fieldId) {
    if (!selectedGroupId) return;
    const group = productSchema.groups.find(g => g.id === selectedGroupId);
    if (!group) return;
    const field = group.fields.find(f => f.id === fieldId);
    if (!field) return;

    const name = await showCustomPrompt('Введите новое название поля:', field.name);
    if (!name) return;

    const type = await showCustomPrompt('Введите новый тип поля: text, number, boolean, select, color:', field.type);
    if (!type || !['text', 'number', 'boolean', 'select', 'color'].includes(type)) {
        showToast('Неверный тип поля', 'error');
        return;
    }

    let options = [];
    if (type === 'select') {
        const optsStr = await showCustomPrompt('Введите варианты списка через запятую:', (field.options || []).join(', '));
        if (optsStr) {
            options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
        }
    } else if (type === 'color') {
        const optsStr = await showCustomPrompt('Введите цвета через запятую в формате #Код|Название:', (field.options || []).join(', '));
        if (optsStr) {
            options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/schemas/groups/${encodeURIComponent(selectedGroupId)}/fields/${encodeURIComponent(fieldId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ name, type, options })
        });
        if (res.ok) {
            showToast('Поле изменено', 'success');
            loadSchemas();
        } else {
            showToast('Ошибка изменения поля', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

async function deleteSchemaField(fieldId) {
    if (!selectedGroupId) return;
    if (!await showCustomConfirm('Вы уверены, что хотите удалить это поле?')) return;
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/schemas/groups/${encodeURIComponent(selectedGroupId)}/fields/${encodeURIComponent(fieldId)}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        if (res.ok) {
            showToast('Поле удалено', 'success');
            loadSchemas();
        } else {
            showToast('Ошибка удаления поля', 'error');
        }
    } catch (e) {
        showToast('Ошибка сети', 'error');
    }
}

// ----------------------------------------------------
// 5. CRM ORDERS
// ----------------------------------------------------
async function loadOrders() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/orders`);
        if (!res.ok) return;
        const orders = await res.json();

        // Sort orders by newest
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">Заказы не поступали</td></tr>`;
            return;
        }

        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            
            let badgeClass = '';
            let statusText = '';
            if (o.status === 'new') { badgeClass = 'order-status-new'; statusText = 'Новый'; }
            else if (o.status === 'processing') { badgeClass = 'order-status-processing'; statusText = 'В обработке'; }
            else if (o.status === 'completed') { badgeClass = 'order-status-completed'; statusText = 'Выполнен'; }
            else if (o.status === 'cancelled') { badgeClass = 'order-status-cancelled'; statusText = 'Отменен'; }

            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString() : '—';

            tr.innerHTML = `
                <td style="padding: 16px 20px; font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${o.orderId}</td>
                <td style="padding: 16px 20px;">
                    <div style="font-weight: 500; color: var(--text-main); font-size: 0.9rem;">${o.clientName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${o.clientPhone}</div>
                </td>
                <td style="padding: 16px 20px; font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${o.totalPrice.toLocaleString()} ₽</td>
                <td style="padding: 16px 20px; font-size: 0.95rem; color: var(--text-muted);">${dateStr}</td>
                <td style="padding: 16px 20px;"><span class="order-badge ${badgeClass}">${statusText}</span></td>
                <td style="padding: 16px 20px; text-align: right;">
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="viewOrderDetails('${o.id}')">Просмотр</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load orders', err);
    }
}

async function viewOrderDetails(orderId) {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/orders`);
        if (!res.ok) return;
        const orders = await res.json();
        const o = orders.find(item => item.id === orderId);
        if (!o) return;

        document.getElementById('orderDetailTitle').textContent = `Детали заказа ${o.orderId}`;
        const content = document.getElementById('orderDetailContent');
        
        let statusSelectOptions = `
            <option value="new" ${o.status === 'new' ? 'selected' : ''}>Новый</option>
            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>В обработке</option>
            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Выполнен</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
        `;

        let itemsListHtml = '';
        o.items.forEach(item => {
            itemsListHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
                    <div>
                        <div style="font-weight: 500; font-size: 0.9rem; color: var(--text-main);">${item.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Код: ${item.productId || '—'}</div>
                    </div>
                    <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${item.quantity} шт. x ${item.price} ₽</div>
                </div>
            `;
        });

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                <div>
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">ФИО Клиента</span>
                    <div style="font-size: 1rem; color: var(--text-main); font-weight: 600; margin-top: 4px;">${o.clientName}</div>
                </div>
                <div>
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Телефон</span>
                    <div style="font-size: 1rem; color: var(--text-main); font-weight: 600; margin-top: 4px;">${o.clientPhone}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                <div>
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Email</span>
                    <div style="font-size: 0.95rem; color: var(--text-main); margin-top: 4px;">${o.clientEmail || '—'}</div>
                </div>
                <div>
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Дата поступления</span>
                    <div style="font-size: 0.95rem; color: var(--text-main); margin-top: 4px;">${o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</div>
                </div>
            </div>

            <div style="margin-bottom: 12px;">
                <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Комментарий</span>
                <div style="font-size: 0.95rem; color: var(--text-main); background: var(--bg-body); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-top: 4px;">${o.comment || '—'}</div>
            </div>

            <div style="border-top: 1px solid var(--border); padding-top: 16px; margin-top: 10px;">
                <h4 style="margin-top: 0; margin-bottom: 12px; font-weight: 600; font-size: 0.95rem;">Состав заказа</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${itemsListHtml}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-weight: 700; font-size: 1.1rem; color: var(--text-main);">
                    <span>Итого к оплате:</span>
                    <span>${o.totalPrice.toLocaleString()} ₽</span>
                </div>
            </div>

            <div style="border-top: 1px solid var(--border); padding-top: 16px; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                <label style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Статус заказа</label>
                <select id="crmOrderStatusSelector" style="width: 100%; padding: 10px 14px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 8px; color: var(--text-main); font-size: 0.95rem; cursor: pointer;">
                    ${statusSelectOptions}
                </select>
            </div>
            
            <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
                <button onclick="updateOrderStatus('${o.id}')" class="btn" style="padding: 10px 24px;">Обновить статус</button>
            </div>
        `;
        
        if (typeof initCustomSelect === 'function') {
            initCustomSelect(document.getElementById('crmOrderStatusSelector'));
        }

        document.getElementById('orderDetailsModal').style.display = 'flex';
    } catch (err) {
        showToast('Ошибка получения заказа', 'error');
    }
}

async function updateOrderStatus(orderId) {
    const status = document.getElementById('crmOrderStatusSelector').value;
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/orders/${encodeURIComponent(orderId)}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            showToast('Статус заказа обновлен', 'success');
            document.getElementById('orderDetailsModal').style.display = 'none';
            loadOrders();
            loadAnalytics();
        } else {
            showToast('Ошибка обновления статуса', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
}

// ----------------------------------------------------
// CSV EXPORT / IMPORT
// ----------------------------------------------------
async function exportToCSV() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products?limit=10000`);
        if (!res.ok) return;
        const data = await res.json();
        const products = data.products || [];

        if (products.length === 0) {
            showToast('Нет товаров для экспорта', 'error');
            return;
        }

        // CSV compiler
        const headers = ['ID', 'Name', 'SKU', 'Price', 'OldPrice', 'Stock', 'Status', 'Description', 'Images', 'Categories', 'Type'];
        const csvRows = [headers.join(',')];

        products.forEach(p => {
            const values = [
                p.id,
                `"${p.name.replace(/"/g, '""')}"`,
                p.sku || '',
                p.price,
                p.oldPrice || '',
                p.stock !== undefined ? p.stock : 0,
                p.status,
                `"${(p.description || '').replace(/"/g, '""')}"`,
                `"${(p.images || []).join(',')}"`,
                `"${(p.categories || []).join(',')}"`,
                p.type || 'product'
            ];
            csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `catalog_${siteId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV Экспортирован', 'success');
    } catch (err) {
        showToast('Ошибка экспорта', 'error');
    }
}

function triggerCSVImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async event => {
            const text = event.target.result;
            await processCSVImport(text);
        };
        reader.readAsText(file);
    };
    input.click();
}

async function processCSVImport(csvText) {
    try {
        const rows = parseCSV(csvText);
        if (rows.length === 0) {
            showToast('CSV файл пуст или некорректен', 'error');
            return;
        }

        let importedCount = 0;
        let errorsCount = 0;

        for (const row of rows) {
            // Check if name and price are valid
            if (!row.Name || row.Price === undefined) {
                errorsCount++;
                continue;
            }

            const payload = {
                name: row.Name,
                sku: row.SKU || '',
                price: parseFloat(row.Price) || 0,
                oldPrice: row.OldPrice ? parseFloat(row.OldPrice) : null,
                stock: row.Stock !== undefined ? parseInt(row.Stock) : 0,
                status: row.Status || 'active',
                categories: row.Categories ? row.Categories.split(',').filter(Boolean) : [],
                description: row.Description || '',
                images: row.Images ? row.Images.split(',').filter(Boolean) : [],
                type: row.Type || 'product'
            };

            const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                importedCount++;
            } else {
                errorsCount++;
            }
        }

        showToast(`Импорт завершен: успешно ${importedCount}, пропущено ${errorsCount}`, 'success');
        loadProducts(1);
        loadProductsDropdown();
    } catch (err) {
        showToast('Ошибка импорта CSV', 'error');
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return [];
    
    // Header parsing
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple regex split supporting quotes
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const values = matches.map(v => v.trim().replace(/^["']|["']$/g, '').replace(/""/g, '"'));
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        rows.push(row);
    }
    return rows;
}

// ----------------------------------------------------
// CUSTOM DIALOGS & CRM EXPORT
// ----------------------------------------------------

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const text = document.getElementById('customConfirmText');
        const yesBtn = document.getElementById('customConfirmYesBtn');
        const noBtn = document.getElementById('customConfirmNoBtn');
        const closeBtn = document.getElementById('customConfirmCloseBtn');
        
        text.textContent = message;
        modal.style.display = 'flex';
        
        const cleanUp = () => {
            modal.style.display = 'none';
            // Remove listeners
            const newYesBtn = yesBtn.cloneNode(true);
            const newNoBtn = noBtn.cloneNode(true);
            yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
            noBtn.parentNode.replaceChild(newNoBtn, noBtn);
        };
        
        document.getElementById('customConfirmYesBtn').addEventListener('click', () => {
            cleanUp();
            resolve(true);
        });
        
        document.getElementById('customConfirmNoBtn').addEventListener('click', () => {
            cleanUp();
            resolve(false);
        });
        
        closeBtn.onclick = () => {
            cleanUp();
            resolve(false);
        };
    });
}

function showCustomPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customPromptModal');
        const text = document.getElementById('customPromptText');
        const input = document.getElementById('customPromptInput');
        const okBtn = document.getElementById('customPromptOkBtn');
        const cancelBtn = document.getElementById('customPromptCancelBtn');
        const closeBtn = document.getElementById('customPromptCloseBtn');
        
        text.textContent = message;
        input.value = defaultValue;
        modal.style.display = 'flex';
        input.focus();
        
        const cleanUp = () => {
            modal.style.display = 'none';
            const newOkBtn = okBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        };
        
        document.getElementById('customPromptOkBtn').addEventListener('click', () => {
            const val = input.value;
            cleanUp();
            resolve(val);
        });
        
        document.getElementById('customPromptCancelBtn').addEventListener('click', () => {
            cleanUp();
            resolve(null);
        });
        
        closeBtn.onclick = () => {
            cleanUp();
            resolve(null);
        };
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('customPromptOkBtn').click();
            } else if (e.key === 'Escape') {
                document.getElementById('customPromptCancelBtn').click();
            }
        };
    });
}

async function exportOrdersToCSV() {
    try {
        const res = await fetch(`/api/commerce/${encodeURIComponent(siteId)}/orders`);
        if (!res.ok) return;
        const orders = await res.json();

        if (orders.length === 0) {
            showToast('Нет заказов для экспорта', 'error');
            return;
        }

        const headers = ['ID заказа', 'Клиент', 'Телефон', 'Email', 'Сумма', 'Дата заказа', 'Статус', 'Товары', 'Комментарий'];
        const csvRows = [headers.join(',')];

        orders.forEach(o => {
            const itemsStr = o.items.map(item => `${item.name} (${item.quantity} шт. x ${item.price} ₽)`).join('; ');
            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString() : '—';
            
            let statusText = 'Новый';
            if (o.status === 'processing') statusText = 'В обработке';
            else if (o.status === 'completed') statusText = 'Выполнен';
            else if (o.status === 'cancelled') statusText = 'Отменен';

            const values = [
                o.orderId,
                `"${o.clientName.replace(/"/g, '""')}"`,
                `"${o.clientPhone.replace(/"/g, '""')}"`,
                `"${(o.clientEmail || '').replace(/"/g, '""')}"`,
                o.totalPrice,
                `"${dateStr}"`,
                `"${statusText}"`,
                `"${itemsStr.replace(/"/g, '""')}"`,
                `"${(o.comment || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `orders_${siteId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Список заказов экспортирован', 'success');
    } catch (err) {
        showToast('Ошибка экспорта заказов', 'error');
    }
}

function updateImagePreviews() {
    const container = document.getElementById('prodFormImagePreviewContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const textarea = document.getElementById('prodFormImages');
    if (!textarea) return;
    
    const images = textarea.value.split(/\r?\n|,/)
        .map(s => s.trim())
        .filter(Boolean);
        
    if (images.length === 0) {
        container.style.display = 'none';
        syncVariantImagesOptions();
        return;
    }
    
    container.style.display = 'flex';
    
    images.forEach((imgUrl, index) => {
        const previewCard = document.createElement('div');
        previewCard.style.position = 'relative';
        previewCard.style.width = '190px';
        previewCard.style.height = '190px';
        previewCard.style.borderRadius = '8px';
        previewCard.style.border = '1px solid var(--border)';
        previewCard.style.overflow = 'hidden';
        previewCard.style.background = 'var(--bg-body)';
        previewCard.style.boxShadow = 'var(--shadow-sm)';
        previewCard.style.transition = 'transform 0.2s ease';
        previewCard.addEventListener('mouseenter', () => previewCard.style.transform = 'scale(1.05)');
        previewCard.addEventListener('mouseleave', () => previewCard.style.transform = 'scale(1)');
        
        let resolvedUrl = imgUrl;
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/') && !imgUrl.startsWith('data:')) {
            resolvedUrl = `/real-site/${siteId}/${imgUrl}`;
        }
        
        const img = document.createElement('img');
        img.src = resolvedUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onerror = () => {
            img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '&times;';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '2px';
        removeBtn.style.right = '2px';
        removeBtn.style.width = '16px';
        removeBtn.style.height = '16px';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.background = 'rgba(239, 68, 68, 0.9)';
        removeBtn.style.color = '#fff';
        removeBtn.style.border = 'none';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.fontSize = '12px';
        removeBtn.style.lineHeight = '1';
        removeBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        removeBtn.title = 'Удалить';
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const updatedImages = images.filter((_, idx) => idx !== index);
            textarea.value = updatedImages.join('\n');
            updateImagePreviews();
        });
        
        previewCard.appendChild(img);
        previewCard.appendChild(removeBtn);
        container.appendChild(previewCard);
    });
    
    syncVariantImagesOptions();
}

function syncVariantImagesOptions() {
    const textarea = document.getElementById('prodFormImages');
    if (!textarea) return;
    const images = textarea.value.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
    
    document.querySelectorAll('#prodFormVariantsList > div').forEach(row => {
        const select = row.querySelector('.variant-img-select');
        if (!select) return;
        const currentSelectedVal = select.value;
        
        let optionsStr = `<option value="">Без фото (Использовать главное)</option>`;
        images.forEach(img => {
            const isSelected = img === currentSelectedVal ? 'selected' : '';
            const displayVal = img.substring(img.lastIndexOf('/') + 1);
            optionsStr += `<option value="${img}" ${isSelected}>${displayVal}</option>`;
        });
        
        select.innerHTML = optionsStr;
        
        if (typeof initCustomSelect === 'function') {
            initCustomSelect(select);
        }
    });
}

function addVariantPropertyBlock(propName = '', valuesList = []) {
    const list = document.getElementById('prodFormVariantsList');
    if (!list) return;

    const blockId = 'variant_block_' + Math.random().toString(36).substring(2, 9);
    const block = document.createElement('div');
    block.id = blockId;
    block.className = 'variant-property-block';
    block.style.border = '1px solid var(--border)';
    block.style.borderRadius = '8px';
    block.style.padding = '16px';
    block.style.marginBottom = '16px';
    block.style.background = 'rgba(255, 255, 255, 0.01)';
    block.style.display = 'flex';
    block.style.flexDirection = 'column';
    block.style.gap = '12px';

    // Собираем свойства из Конструктора полей
    const schemaProps = [];
    if (productSchema && productSchema.groups) {
        productSchema.groups.forEach(g => {
            if (g.fields) {
                g.fields.forEach(f => {
                    schemaProps.push(f);
                });
            }
        });
    }

    // Строим селект свойств
    let propSelectHtml = `<select class="variant-prop-name-select" style="padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem; cursor: pointer; flex: 1;">`;
    propSelectHtml += `<option value="__custom__">Свое свойство...</option>`;
    
    let matchedProp = null;
    schemaProps.forEach(p => {
        const isSelected = p.name === propName ? 'selected' : '';
        if (p.name === propName) matchedProp = p;
        propSelectHtml += `<option value="${p.id}" ${isSelected}>${p.name}</option>`;
    });
    propSelectHtml += `</select>`;

    block.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Свойство:</span>
                ${propSelectHtml}
                <input type="text" class="variant-prop-name-input" placeholder="Название свойства (напр., Размер)" value="${propName}" style="padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem; display: ${matchedProp ? 'none' : 'block'}; flex: 1;">
            </div>
            <button type="button" onclick="document.getElementById('${blockId}').remove()" class="btn btn-outline" style="padding: 6px 12px; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); font-size: 0.8rem; border-radius: 6px;">Удалить свойство</button>
        </div>
        <div class="variant-values-container" style="display: flex; flex-direction: column; gap: 8px;">
            <!-- Список значений (вариантов) свойства -->
        </div>
        <div>
            <button type="button" class="btn btn-outline add-value-row-btn" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px;">+ Добавить значение</button>
        </div>
    `;

    list.appendChild(block);

    const propSelect = block.querySelector('.variant-prop-name-select');
    const propInput = block.querySelector('.variant-prop-name-input');
    const valuesContainer = block.querySelector('.variant-values-container');
    const addValBtn = block.querySelector('.add-value-row-btn');

    if (typeof initCustomSelect === 'function') {
        initCustomSelect(propSelect);
        const propWrapper = block.querySelector('.custom-select-wrapper');
        if (propWrapper) {
            propWrapper.style.flex = '1';
            propWrapper.style.width = 'auto';
        }
    }

    propSelect.addEventListener('change', () => {
        if (propSelect.value === '__custom__') {
            propInput.style.display = 'block';
            propInput.value = '';
        } else {
            propInput.style.display = 'none';
            const prop = schemaProps.find(p => p.id === propSelect.value);
            if (prop) propInput.value = prop.name;
        }
        // Перерисовываем строки значений, так как изменились доступные варианты из схемы
        valuesContainer.innerHTML = '';
        addValueRow('', '');
    });

    // Функция добавления строки значения (варианта)
    function addValueRow(val = '', selectedImg = '') {
        const rowId = 'val_row_' + Math.random().toString(36).substring(2, 9);
        const row = document.createElement('div');
        row.id = rowId;
        row.className = 'variant-value-row';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '2fr 3fr auto';
        row.style.gap = '10px';
        row.style.alignItems = 'center';

        const textarea = document.getElementById('prodFormImages');
        const images = textarea ? textarea.value.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean) : [];
        
        let imagesOptionsStr = `<option value="">Без фото (Использовать главное)</option>`;
        images.forEach(img => {
            const isSelected = img === selectedImg ? 'selected' : '';
            const displayVal = img.substring(img.lastIndexOf('/') + 1);
            imagesOptionsStr += `<option value="${img}" ${isSelected}>${displayVal}</option>`;
        });

        // Находим выбранное свойство в схеме
        const selectedPropId = propSelect.value;
        const prop = schemaProps.find(p => p.id === selectedPropId);

        let valueControlHtml = '';
        if (prop && (prop.type === 'select' || prop.type === 'color')) {
            let optionsHtml = '';
            if (prop.options) {
                prop.options.forEach(opt => {
                    if (prop.type === 'color') {
                        const [code, label] = opt.split('|');
                        const isSelected = code === val || label === val || opt === val ? 'selected' : '';
                        optionsHtml += `<option value="${code || opt}" data-color="${code || ''}" ${isSelected}>${label || code || opt}</option>`;
                    } else {
                        const isSelected = opt === val ? 'selected' : '';
                        optionsHtml += `<option value="${opt}" ${isSelected}>${opt}</option>`;
                    }
                });
            }
            optionsHtml += `<option value="__custom_val__">Свое значение...</option>`;

            valueControlHtml = `
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <div class="color-indicator" style="width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--border); display: none; flex-shrink: 0;"></div>
                    <select class="variant-val-select" style="flex: 1; padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem; cursor: pointer;">
                        ${optionsHtml}
                    </select>
                    <input type="text" class="variant-val-input" placeholder="Значение" value="${val}" style="display: none; width: 100%; padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem;">
                </div>
            `;
        } else {
            valueControlHtml = `
                <input type="text" class="variant-val-input" placeholder="Значение (напр., S)" value="${val}" style="width: 100%; padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem;">
            `;
        }

        row.innerHTML = `
            ${valueControlHtml}
            <select class="variant-img-select" style="padding: 8px 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main); font-size: 0.9rem; cursor: pointer;">
                ${imagesOptionsStr}
            </select>
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="btn btn-outline" style="padding: 8px; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); font-size: 1.1rem; line-height: 1; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px;">&times;</button>
        `;

        valuesContainer.appendChild(row);

        const valSelect = row.querySelector('.variant-val-select');
        const valInput = row.querySelector('.variant-val-input');
        const colorIndicator = row.querySelector('.color-indicator');
        const imgSel = row.querySelector('.variant-img-select');

        if (typeof initCustomSelect === 'function') {
            if (valSelect) initCustomSelect(valSelect);
            initCustomSelect(imgSel);
        }

        if (valSelect) {
            function updateValInput() {
                if (valSelect.value === '__custom_val__') {
                    valInput.style.display = 'block';
                    colorIndicator.style.display = 'none';
                    valInput.value = '';
                } else {
                    valInput.style.display = 'none';
                    valInput.value = valSelect.value;
                    
                    const selectedOpt = valSelect.options[valSelect.selectedIndex];
                    const color = selectedOpt ? selectedOpt.getAttribute('data-color') : '';
                    if (color) {
                        colorIndicator.style.display = 'block';
                        colorIndicator.style.backgroundColor = color;
                    } else {
                        colorIndicator.style.display = 'none';
                    }
                }
            }
            valSelect.addEventListener('change', updateValInput);
            
            // Проверяем, есть ли такое значение в опциях
            const hasOpt = Array.from(valSelect.options).some(o => o.value === val);
            if (hasOpt) {
                valSelect.value = val;
                updateValInput();
            } else if (val) {
                valSelect.value = '__custom_val__';
                updateValInput();
                valInput.value = val;
            } else {
                updateValInput();
            }
        }
    }

    addValBtn.addEventListener('click', () => {
        addValueRow('', '');
    });

    // Отрисовываем переданные значения
    if (valuesList.length > 0) {
        valuesList.forEach(v => {
            addValueRow(v.value, v.image);
        });
    } else {
        addValueRow('', '');
    }
}
window.addVariantPropertyBlock = addVariantPropertyBlock;

window.toggleSystemColorPanel = function() {
    const chk = document.getElementById('prodFormUseColor');
    const panel = document.getElementById('systemColorPanel');
    const btn = document.getElementById('btnUseColor');
    if (chk && panel) {
        panel.style.display = chk.checked ? 'flex' : 'none';
        if (btn) {
            if (chk.checked) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }
};

window.toggleSystemColorBtnClick = function() {
    const chk = document.getElementById('prodFormUseColor');
    if (chk) {
        chk.checked = !chk.checked;
        toggleSystemColorPanel();
    }
};

window.toggleSystemDimensionsPanel = function() {
    const chk = document.getElementById('prodFormUseDimensions');
    const panel = document.getElementById('systemDimensionsPanel');
    const btn = document.getElementById('btnUseDimensions');
    if (chk && panel) {
        panel.style.display = chk.checked ? 'grid' : 'none';
        if (btn) {
            if (chk.checked) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }
};

window.toggleSystemDimensionsBtnClick = function() {
    const chk = document.getElementById('prodFormUseDimensions');
    if (chk) {
        chk.checked = !chk.checked;
        toggleSystemDimensionsPanel();
    }
};
