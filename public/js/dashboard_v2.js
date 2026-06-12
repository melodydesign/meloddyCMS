// Check auth first
async function checkAuth() {
    const res = await fetch('/api/check-auth');
    if (!res.ok) {
        window.location.href = '/login.html';
    }
}

const siteManageContainer = document.getElementById('siteManageContainer');
const backToProjectsBtn = document.getElementById('backToProjectsBtn');
let analyticsChart = null;
let browserChart = null;
let deviceChart = null;
let allClients = [];
let activeRenameClientId = null;

if (backToProjectsBtn) {
    backToProjectsBtn.addEventListener('click', () => {
        siteManageContainer.style.display = 'none';
        const dmc = document.getElementById('dashboardMainContainer');
        if (dmc) dmc.style.display = 'block';
        destroyAnalyticsChart();
    });
}

// Window click listener removed because it's no longer a modal

function destroyAnalyticsChart() {
    if (analyticsChart) { analyticsChart.destroy(); analyticsChart = null; }
    if (browserChart) { browserChart.destroy(); browserChart = null; }
    if (deviceChart) { deviceChart.destroy(); deviceChart = null; }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { 
        method: 'POST',
        headers: {
            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
        }
    });
    window.location.href = '/login.html';
});

let currentUserIsAdmin = false;
let currentUserIsDeveloper = false;

// Fetch and display sites
async function loadSites() {
    const container = document.getElementById('sitesContainer');
    if (!container) return;
    
    // Force layout to flex column as requested by user
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1.5rem';
    
    // Add Skeletons while loading
    container.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1rem;">
            <div class="skeleton skeleton-avatar"></div>
            <div style="flex: 1;">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text" style="width: 40%;"></div>
                <div class="skeleton skeleton-text" style="width: 25%;"></div>
            </div>
        </div>
        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1rem;">
            <div class="skeleton skeleton-avatar"></div>
            <div style="flex: 1;">
                <div class="skeleton skeleton-title" style="width: 50%;"></div>
                <div class="skeleton skeleton-text" style="width: 35%;"></div>
                <div class="skeleton skeleton-text" style="width: 20%;"></div>
            </div>
        </div>
    `;

    try {
        const res = await fetch('/api/sites');
        if (!res.ok) throw new Error('Failed to fetch sites');
        const data = await res.json();
        
        container.innerHTML = '';
        
        // Check role and display/hide Admin-only elements
        const isAdmin = data.isAdmin === true;
        const isDeveloper = data.isDeveloper === true;
        currentUserIsAdmin = isAdmin;
        currentUserIsDeveloper = isDeveloper;
        
        document.querySelectorAll('.admin-only-action').forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });
        
        document.querySelectorAll('.developer-only-action').forEach(el => {
            el.style.display = (isAdmin || isDeveloper) ? 'flex' : 'none';
        });
        
        // Show/hide Trash Bin button
        const openTrashBinBtn = document.getElementById('openTrashBinBtn');
        if (openTrashBinBtn) {
            openTrashBinBtn.style.display = (isAdmin || isDeveloper) ? 'flex' : 'none';
        }
        
        if (isAdmin || isDeveloper) {
            loadRequests();
        }
        
        if (isAdmin || data.isDeveloper) {
            allClients = data.clients || [];
            
            // Populate Transfer Client Select
            populateTransferClients();
            
            // Admin/Developer view: tabs or list of clients
            if (!data.clients || data.clients.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет доступных клиентов</div>';
                return;
            }
            const contentContainer = document.createElement('div');
            contentContainer.style.display = 'grid';
            contentContainer.style.gridTemplateColumns = '1fr 1fr';
            contentContainer.style.gap = '1.5rem';

            if (data.clients.length > 1) {
                // Create tabs
                const tabsContainer = document.createElement('div');
                tabsContainer.className = 'client-tabs-container';
                
                data.clients.forEach((client, index) => {
                    const tab = document.createElement('div');
                    tab.className = 'client-tab-item' + (index === 0 ? ' active' : '');
                    tab.dataset.clientId = client.id;
                    
                    tab.innerHTML = `
                        <button class="client-name-btn" style="flex: 1; display: flex; align-items: center; justify-content: flex-start; background: none; border: none; color: inherit; cursor: pointer; font-weight: 600; font-size: 0.85rem; padding: 0.75rem 4px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; opacity: 0.8; flex-shrink: 0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span class="client-name-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${client.name || client.username}</span>
                        </button>
                        ${isAdmin ? `
                        <div style="display: flex; align-items: center; gap: 2px;">
                            <button class="client-edit-btn" style="background: none; border: none; color: inherit; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 0.2s; border-radius: 4px;" title="Редактировать имя">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="client-delete-btn" style="background: none; border: none; color: #f43f5e; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 0.2s; border-radius: 4px;" title="Удалить клиента">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        ` : ''}
                    `;
                    
                    // Switch client active tab
                    tab.querySelector('.client-name-btn').addEventListener('click', () => {
                        tabsContainer.querySelectorAll('.client-tab-item').forEach(b => {
                            b.classList.remove('active');
                        });
                        
                        tab.classList.add('active');
                        
                        // Show sites for this client
                        renderClientSites(client.sites, contentContainer);
                    });
                    
                    // Rename Client Action (using custom styled modal)
                    tab.querySelector('.client-edit-btn')?.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openRenameClientModal(client.id, client.name || client.username);
                    });
                    
                    // Delete Client Action (Trash bin retention)
                    tab.querySelector('.client-delete-btn')?.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`Вы уверены, что хотите удалить клиента "${client.name || client.username}"? Все его сайты также будут перемещены в корзину на 7 дней.`)) {
                            try {
                                const res = await fetch(`/api/clients/${client.id}/delete`, {
                                    method: 'POST',
                                    headers: {
                                        'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                                    }
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    if (typeof showToast === 'function') showToast(data.message || 'Клиент успешно перенесен в корзину!');
                                    loadSites();
                                } else {
                                    if (typeof showToast === 'function') showToast(data.error || 'Ошибка при удалении клиента', 'error'); else alert(data.error || 'Ошибка при удалении клиента');
                                }
                            } catch (err) {
                                if (typeof showToast === 'function') showToast('Не удалось связаться с сервером', 'error'); else alert('Не удалось связаться с сервером');
                            }
                        }
                    });
                    
                    tabsContainer.appendChild(tab);
                });
                
                const clientTabsWrapper = document.getElementById('clientTabsWrapper');
                if (clientTabsWrapper) {
                    clientTabsWrapper.innerHTML = '';
                    clientTabsWrapper.appendChild(tabsContainer);
                }
            } else {
                const clientTabsWrapper = document.getElementById('clientTabsWrapper');
                if (clientTabsWrapper) {
                    clientTabsWrapper.innerHTML = '';
                }
            }
            container.appendChild(contentContainer);
            
            // Render first client's sites by default
            if (data.clients.length > 0) {
                renderClientSites(data.clients[0].sites, contentContainer);
            }
            
        } else {
            // Client view: just list sites
            const clientSites = data.sites || data;
            if (!clientSites || clientSites.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет активных проектов</div>';
                return;
            }
            container.style.display = 'grid';
            container.style.gridTemplateColumns = '1fr 1fr';
            renderClientSites(clientSites, container);
        }

        // Populate Activity Site Filter
        const siteSelect = document.getElementById('activitySiteFilter');
        if (siteSelect) {
            // Collect all unique sites
            let allSitesArr = [];
            if (isAdmin || data.isDeveloper) {
                if (data.allSites) allSitesArr = [...data.allSites];
                else if (data.clients) {
                    data.clients.forEach(c => allSitesArr.push(...(c.sites || [])));
                }
                if (data.ownSites) allSitesArr.push(...data.ownSites);
            } else {
                allSitesArr = data.sites || data || [];
            }
            
            const uniqueSites = [];
            const seen = new Set();
            for (const s of allSitesArr) {
                if (!seen.has(s.id)) {
                    seen.add(s.id);
                    uniqueSites.push(s);
                }
            }
            
            // Keep the default "Все сайты" option
            siteSelect.innerHTML = '<option value="all">Все сайты</option>';
            uniqueSites.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name || s.id;
                siteSelect.appendChild(opt);
            });
            renderCustomSelect('activitySiteFilter');
        }

        const dateSelect = document.getElementById('activityTimeFilter');
        if (dateSelect) renderCustomSelect('activityTimeFilter');

        // Auto-open site manage panel if site parameter is specified in URL
        const urlParams = new URLSearchParams(window.location.search);
        const autoSiteId = urlParams.get('site');
        if (autoSiteId) {
            let foundSite = null;
            if (data && data.clients) {
                for (const client of data.clients) {
                    const match = client.sites?.find(s => (s.path || s.id) === autoSiteId);
                    if (match) {
                        foundSite = match;
                        // Switch client active tab
                        const tabItem = document.querySelector(`.client-tab-item[data-client-id="${client.id}"]`);
                        if (tabItem) {
                            const btn = tabItem.querySelector('.client-name-btn');
                            if (btn) btn.click();
                        }
                        break;
                    }
                }
            } else if (data) {
                const clientSites = data.sites || data;
                if (Array.isArray(clientSites)) {
                    foundSite = clientSites.find(s => (s.path || s.id) === autoSiteId);
                }
            }
            
            if (foundSite) {
                const targetSitePath = foundSite.path || foundSite.id;
                localStorage.setItem('activeSite', targetSitePath);
                
                const viewSiteBtn = document.getElementById('viewSiteBtn');
                if (viewSiteBtn) viewSiteBtn.href = `/real-site/${targetSitePath}/index.html`;
                
                const openEditorBtn = document.getElementById('openEditorBtn');
                if (openEditorBtn) openEditorBtn.href = `/visual-editor.html?site=${targetSitePath}`;

                const openFileManagerBtn = document.getElementById('openFileManagerBtn');
                if (openFileManagerBtn) openFileManagerBtn.href = `/file-manager.html?site=${targetSitePath}`;
                
                const siteModalTitle = document.getElementById('siteModalTitle');
                if (siteModalTitle) siteModalTitle.textContent = foundSite.name || foundSite.path || foundSite.id;
                
                switchSiteTab('settings');
                
                const dmc = document.getElementById('dashboardMainContainer');
                if (dmc) dmc.style.display = 'none';
                const smc = document.getElementById('siteManageContainer');
                if (smc) smc.style.display = 'flex';
            }
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Ошибка загрузки проектов</div>';
    }
}

function renderClientSites(sites, container) {
    container.innerHTML = '';
    if (!sites || sites.length === 0) {
        container.innerHTML = `
            <div class="empty-state-block">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.5;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--text-main);">Нет активных проектов</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 300px;">У данного клиента пока нет загруженных сайтов.</p>
            </div>
        `;
        return;
    }
    
    sites.forEach(site => {
        const div = document.createElement('div');
        div.className = 'hero-card';
        div.style.cursor = 'pointer';
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div class="feature-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <div class="hero-info">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <h3 style="margin: 0; font-size: 1.1rem;">${site.name}</h3>
                        <span class="status-badge ${site.status === 'online' ? 'status-online' : 'status-offline'}">
                            <span class="status-dot"></span>
                            ${site.status === 'online' ? 'Онлайн' : 'Оффлайн'}
                        </span>
                        ${site.hasDrafts ? '<span class="status-badge status-draft">Черновик</span>' : ''}
                    </div>
                    <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">${site.description || 'ID: ' + (site.path || site.id || 'Unknown')}</p>
                    <div style="display: flex; gap: 12px; margin-top: 6px;">
                        ${site.domain ? `<span style="color: var(--text-muted); font-size: 0.75rem; opacity: 0.7; display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            ${site.domain}
                        </span>` : ''}
                        <span style="color: var(--text-muted); font-size: 0.75rem; opacity: 0.7; display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            ${((site.size || 0) / 1024 / 1024).toFixed(2)} MB
                        </span>
                    </div>
                </div>
            </div>
            <div class="site-actions-wrapper" style="position: relative;" onclick="event.stopPropagation();">
                <button class="site-action-btn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 8px; border-radius: 8px; transition: background 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='var(--bg-hover)'; this.style.color='var(--text-main)';" onmouseout="this.style.background='none'; this.style.color='var(--text-muted)';">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
                <div class="site-dropdown-menu">
                    <button class="site-menu-item" data-action="edit">Редактировать</button>
                    <button class="site-menu-item" data-action="files">Файлы</button>
                    <button class="site-menu-item" data-action="settings">Настройки</button>
                    <hr style="border: none; border-top: 1px solid var(--border); margin: 4px 0;">
                    <button class="site-menu-item" data-action="delete">Удалить</button>
                </div>
            </div>
        `;
        
        div.addEventListener('click', (e) => {
            // If clicking inside the actions wrapper, do not open the main modal
            if (e.target.closest('.site-actions-wrapper')) {
                return;
            }

            const targetSitePath = site.path || site.id;
            localStorage.setItem('activeSite', targetSitePath);
            const viewSiteBtn = document.getElementById('viewSiteBtn');
            if (viewSiteBtn) viewSiteBtn.href = `/real-site/${targetSitePath}/index.html`;
            
            const openEditorBtn = document.getElementById('openEditorBtn');
            if (openEditorBtn) openEditorBtn.href = `/visual-editor.html?site=${targetSitePath}`;

            const openFileManagerBtn = document.getElementById('openFileManagerBtn');
            if (openFileManagerBtn) openFileManagerBtn.href = `/file-manager.html?site=${targetSitePath}`;
            
            // Set modal title
            const siteModalTitle = document.getElementById('siteModalTitle');
            if (siteModalTitle) siteModalTitle.textContent = site.name || site.path || site.id;
            
            // Reset to actions tab
            switchSiteTab('settings');
            
            const dmc = document.getElementById('dashboardMainContainer');
            if (dmc) dmc.style.display = 'none';
            document.getElementById('dashboardMainContainer').style.display = 'none';
            document.getElementById('siteManageContainer').style.display = 'flex';
        });
        
        // Actions Menu Logic
        const actionsWrapper = div.querySelector('.site-actions-wrapper');
        const actionBtn = div.querySelector('.site-action-btn');
        const dropdownMenu = div.querySelector('.site-dropdown-menu');

        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other dropdowns
            document.querySelectorAll('.site-dropdown-menu').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.style.display = 'none';
                    menu.closest('.hero-card')?.classList.remove('active-dropdown');
                }
            });
            const isShown = window.getComputedStyle(dropdownMenu).display !== 'none';
            if (isShown) {
                dropdownMenu.style.display = 'none';
                div.classList.remove('active-dropdown');
            } else {
                dropdownMenu.style.display = 'block';
                div.classList.add('active-dropdown');
            }
        });

        dropdownMenu.querySelectorAll('.site-menu-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                dropdownMenu.style.display = 'none';
                const action = item.dataset.action;
                const targetSitePath = site.path || site.id;
                
                if (action === 'edit') {
                    window.location.href = `/visual-editor.html?site=${targetSitePath}`;
                } else if (action === 'files') {
                    window.location.href = `/file-manager.html?site=${targetSitePath}`;
                } else if (action === 'settings') {
                    localStorage.setItem('activeSite', targetSitePath);
                    const siteModalTitle = document.getElementById('siteModalTitle');
                    if (siteModalTitle) siteModalTitle.textContent = site.name || site.path || site.id;
                    const dmc = document.getElementById('dashboardMainContainer');
                    if (dmc) dmc.style.display = 'none';
                    document.getElementById('dashboardMainContainer').style.display = 'none';
            document.getElementById('siteManageContainer').style.display = 'flex';
                    switchSiteTab('settings');
                } else if (action === 'delete') {
                    if (confirm(`Вы уверены, что хотите удалить сайт ${site.name || targetSitePath}?`)) {
                        try {
                            const res = await fetch(`/api/sites/${encodeURIComponent(targetSitePath)}/delete`, {
                                method: 'POST',
                                headers: {
                                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                                }
                            });
                            const data = await res.json();
                            if (res.ok) {
                                if (typeof showToast === 'function') showToast(data.message || 'Сайт перемещен в корзину');
                                loadSites();
                            } else {
                                if (typeof showToast === 'function') showToast(data.error || 'Ошибка при удалении', 'error'); else alert(data.error || 'Ошибка при удалении');
                            }
                        } catch (err) {
                            if (typeof showToast === 'function') showToast('Не удалось удалить сайт', 'error'); else alert('Не удалось удалить сайт');
                        }
                    }
                }
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!actionsWrapper.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
        
        container.appendChild(div);
    });
}

// --- Site Settings Tab Logic ---
let currentSettingsSiteId = '';

function switchSiteTab(tab) {
    if (tab === 'commerce') {
        const siteId = localStorage.getItem('activeSite');
        if (!siteId) return;
        
        fetch(`/api/site-settings/${encodeURIComponent(siteId)}`)
            .then(res => res.json())
            .then(data => {
                const commerceEnabled = !!(data.modules && data.modules.commerce);
                if (commerceEnabled) {
                    window.location.href = `/commerce.html?site=${encodeURIComponent(siteId)}`;
                } else {
                    document.getElementById('commerceBlockedModal').style.display = 'flex';
                }
            })
            .catch(err => {
                console.error(err);
                if (typeof showToast === 'function') showToast('Ошибка сети при проверке доступа', 'error');
            });
        return;
    }

    const panels = ['panelOverview', 'panelSettings', 'panelSeo', 'panelAccess', 'panelDanger'];
    panels.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = 'none';
    });
    
    const tabs = ['tabSiteSettings', 'tabSiteOverview', 'tabSiteSeo', 'tabSiteAccess', 'tabSiteCommerce', 'tabSiteDanger'];
    tabs.forEach(tId => {
        const el = document.getElementById(tId);
        if (el) el.classList.remove('active');
    });

    const activeTabId = 'tabSite' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const activeTabEl = document.getElementById(activeTabId);
    if (activeTabEl) {
        activeTabEl.classList.add('active');
    }

    currentSettingsSiteId = localStorage.getItem('activeSite') || '';

    if (tab === 'overview') {
        const p = document.getElementById('panelOverview');
        if (p) p.style.display = 'block';
    } else if (tab === 'settings') {
        const p = document.getElementById('panelSettings');
        if (p) p.style.display = 'block';
        if (currentSettingsSiteId) loadSiteSettings(currentSettingsSiteId);
    } else if (tab === 'seo') {
        const p = document.getElementById('panelSeo');
        if (p) p.style.display = 'block';
        if (currentSettingsSiteId) loadSeoData(currentSettingsSiteId);
    } else if (tab === 'access') {
        const p = document.getElementById('panelAccess');
        if (p) p.style.display = 'block';
    } else if (tab === 'danger') {
        const p = document.getElementById('panelDanger');
        if (p) p.style.display = 'block';
    }
}

async function loadSeoData(siteId) {
    try {
        const robotsRes = await fetch(`/api/robots/${encodeURIComponent(siteId)}`);
        const robotsText = await robotsRes.text();
        document.getElementById('robotsContent').value = robotsText;
        
        const sitemapUrl = `${window.location.origin}/real-site/${siteId}/sitemap.xml`;
        document.getElementById('sitemapUrl').value = sitemapUrl;
        document.getElementById('copySitemapBtn').onclick = () => window.open(sitemapUrl, '_blank');
    } catch (err) {
        console.error('Failed to load SEO data:', err);
    }
}

async function loadLeadsData(siteId) {
    const leadsList = document.getElementById('leadsList');
    if (!leadsList) return;
    leadsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Загрузка...</div>';
    
    try {
        const res = await fetch(`/api/analytics/${encodeURIComponent(siteId)}`);
        const data = await res.json();
        
        // Load Telegram settings for this tab too
        try {
            const settingsRes = await fetch(`/api/site-settings/${encodeURIComponent(siteId)}`);
            const settingsData = await settingsRes.json();
            
            const leadsTelegramChatIdInput = document.getElementById('leadsTelegramChatId');
            if (leadsTelegramChatIdInput) {
                leadsTelegramChatIdInput.value = settingsData.telegramChatId || '';
                leadsTelegramChatIdInput.placeholder = settingsData.telegramChatId ? settingsData.telegramChatId : 'Бот не подключен';
            }
            
            const connectBtn = document.getElementById('leadsConnectTelegramBtn');
            if (connectBtn) {
                if (!window.__botUsername) {
                    try {
                        const botRes = await fetch('/api/bot-info');
                        const botData = await botRes.json();
                        window.__botUsername = botData.username || 'bot';
                    } catch (e) {
                        window.__botUsername = 'bot';
                    }
                }
                connectBtn.href = `https://t.me/${window.__botUsername}?start=${settingsData.botCode}`;
            }
        } catch (e) {
            console.error('Failed to load site settings for leads tab:', e);
        }
        
        if (!data.forms || data.forms.length === 0) {
            leadsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Нет полученных заявок</div>';
            return;
        }
        
        leadsList.innerHTML = '';
        // Sort by timestamp descending
        data.forms.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const seen = [];
        const filteredForms = data.forms.filter(form => {
            const formDataStr = JSON.stringify(form.metadata.data);
            const formTime = new Date(form.timestamp).getTime();
            
            const isDuplicate = seen.some(s => {
                return s.data === formDataStr && Math.abs(s.time - formTime) < 5000; // 5 seconds
            });
            
            if (isDuplicate) return false;
            
            seen.push({ data: formDataStr, time: formTime });
            return true;
        });
        
        filteredForms.forEach(form => {
            const date = new Date(form.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const fields = form.metadata.data || {};
            let fieldsHtml = '';
            for (const [key, value] of Object.entries(fields)) {
                let label = key;
                if (key === 'name') label = 'Имя';
                if (key === 'phone') label = 'Телефон';
                fieldsHtml += `
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <span style="color: var(--text-muted); font-size: 0.85rem;">${label}</span>
                        <span style="color: var(--text-main); font-weight: 500; font-size: 0.9rem;">${value}</span>
                    </div>`;
            }
            
            const item = document.createElement('div');
            item.style.background = 'rgba(255, 255, 255, 0.02)';
            item.style.padding = '16px';
            item.style.borderRadius = '10px';
            item.style.border = '1px solid var(--border)';
            item.style.transition = 'all 0.2s ease';
            
            item.onmouseover = () => { 
                item.style.background = 'rgba(255,255,255,0.04)'; 
                item.style.borderColor = 'rgba(243, 125, 15, 0.4)'; // Primary color with opacity
            };
            item.onmouseout = () => { 
                item.style.background = 'rgba(255,255,255,0.02)'; 
                item.style.borderColor = 'var(--border)'; 
            };
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="background: rgba(243, 125, 15, 0.15); color: #F37D0F; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${form.metadata.formId || 'Форма'}</span>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${date}</div>
                </div>
                <div>
                    ${fieldsHtml}
                </div>
            `;
            leadsList.appendChild(item);
        });
    } catch (e) {
        leadsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Ошибка при загрузке заявок</div>';
    }
}

document.getElementById('saveRobotsBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    const content = document.getElementById('robotsContent').value;
    const btn = document.getElementById('saveRobotsBtn');
    
    btn.disabled = true;
    btn.textContent = 'Сохранение...';
    
    try {
        const res = await fetch(`/api/robots/${encodeURIComponent(currentSettingsSiteId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
        } else {
            showToast('Ошибка: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Сохранить robots.txt';
    }
});

async function loadSiteSettings(siteId) {
    try {
        const res = await fetch(`/api/site-settings/${encodeURIComponent(siteId)}`);
        const data = await res.json();
        
        document.getElementById('settDisplayName').value = data.displayName || '';
        document.getElementById('settDescription').value = data.description || '';
        document.getElementById('settDomain').value = data.domain || '';
        document.getElementById('settMetrikaId').value = data.metrikaId || '';
        document.getElementById('settWebvisor').checked = !!data.webvisor;
        document.getElementById('settFavicon').value = data.favicon || '';
        document.getElementById('settBackupFrequency').value = data.backupFrequency || 'daily';
        document.getElementById('settTimezone').value = data.timezone || 'Europe/Moscow';
        document.getElementById('settForceSsl').checked = !!data.forceSsl;
        
        document.getElementById('settModuleCommerce').checked = !!(data.modules && data.modules.commerce);
        document.getElementById('settModuleNews').checked = !!(data.modules && data.modules.news);
        document.getElementById('settCurrency').value = data.currency || 'RUB';

        if (typeof initCustomSelect === 'function') {
            initCustomSelect(document.getElementById('settBackupFrequency'));
            initCustomSelect(document.getElementById('settTimezone'));
            initCustomSelect(document.getElementById('settCurrency'));
        }
        
        const commerceEnabled = !!(data.modules && data.modules.commerce);
        const tabSiteCommerce = document.getElementById('tabSiteCommerce');
        const commerceLockIcon = document.getElementById('commerceLockIcon');
        if (tabSiteCommerce) {
            if (commerceEnabled) {
                tabSiteCommerce.style.opacity = '1';
                if (commerceLockIcon) commerceLockIcon.style.display = 'none';
            } else {
                tabSiteCommerce.style.opacity = '0.5';
                if (commerceLockIcon) commerceLockIcon.style.display = 'inline';
            }
        }
        
        const devSection = document.getElementById('developerAccessSection');
        if (data._userRole === 'developer') {
            if (devSection) {
                devSection.innerHTML = `<div class="settings-section-title">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 2px;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="16 13 8 13"></polyline><polyline points="16 17 8 17"></polyline><polyline points="10 9 9 9 8 9"></polyline></svg>
Доступ разработчика</div>
<div style="font-size: 0.9rem; color: var(--text-muted);">Сайт прикреплен к разработчику: ${data.developerAccess?.code || '—'}</div>`;
            }
        } else {
            if (data.developerAccess) {
                const elCode = document.getElementById('settDeveloperCode');
                if (elCode) elCode.value = data.developerAccess.code || '';
                const elPermFiles = document.getElementById('settDevPermFiles');
                if (elPermFiles) elPermFiles.checked = !!data.developerAccess.permissions?.files;
                const elPermEditor = document.getElementById('settDevPermEditor');
                if (elPermEditor) elPermEditor.checked = !!data.developerAccess.permissions?.editor;
            } else {
                const elCode = document.getElementById('settDeveloperCode');
                if (elCode) elCode.value = '';
                const elPermFiles = document.getElementById('settDevPermFiles');
                if (elPermFiles) elPermFiles.checked = false;
                const elPermEditor = document.getElementById('settDevPermEditor');
                if (elPermEditor) elPermEditor.checked = false;
            }
        }
        // Telegram
        const notConnectedBlock = document.getElementById('telegramNotConnectedBlock');
        const connectedBlock = document.getElementById('telegramConnectedBlock');
        const codeInput = document.getElementById('settTelegramCodeInput');
        
        if (notConnectedBlock && connectedBlock) {
            if (data.telegramChatId) {
                notConnectedBlock.style.display = 'none';
                connectedBlock.style.display = 'flex';
            } else {
                notConnectedBlock.style.display = 'flex';
                connectedBlock.style.display = 'none';
                if (codeInput) codeInput.value = '';
            }
        }
        
        // Favicon preview
        const faviconImg = document.getElementById('faviconImg');
        const faviconPlaceholder = document.getElementById('faviconPlaceholder');
        if (data.favicon) {
            faviconImg.src = data.favicon;
            faviconImg.style.display = 'block';
            faviconPlaceholder.style.display = 'none';
        } else {
            faviconImg.style.display = 'none';
            faviconPlaceholder.style.display = 'block';
        }
        
        // Hide nginx config block
        document.getElementById('nginxConfigBlock').style.display = 'none';
        // Hide backup list block
        document.getElementById('backupListBlock').style.display = 'none';
    } catch (err) {
        console.error('Failed to load site settings:', err);
    }
}

// Save settings form
document.getElementById('siteSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentSettingsSiteId) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Сохранение...';
    submitBtn.disabled = true;
    
    try {
        const res = await fetch(`/api/site-settings/${encodeURIComponent(currentSettingsSiteId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({
                displayName: document.getElementById('settDisplayName').value,
                description: document.getElementById('settDescription').value,
                domain: document.getElementById('settDomain').value,
                metrikaId: document.getElementById('settMetrikaId').value,
                webvisor: document.getElementById('settWebvisor').checked,
                favicon: document.getElementById('settFavicon').value,
                backupEnabled: document.getElementById('settBackupEnabled').checked,
                backupFrequency: document.getElementById('settBackupFrequency').value,
                timezone: document.getElementById('settTimezone').value,
                forceSsl: document.getElementById('settForceSsl').checked,
                modules: {
                    commerce: document.getElementById('settModuleCommerce').checked,
                    news: document.getElementById('settModuleNews').checked
                },
                currency: document.getElementById('settCurrency').value,
                developerAccess: document.getElementById('settDeveloperCode') ? {
                    code: document.getElementById('settDeveloperCode').value,
                    permissions: {
                        files: document.getElementById('settDevPermFiles').checked,
                        editor: document.getElementById('settDevPermEditor').checked
                    }
                } : undefined
            })
        });
        
        if (res.ok) {
            showToast('Настройки сохранены', 'success');
            // Reload sites to update display name
            loadSites();
            // Dynamically reload site settings to update commerce lock and tab style
            loadSiteSettings(currentSettingsSiteId);
        } else {
            showToast('Ошибка сохранения настроек', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    } finally {
        submitBtn.textContent = 'Сохранить настройки';
        submitBtn.disabled = false;
    }
});

// Create Backup
document.getElementById('createBackupBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    const btn = document.getElementById('createBackupBtn');
    btn.disabled = true;
    btn.textContent = 'Создание...';
    
    try {
        const res = await fetch(`/api/backups/${encodeURIComponent(currentSettingsSiteId)}`, {
            method: 'POST',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
        } else {
            showToast('Ошибка: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Создать бэкап';
    }
});

// Download Backup
document.getElementById('downloadBackupBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    
    try {
        const res = await fetch(`/api/backups/${encodeURIComponent(currentSettingsSiteId)}`);
        const files = await res.json();
        
        if (files.length === 0) {
            showToast('Нет доступных бэкапов', 'info');
            return;
        }
        
        // Download the latest one
        const latest = files[0].filename;
        window.open(`/api/backups/${encodeURIComponent(currentSettingsSiteId)}/download/${encodeURIComponent(latest)}`, '_blank');
    } catch (err) {
        showToast('Ошибка загрузки бэкапов', 'error');
    }
});

// Restore Backup (Show list)
document.getElementById('restoreBackupBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    
    try {
        const res = await fetch(`/api/backups/${encodeURIComponent(currentSettingsSiteId)}`);
        const files = await res.json();
        
        const select = document.getElementById('settBackupSelect');
        select.innerHTML = '';
        
        if (files.length === 0) {
            showToast('Нет доступных бэкапов', 'info');
            return;
        }
        
        files.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.filename;
            opt.textContent = `${f.filename} (${(f.size / 1024 / 1024).toFixed(2)} MB) - ${new Date(f.mtime).toLocaleString()}`;
            select.appendChild(opt);
        });
        
        document.getElementById('backupListBlock').style.display = 'block';
    } catch (err) {
        showToast('Ошибка загрузки бэкапов', 'error');
    }
});

// Confirm Restore
document.getElementById('confirmRestoreBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    const filename = document.getElementById('settBackupSelect').value;
    if (!filename) return;
    
    if (!confirm(`Вы уверены, что хотите восстановить сайт из бэкапа ${filename}? Текущие файлы будут перемещены в папку с суффиксом _before_restore.`)) {
        return;
    }
    
    const btn = document.getElementById('confirmRestoreBtn');
    btn.disabled = true;
    btn.textContent = 'Восстановление...';
    
    try {
        const res = await fetch(`/api/backups/${encodeURIComponent(currentSettingsSiteId)}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ filename })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('backupListBlock').style.display = 'none';
        } else {
            showToast('Ошибка: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Подтвердить';
    }
});

// Generate nginx config
document.getElementById('genNginxBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    
    const block = document.getElementById('nginxConfigBlock');
    if (block.style.display === 'block') {
        block.style.display = 'none';
        return;
    }
    
    try {
        const res = await fetch(`/api/nginx-config/${encodeURIComponent(currentSettingsSiteId)}`);
        const data = await res.json();
        
        document.getElementById('nginxConfigOutput').textContent = data.config;
        block.style.display = 'block';
    } catch (err) {
        showToast('Ошибка генерации конфига', 'error');
    }
});

// Copy nginx config
document.getElementById('copyNginxBtn')?.addEventListener('click', () => {
    const config = document.getElementById('nginxConfigOutput').textContent;
    navigator.clipboard.writeText(config).then(() => {
        showToast('Конфиг скопирован', 'success');
    });
});

// Upload favicon
document.getElementById('uploadFaviconBtn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/x-icon,image/png,image/svg+xml,.ico';
    input.onchange = async () => {
        if (!input.files.length) return;
        
        const formData = new FormData();
        formData.append('path', currentSettingsSiteId);
        formData.append('files', input.files[0]);
        
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: formData
            });
            const data = await res.json();
            if (data.success && data.files && data.files[0]) {
                const faviconUrl = data.files[0].url;
                document.getElementById('settFavicon').value = faviconUrl;
                
                const faviconImg = document.getElementById('faviconImg');
                faviconImg.src = faviconUrl;
                faviconImg.style.display = 'block';
                document.getElementById('faviconPlaceholder').style.display = 'none';
                
                showToast('Фавикон загружен. Сохраните настройки.', 'success');
            } else {
                showToast('Ошибка загрузки', 'error');
            }
        } catch (err) {
            showToast('Ошибка сети', 'error');
        }
    };
    input.click();
});

// Favicon input preview
document.getElementById('settFavicon')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const faviconImg = document.getElementById('faviconImg');
    const faviconPlaceholder = document.getElementById('faviconPlaceholder');
    if (val) {
        faviconImg.src = val;
        faviconImg.style.display = 'block';
        faviconPlaceholder.style.display = 'none';
    } else {
        faviconImg.style.display = 'none';
        faviconPlaceholder.style.display = 'block';
    }
});

let activityOffset = 0;
const activityLimit = 10;

// Custom Dropdown Initialization
function setupCustomDropdown(dropdownId, onChange) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const header = dropdown.querySelector('.custom-dropdown-header');
    const list = dropdown.querySelector('.custom-dropdown-list');
    const textNode = dropdown.querySelector('.custom-dropdown-text');
    
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown.open').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
    });
    
    list.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-dropdown-item');
        if (!item) return;
        
        list.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        textNode.textContent = item.textContent;
        dropdown.dataset.value = item.dataset.value;
        dropdown.classList.remove('open');
        
        if (onChange) onChange(item.dataset.value);
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
});

// Filters
document.getElementById('activityTimeFilter')?.addEventListener('change', () => loadActivity(false));
document.getElementById('activitySiteFilter')?.addEventListener('change', () => loadActivity(false));
document.getElementById('loadMoreActivityBtn')?.addEventListener('click', () => {
    activityOffset += activityLimit;
    loadActivity(true);
});

// Fetch and display real activity
async function loadActivity(append = false) {
    const container = document.getElementById('activityContainer');
    const loadMoreBtn = document.getElementById('loadMoreActivityBtn');
    if (!container) return;
    
    if (!append) {
        activityOffset = 0;
    }
    
    const siteSelect = document.getElementById('activitySiteFilter');
    const dateSelect = document.getElementById('activityTimeFilter');
    const siteFilter = siteSelect && siteSelect.value !== 'all' ? siteSelect.value : '';
    const dateFilter = dateSelect && dateSelect.value !== 'all' ? dateSelect.value : '';
    
    try {
        const query = new URLSearchParams({
            limit: activityLimit,
            offset: activityOffset,
            siteId: siteFilter,
            dateFilter: dateFilter
        });
        
        const res = await fetch('/api/activity?' + query.toString());
        if (!res.ok) throw new Error('Failed to fetch activity');
        const data = await res.json();
        
        const items = data.items || [];
        
        if (!append) {
            container.innerHTML = '';
        }
        
        if (items.length === 0 && !append) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет недавней активности</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        
        items.forEach(item => {
            const date = new Date(item.mtime);
            const timeStr = date.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.fontSize = '0.85rem';
            
            let iconColor = 'var(--primary)';
            if (item.name.match(/\.(html)$/i)) iconColor = '#0070F3';
            if (item.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) iconColor = '#00CC66';
            if (item.name.match(/\.(css|js)$/i)) iconColor = '#FF9500';
            
            const isDraft = item.path.endsWith('.draft.html');
            
            // Извлекаем siteId
            const parts = item.path.split('/');
            const siteId = parts[0] || '';
            const displayPath = parts.slice(1).join('/');
            
            // Сгенерируем цвет бейджа на основе хеша siteId
            let hash = 0;
            for (let i = 0; i < siteId.length; i++) {
                hash = siteId.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash % 360);
            const badgeBg = `hsla(${hue}, 70%, 40%, 0.15)`;
            const badgeColor = `hsla(${hue}, 90%, 75%, 1)`;
            const badgeBorder = `hsla(${hue}, 70%, 40%, 0.3)`;
            
            const badgeHtml = siteId 
                ? `<span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 2px 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; font-family: monospace;">${siteId}</span>`
                : '';
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 8px; height: 8px; background: ${iconColor}; border-radius: 50%;"></div>
                    ${badgeHtml}
                    <span>Изменен файл <code style="background: var(--bg-hover); padding: 2px 4px; border-radius: 3px;">${displayPath || item.path}</code></span>
                    ${isDraft ? `<button class="revert-btn" data-path="${item.path}" style="background: none; border: none; color: #ff3333; cursor: pointer; font-size: 0.75rem; text-decoration: underline; margin-left: 5px;">Отменить</button>` : ''}
                </div>
                <span style="color: var(--text-muted);">${timeStr}</span>
            `;
            container.appendChild(div);
        });

        if (loadMoreBtn) {
            loadMoreBtn.style.display = data.hasMore ? 'block' : 'none';
        }

        // Add event listeners for revert buttons
        document.querySelectorAll('.revert-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const path = e.target.getAttribute('data-path');
                const page = path.replace('.draft.html', '.html');
                
                if (confirm(`Вы уверены, что хотите отменить изменения для ${page}?`)) {
                    const res = await fetch('/api/revert', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                        },
                        body: JSON.stringify({ page: page })
                    });
                    
                    if (res.ok) {
                        if (typeof showToast === 'function') showToast('Изменения отменены');
                        loadActivity(); // Reload
                    } else {
                        if (typeof showToast === 'function') showToast('Ошибка при отмене изменений', 'error');
                    }
                }
            });
        });
    } catch (err) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Ошибка загрузки активности</div>';
    }
}

async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        
        const totalSitesEl = document.getElementById('statTotalSites');
        const totalPagesEl = document.getElementById('statTotalPages');
        const totalImagesEl = document.getElementById('statTotalImages');
        const totalSizeEl = document.getElementById('statTotalSize');
        
        if (totalSitesEl) {
            if (data.limit === 'Безлимитно') {
                totalSitesEl.textContent = data.totalSites;
            } else {
                let limitNum = data.limit.toString().replace(/[^0-9]/g, '');
                totalSitesEl.textContent = `${data.totalSites} из ${limitNum}`;
            }
        }
        if (totalPagesEl) totalPagesEl.textContent = data.totalPages;
        if (totalImagesEl) totalImagesEl.textContent = data.totalImages;
        if (totalSizeEl) totalSizeEl.textContent = data.totalSize;
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// Onboarding
function initOnboarding() {
    if (localStorage.getItem('onboardingComplete') === 'true') return;
    
    // Create overlay for darkening the background
    const overlay = document.createElement('div');
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 30000; display: none;";
    
    const card = document.createElement('div');
    // Use theme variables!
    card.style.cssText = "position: absolute; background: var(--bg-card); color: var(--text-main); padding: 20px; border-radius: 12px; width: 320px; border: 1px solid var(--border); box-shadow: var(--shadow-lg); z-index: 30002; display: none; flex-direction: column;";
    
    const steps = [
        {
            title: "Добро пожаловать",
            text: "Добро пожаловать в meloddyCMS! Давайте проведём краткую экскурсию по панели.",
            target: "h1" 
        },
        {
            title: "Ваши проекты",
            text: "Здесь отображаются все ваши сайты. Кликните на карточку проекта, чтобы открыть меню действий.",
            target: "#sitesContainer"
        },
        {
            title: "Последняя активность",
            text: "Здесь вы можете видеть историю изменений и откатывать их.",
            target: "#activityContainer" 
        },
        {
            title: "Управление",
            text: "Используйте сайдбар для навигации между дашбордом, профилем и настройками.",
            target: ".sidebar-logo"
        }
    ];
    
    let currentStep = 0;
    let prevTarget = null;
    let prevPosition = '';
    let prevZIndex = '';
    
    function positionCard(targetEl) {
        if (!targetEl) {
            // Fallback to center of screen
            card.style.position = 'fixed';
            card.style.top = '50%';
            card.style.left = '50%';
            card.style.transform = 'translate(-50%, -50%)';
            return;
        }
        
        const rect = targetEl.getBoundingClientRect();
        card.style.position = 'absolute';
        card.style.transform = 'none';
        
        // Try to position below
        let top = rect.bottom + window.scrollY + 15;
        let left = rect.left + window.scrollX;
        
        // If it goes off screen on the right
        if (left + 320 > window.innerWidth) {
            left = window.innerWidth - 340;
        }
        // If it goes off screen on the bottom
        if (top + 200 > document.body.scrollHeight) {
            top = rect.top + window.scrollY - 200; // Position above
        }
        
        card.style.top = top + 'px';
        card.style.left = left + 'px';
        
        // Scroll to element smoothly
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    function renderStep() {
        const step = steps[currentStep];
        const targetEl = document.querySelector(step.target);
        
        // Restore previous target styles
        if (prevTarget) {
            prevTarget.style.position = prevPosition;
            prevTarget.style.zIndex = prevZIndex;
        }
        
        overlay.style.display = 'block';
        card.style.display = 'flex';
        
        if (targetEl) {
            // Save current styles
            prevTarget = targetEl;
            prevPosition = targetEl.style.position;
            prevZIndex = targetEl.style.zIndex;
            
            // Lift element above overlay
            targetEl.style.position = 'relative';
            targetEl.style.zIndex = '30001';
        }
        
        positionCard(targetEl);
        
        card.innerHTML = `
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Шаг ${currentStep + 1} из ${steps.length}</div>
            <h3 style="margin-bottom: 10px; font-size: 1.1rem; color: var(--text-main); font-weight: 600;">${step.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin-bottom: 20px;">${step.text}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <button id="skipOnboardingBtn" style="background: none; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer;">Пропустить</button>
                <button id="nextOnboardingBtn" class="btn" style="padding: 0.4rem 1rem; font-size: 0.85rem; background: var(--text-main); color: var(--bg-body); border: none; border-radius: 6px; cursor: pointer;">${currentStep === steps.length - 1 ? 'Понятно' : 'Далее'}</button>
            </div>
        `;
        
        setTimeout(() => {
            const nextBtn = document.getElementById('nextOnboardingBtn');
            const skipBtn = document.getElementById('skipOnboardingBtn');
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    currentStep++;
                    if (currentStep < steps.length) {
                        renderStep();
                    } else {
                        completeOnboarding();
                    }
                });
            }
            
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    completeOnboarding();
                });
            }
        }, 0);
    }
    
    function completeOnboarding() {
        localStorage.setItem('onboardingComplete', 'true');
        overlay.remove();
        card.remove();
        if (prevTarget) {
            prevTarget.style.position = prevPosition;
            prevTarget.style.zIndex = prevZIndex;
        }
    }
    
    document.body.appendChild(overlay);
    document.body.appendChild(card);
    renderStep();
}

// Init
checkAuth();
loadSites();
loadActivity();
loadStats();
setTimeout(initOnboarding, 1000);

// --- Analytics & History Logic ---
const analyticsModal = document.getElementById('analyticsModal');


async function loadAnalyticsData(siteId) {
    console.log('loadAnalyticsData called for site:', siteId);
    
    // Reset views
    document.getElementById('detStatus').textContent = 'Загрузка...';
    document.getElementById('detSize').textContent = '...';
    document.getElementById('detViews').textContent = '0';
    document.getElementById('detClicks').textContent = '0';
    document.getElementById('historyList').innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">Загрузка истории...</div>';

    try {
        // Parallel fetch
        const [infoRes, analyticsRes, historyRes] = await Promise.all([
            fetch(`/api/site-info/${siteId}`),
            fetch(`/api/analytics/${siteId}`),
            fetch(`/api/history/${siteId}`)
        ]);

        const info = await infoRes.json();
        const analytics = await analyticsRes.json();
        const history = await historyRes.json();

        // Update Info
        const statusEl = document.getElementById('detStatus');
        statusEl.textContent = info.status;
        statusEl.style.color = info.status === 'Онлайн' ? '#10b981' : '#f43f5e';
        document.getElementById('detSize').textContent = info.size;
        document.getElementById('detViews').textContent = analytics.views.length;
        document.getElementById('detClicks').textContent = analytics.clicks.length;

        // Render Chart
        renderAnalyticsChart(analytics);

        // Render History
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem;">История пуста</div>';
        } else {
            history.forEach(h => {
                const item = document.createElement('div');
                item.style.cssText = "padding: 12px; border-left: 3px solid var(--primary); background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; font-size: 0.85rem; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;";
                
                let icon = '📝';
                let actionText = 'Изменение';
                if (h.action === 'save') { icon = '💾'; actionText = 'Сохранение черновика'; }
                if (h.action === 'publish') { icon = '🚀'; actionText = 'Публикация сайта'; }
                if (h.action === 'rollback') { icon = '⏪'; actionText = 'Откат версии'; }
                
                const rollbackBtn = h.details?.backup ? `
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.7rem;" onclick="rollbackSite('${siteId}', '${h.details.backup}', '${h.details.page}')">Откатить</button>
                ` : '';

                item.innerHTML = `
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                            <span>${icon}</span> ${actionText}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                            ${new Date(h.timestamp).toLocaleString()} ${h.details?.page ? ' • ' + h.details.page : ''}
                        </div>
                    </div>
                    ${rollbackBtn}
                `;
                historyList.appendChild(item);
            });
        }

    } catch (err) {
        console.error(err);
        showToast('Ошибка при загрузке аналитики', 'error');
    }
}

function renderAnalyticsChart(data) {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    
    // Group by date (last 7 days)
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
    }

    const viewsByDay = new Array(7).fill(0);
    const clicksByDay = new Array(7).fill(0);

    const now = new Date();
    data.views.forEach(v => {
        const d = new Date(v.timestamp);
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 7) viewsByDay[6 - diff]++;
    });
    data.clicks.forEach(c => {
        const d = new Date(c.timestamp);
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 7) clicksByDay[6 - diff]++;
    });

    if (analyticsChart) analyticsChart.destroy();

    analyticsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Просмотры',
                    data: viewsByDay,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Клики',
                    data: clicksByDay,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true, padding: 20 } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.05)' }, ticks: { color: '#94a3b8', stepSize: 1, padding: 10 } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8', padding: 10 } }
            }
        }
    });

    renderBrowserChart(data);
    renderDeviceChart(data);
}

function renderBrowserChart(data) {
    const ctx = document.getElementById('browserChart').getContext('2d');
    const counts = {};
    data.views.forEach(v => {
        let b = v.browser;
        if (!b || b === 'Unknown') {
            const ua = v.ua || '';
            if (ua.includes("YaBrowser")) b = "Yandex Browser";
            else if (ua.includes("Firefox")) b = "Firefox";
            else if (ua.includes("SamsungBrowser")) b = "Samsung Browser";
            else if (ua.includes("Opera") || ua.includes("OPR")) b = "Opera";
            else if (ua.includes("Trident")) b = "Internet Explorer";
            else if (ua.includes("Edge")) b = "Edge";
            else if (ua.includes("Chrome")) b = "Chrome";
            else if (ua.includes("Safari")) b = "Safari";
            else b = "Unknown";
        }
        counts[b] = (counts[b] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    if (browserChart) browserChart.destroy();
    browserChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, padding: 8, font: { size: 9 } } }
            },
            cutout: '70%'
        }
    });
}

function renderDeviceChart(data) {
    const ctx = document.getElementById('deviceChart').getContext('2d');
    const counts = {};
    data.views.forEach(v => {
        let d = v.device;
        if (!d || d === 'Unknown') {
            const ua = v.ua || '';
            if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) d = "Tablet";
            else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) d = "Mobile";
            else d = "Desktop";
        }
        counts[d] = (counts[d] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    if (deviceChart) deviceChart.destroy();
    deviceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#3b82f6', '#f43f5e', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 10, padding: 8, font: { size: 9 } } }
            },
            cutout: '70%'
        }
    });
}

// --- Manual Site Upload Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const openUploadSiteBtn = document.getElementById('openUploadSiteBtn');
    const uploadSiteModal = document.getElementById('uploadSiteModal');
    const closeUploadModal = document.getElementById('closeUploadModal');
    const uploadSiteForm = document.getElementById('uploadSiteForm');
    const uploadSiteZip = document.getElementById('uploadSiteZip');
    const zipDropzone = document.getElementById('zipDropzone');
    const zipFileLabel = document.getElementById('zipFileLabel');
    const uploadSiteId = document.getElementById('uploadSiteId');
    const uploadValidationResult = document.getElementById('uploadValidationResult');
    const submitUploadBtn = document.getElementById('submitUploadBtn');

    if (!openUploadSiteBtn || !uploadSiteModal) return;

    // Open Modal
    openUploadSiteBtn.addEventListener('click', async () => {
        uploadSiteModal.style.display = 'flex';
        resetUploadForm();
    });

    // Close Modal
    closeUploadModal.addEventListener('click', () => {
        uploadSiteModal.style.display = 'none';
    });

    uploadSiteModal.addEventListener('click', (e) => {
        if (e.target === uploadSiteModal) {
            uploadSiteModal.style.display = 'none';
        }
    });

    // File Input Styling and Drag & Drop
    uploadSiteZip.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            zipFileLabel.textContent = file.name;
            zipDropzone.style.borderColor = 'var(--primary)';
            zipDropzone.style.background = 'rgba(255, 255, 255, 0.02)';
            
            // Auto-fill Site ID based on zip filename if empty
            if (!uploadSiteId.value) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9-_]/g, '-');
                uploadSiteId.value = nameWithoutExt;
            }
        }
    });

    // Visual dragover feedback
    zipDropzone.addEventListener('dragover', () => {
        zipDropzone.style.borderColor = 'var(--primary)';
        zipDropzone.style.background = 'rgba(255, 255, 255, 0.04)';
    });

    zipDropzone.addEventListener('dragleave', () => {
        if (!uploadSiteZip.files[0]) {
            zipDropzone.style.borderColor = 'var(--border)';
            zipDropzone.style.background = 'transparent';
        }
    });

    // Form Submission with Validation
    uploadSiteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const siteId = uploadSiteId.value.trim();
        const zipFile = uploadSiteZip.files[0];

        if (!siteId || !zipFile) {
            showValidationFeedback('Пожалуйста, заполните все поля.', 'error');
            return;
        }

        // Validate site ID format
        const siteIdRegex = /^[a-zA-Z0-9-_]+$/;
        if (!siteIdRegex.test(siteId)) {
            showValidationFeedback('ID сайта должен состоять только из латинских букв, цифр, дефисов и подчеркиваний.', 'error');
            return;
        }

        // Set Loading state
        submitUploadBtn.disabled = true;
        submitUploadBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: spin 1s linear infinite; margin-right: 8px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Обработка и проверка...`;
        uploadValidationResult.style.display = 'none';

        const formData = new FormData();
        formData.append('siteId', siteId);
        formData.append('zipFile', zipFile);

        try {
            const res = await fetch('/api/sites/upload-zip', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                showValidationFeedback(data.error || 'Произошла ошибка при загрузке.', 'error');
                return;
            }

            // Success with possible warnings
            let feedbackHtml = `
                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; color: #10b981; display: flex; align-items: center; gap: 6px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    ${data.message}
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; color: var(--text-main); margin-bottom: 8px; padding-left: 22px;">
                    <div>📝 Найдено текстовых блоков: <strong>${data.editableTexts}</strong></div>
                    <div>🖼️ Найдено редактируемых картинок: <strong>${data.editableImgs}</strong></div>
                </div>
            `;

            if (data.warning) {
                feedbackHtml += `
                    <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 10px; border-radius: 6px; margin-top: 8px;">
                        ${data.warning}
                    </div>
                `;
            }

            showValidationFeedback(feedbackHtml, data.warning ? 'warning' : 'success');

            // Success animations / reload
            if (typeof showToast === 'function') showToast('Сайт успешно установлен!');
            
            // Reload grid and stats
            loadSites();
            loadStats();

            // Auto close modal after 3 seconds on pure success, or let them read the warning
            if (!data.warning) {
                setTimeout(() => {
                    uploadSiteModal.style.display = 'none';
                }, 3000);
            }

        } catch (err) {
            showValidationFeedback('Не удалось связаться с сервером.', 'error');
        } finally {
            submitUploadBtn.disabled = false;
            submitUploadBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Загрузить и проверить`;
        }
    });

    function resetUploadForm() {
        uploadSiteForm.reset();
        zipFileLabel.textContent = 'Выберите или перетащите .ZIP файл';
        zipDropzone.style.borderColor = 'var(--border)';
        zipDropzone.style.background = 'transparent';
        uploadValidationResult.style.display = 'none';
    }

    function showValidationFeedback(content, type) {
        uploadValidationResult.style.display = 'block';
        uploadValidationResult.innerHTML = content;

        if (type === 'error') {
            uploadValidationResult.style.background = 'rgba(239, 68, 68, 0.08)';
            uploadValidationResult.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            uploadValidationResult.style.color = '#ef4444';
            uploadValidationResult.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 1.1rem;">❌</span>
                    <div>${content}</div>
                </div>
            `;
        } else if (type === 'warning') {
            uploadValidationResult.style.background = 'rgba(245, 158, 11, 0.05)';
            uploadValidationResult.style.borderColor = 'rgba(245, 158, 11, 0.15)';
            uploadValidationResult.style.color = 'var(--text-main)';
        } else {
            uploadValidationResult.style.background = 'rgba(16, 185, 129, 0.05)';
            uploadValidationResult.style.borderColor = 'rgba(16, 185, 129, 0.15)';
            uploadValidationResult.style.color = 'var(--text-main)';
        }
    }
});

// Add rotation style for loading spinner inline if not exists
const spinStyle = document.createElement('style');
spinStyle.innerHTML = `
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
`;
document.head.appendChild(spinStyle);

// --- RENAME CLIENT MODAL ACTIONS ---
function openRenameClientModal(clientId, currentName) {
    activeRenameClientId = clientId;
    const modal = document.getElementById('renameClientModal');
    const input = document.getElementById('renameClientInput');
    if (modal && input) {
        input.value = currentName || '';
        modal.style.display = 'flex';
        input.focus();
    }
}

// Bind Rename Client form submission
document.addEventListener('DOMContentLoaded', () => {
    const closeRenameModal = document.getElementById('closeRenameModal');
    const renameClientModal = document.getElementById('renameClientModal');
    const submitRenameBtn = document.getElementById('submitRenameBtn');
    const renameClientInput = document.getElementById('renameClientInput');

    if (closeRenameModal && renameClientModal) {
        closeRenameModal.addEventListener('click', () => {
            renameClientModal.style.display = 'none';
        });
        
        renameClientModal.addEventListener('click', (e) => {
            if (e.target === renameClientModal) renameClientModal.style.display = 'none';
        });
    }

    if (submitRenameBtn && renameClientInput) {
        submitRenameBtn.addEventListener('click', async () => {
            const newName = renameClientInput.value.trim();
            if (!newName) {
                if (typeof showToast === 'function') showToast('Имя клиента не может быть пустым!', 'error'); else alert('Имя клиента не может быть пустым!');
                return;
            }

            try {
                const res = await fetch(`/api/clients/${activeRenameClientId}/rename`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                    },
                    body: JSON.stringify({ name: newName })
                });

                const data = await res.json();
                if (res.ok) {
                    if (typeof showToast === 'function') showToast('Имя клиента успешно изменено!');
                    renameClientModal.style.display = 'none';
                    loadSites();
                } else {
                    if (typeof showToast === 'function') showToast(data.error || 'Ошибка при изменении имени', 'error'); else alert(data.error || 'Ошибка при изменении имени');
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Не удалось связаться с сервером', 'error'); else alert('Не удалось связаться с сервером');
            }
        });
    }
});

// --- TRANSFER SITE ACTIONS ---
function populateTransferClients() {
    const select = document.getElementById('transferSiteClientId');
    if (!select) return;
    
    select.innerHTML = '<option value="none">— Без владельца —</option>';
    allClients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

function populateUploadClients() {
    const select = document.getElementById('uploadSiteClientId');
    if (!select) return;
    
    select.innerHTML = '<option value="new">+ Создать нового клиента (Новый клиент)</option>';
    allClients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

// Bind Transfer and Delete actions inside the site management modal
document.addEventListener('DOMContentLoaded', () => {
    const transferSiteBtn = document.getElementById('transferSiteBtn');
    const deleteSiteBtn = document.getElementById('deleteSiteBtn');

    if (transferSiteBtn) {
        transferSiteBtn.addEventListener('click', async () => {
            const siteId = localStorage.getItem('activeSite');
            const targetEmail = document.getElementById('transferSiteEmail').value;
            if (!siteId || !targetEmail) {
                if (typeof showToast === 'function') showToast('Пожалуйста, введите email', 'error'); else alert('Пожалуйста, введите email');
                return;
            }

            try {
                const res = await fetch(`/api/sites/${siteId}/transfer`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                    },
                    body: JSON.stringify({ targetEmail })
                });

                const data = await res.json();
                if (res.ok) {
                    if (typeof showToast === 'function') showToast('Сайт успешно перенесен!');
                    document.getElementById('siteManageContainer').style.display = 'none'; document.getElementById('dashboardMainContainer').style.display = 'block';
                    loadSites();
                } else {
                    if (typeof showToast === 'function') showToast(data.error || 'Ошибка при переносе сайта', 'error'); else alert(data.error || 'Ошибка при переносе сайта');
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Не удалось связаться с сервером', 'error'); else alert('Не удалось связаться с сервером');
            }
        });
    }

    if (deleteSiteBtn) {
        deleteSiteBtn.addEventListener('click', async () => {
            const siteId = localStorage.getItem('activeSite');
            if (!siteId) return;

            if (confirm(`Вы уверены, что хотите перенести сайт "${siteId}" в корзину? Он будет храниться там 7 дней, после чего удалится навсегда.`)) {
                try {
                    const res = await fetch(`/api/sites/${siteId}/delete`, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                        }
                    });

                    const data = await res.json();
                    if (res.ok) {
                        if (typeof showToast === 'function') showToast('Сайт успешно перенесен в корзину!');
                        document.getElementById('siteManageContainer').style.display = 'none'; document.getElementById('dashboardMainContainer').style.display = 'block';
                        loadSites();
                        loadStats();
                    } else {
                        if (typeof showToast === 'function') showToast(data.error || 'Ошибка при удалении сайта', 'error'); else alert(data.error || 'Ошибка при удалении сайта');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('Не удалось связаться с сервером', 'error'); else alert('Не удалось связаться с сервером');
                }
            }
        });
    }
});

// --- TRASH BIN MODAL ACTIONS ---
document.addEventListener('DOMContentLoaded', () => {
    const openTrashBinBtn = document.getElementById('openTrashBinBtn');
    const trashBinModal = document.getElementById('trashBinModal');
    const closeTrashModal = document.getElementById('closeTrashModal');

    if (openTrashBinBtn && trashBinModal) {
        openTrashBinBtn.addEventListener('click', () => {
            trashBinModal.style.display = 'flex';
            loadTrashBin();
        });
    }

    if (closeTrashModal && trashBinModal) {
        closeTrashModal.addEventListener('click', () => {
            trashBinModal.style.display = 'none';
        });
        
        trashBinModal.addEventListener('click', (e) => {
            if (e.target === trashBinModal) trashBinModal.style.display = 'none';
        });
    }
});// --- Developer Tabs Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const tabProjects = document.getElementById('tabProjects');
    const tabTemplates = document.getElementById('tabTemplates');
    const tabRequests = document.getElementById('tabRequests');
    
    const projectsSection = document.getElementById('projectsSection');
    const templatesSection = document.getElementById('templatesSection');
    const requestsSection = document.getElementById('requestsSection');
    
    function switchDevTab(tab) {
        if(tabProjects) tabProjects.classList.remove('active');
        if(tabTemplates) tabTemplates.classList.remove('active');
        if(tabRequests) tabRequests.classList.remove('active');
        
        if(projectsSection) projectsSection.style.display = 'none';
        if(templatesSection) templatesSection.style.display = 'none';
        if(requestsSection) requestsSection.style.display = 'none';
        
        const titleEl = document.getElementById('dashboardSectionTitle');
        const openUploadSiteBtn = document.getElementById('openUploadSiteBtn');
        const openTrashBinBtn = document.getElementById('openTrashBinBtn');
        const openUploadTemplateBtn = document.getElementById('openUploadTemplateBtn');
        
        if (openUploadSiteBtn) openUploadSiteBtn.style.display = 'none';
        if (openTrashBinBtn) openTrashBinBtn.style.display = 'none';
        if (openUploadTemplateBtn) openUploadTemplateBtn.style.display = 'none';
        
        if (tab === 'projects') {
            if(tabProjects) tabProjects.classList.add('active');
            if(projectsSection) projectsSection.style.display = 'block';
            if(titleEl) titleEl.textContent = 'Проекты';
            
            if (openUploadSiteBtn) openUploadSiteBtn.style.display = 'flex';
            if (openTrashBinBtn && (currentUserIsAdmin || currentUserIsDeveloper)) {
                openTrashBinBtn.style.display = 'flex';
            }
        } else if (tab === 'templates') {
            if(tabTemplates) tabTemplates.classList.add('active');
            if(templatesSection) templatesSection.style.display = 'block';
            if(titleEl) titleEl.textContent = 'Шаблоны';
            if(typeof loadTemplates === 'function') loadTemplates();
            
            if (openUploadTemplateBtn) openUploadTemplateBtn.style.display = 'flex';
        } else if (tab === 'requests') {
            if(tabRequests) tabRequests.classList.add('active');
            if(requestsSection) requestsSection.style.display = 'block';
            if(titleEl) titleEl.textContent = 'Входящие заявки';
            if(typeof loadRequests === 'function') loadRequests();
        }
    }
    
    if (tabProjects) tabProjects.addEventListener('click', () => switchDevTab('projects'));
    if (tabTemplates) tabTemplates.addEventListener('click', () => switchDevTab('templates'));
    if (tabRequests) tabRequests.addEventListener('click', () => switchDevTab('requests'));
});

// --- Upload Template Modal Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const openUploadTemplateBtn = document.getElementById('openUploadTemplateBtn');
    const uploadTemplateModal = document.getElementById('uploadTemplateModal');
    const closeUploadTemplateModal = document.getElementById('closeUploadTemplateModal');
    const uploadTemplateForm = document.getElementById('uploadTemplateForm');
    
    if (openUploadTemplateBtn && uploadTemplateModal) {
        openUploadTemplateBtn.addEventListener('click', () => {
            uploadTemplateModal.style.display = 'flex';
        });
    }
    if (closeUploadTemplateModal && uploadTemplateModal) {
        closeUploadTemplateModal.addEventListener('click', () => {
            uploadTemplateModal.style.display = 'none';
        });
        uploadTemplateModal.addEventListener('click', (e) => {
            if (e.target === uploadTemplateModal) uploadTemplateModal.style.display = 'none';
        });
    }
    
    if (uploadTemplateForm) {
        uploadTemplateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadTemplateForm);
            try {
                const btn = uploadTemplateForm.querySelector('button[type="submit"]');
                const origText = btn.textContent;
                btn.textContent = 'Загрузка...';
                btn.disabled = true;
                
                const res = await fetch('/api/templates/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                btn.textContent = origText;
                btn.disabled = false;
                
                if (res.ok) {
                    showToast('Шаблон успешно загружен', 'success');
                    uploadTemplateModal.style.display = 'none';
                    uploadTemplateForm.reset();
                    if (typeof loadTemplates === 'function') loadTemplates();
                } else {
                    showToast(data.error || 'Ошибка загрузки шаблона', 'error');
                }
            } catch (err) {
                showToast('Ошибка сети', 'error');
            }
        });
    }
});

async function loadTemplates() {
    try {
        const res = await fetch('/api/templates');
        if (!res.ok) return;
        const templates = await res.json();
        const container = document.getElementById('templatesContainer');
        if (!container) return;
        if (templates.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 15px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">У вас пока нет шаблонов.</div>';
            return;
        }
        
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '1rem';
        
        container.innerHTML = templates.map(t => {
            const tagsHtml = t.tags && t.tags.length > 0 
                ? t.tags.map(tag => `<span style="background: rgba(37, 99, 235, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">${tag}</span>`).join('') 
                : '';
                
            return `
                <div class="hero-card" style="margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; min-width: 250px;">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        </div>
                        <div class="hero-info" style="flex: 1;">
                            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 600;">${t.name}</h3>
                            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem; line-height: 1.4;">${t.description || 'Нет описания'}</p>
                            <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
                                ${tagsHtml}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                        <button class="btn btn-accent" onclick="window.location.href='/visual-editor.html?site=_template_${t.id}'">В редактор</button>
                        <button class="btn btn-outline" onclick="window.location.href='/file-manager.html?site=_template_${t.id}'">Файлы</button>
                        <button class="btn btn-outline" onclick="window.location.href='/api/templates/${t.id}/download'">Скачать</button>
                        <button class="btn btn-outline" style="color: #f43f5e !important; border-color: rgba(244, 63, 94, 0.2) !important;" onclick="deleteTemplate('${t.id}')">Удалить</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e){}
}

async function deleteTemplate(id) {
    if(!confirm('Вы уверены, что хотите удалить этот шаблон?')) return;
    try {
        const res = await fetch('/api/templates/' + id, { method: 'DELETE' });
        if (res.ok) {
            showToast('Шаблон удален', 'success');
            loadTemplates();
        } else {
            showToast('Ошибка удаления', 'error');
        }
    } catch(e){}
}

async function loadRequests() {
    try {
        const res = await fetch('/api/developer/requests');
        if (!res.ok) return;
        const requests = await res.json();
        
        // Update badge
        const badge = document.getElementById('requestsCountBadge');
        if (badge) {
            if (requests.length > 0) {
                badge.textContent = requests.length;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        const container = document.getElementById('requestsContainer');
        if (!container) return;
        
        if (requests.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 15px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">Заявок пока нет</div>';
            return;
        }
        
        container.innerHTML = requests.map(req => {
            const dateStr = new Date(req.timestamp).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="hero-card" style="margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1; min-width: 250px;">
                        <div class="feature-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 600;">${req.clientName}</h3>
                            <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">Запрос на привязку по коду ${req.developerCode}</p>
                            <span style="color: var(--text-muted); font-size: 0.75rem; opacity: 0.7; display: block; margin-top: 4px;">Отправлено: ${dateStr}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-accent" onclick="handleRequestAction('${req.id}', 'accept')">Принять</button>
                        <button class="btn btn-outline" style="color: #f43f5e !important; border-color: rgba(244, 63, 94, 0.2) !important;" onclick="handleRequestAction('${req.id}', 'reject')">Отклонить</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Failed to load requests:', e);
    }
}

async function handleRequestAction(reqId, action) {
    const actionText = action === 'accept' ? 'принять' : 'отклонить';
    if (!confirm(`Вы действительно хотите ${actionText} эту заявку?`)) return;
    
    try {
        const res = await fetch(`/api/developer/requests/${reqId}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ action })
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast(action === 'accept' ? 'Заявка принята!' : 'Заявка отклонена');
            loadRequests();
            loadSites();
        } else {
            showToast(data.error || 'Ошибка при обработке заявки', 'error');
        }
    } catch (err) {
        showToast('Не удалось связаться с сервером', 'error');
    }
}

// Telegram UI Logic
document.getElementById('connectTelegramSiteBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    const code = document.getElementById('settTelegramCodeInput').value.trim();
    if (!code) {
        if (typeof showToast === 'function') showToast('Пожалуйста, введите код из бота', 'error'); else alert('Пожалуйста, введите код из бота');
        return;
    }
    
    const btn = document.getElementById('connectTelegramSiteBtn');
    const oldText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;
    
    try {
        const res = await fetch(`/api/site-settings/${encodeURIComponent(currentSettingsSiteId)}/telegram-connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (data.success) {
            if (typeof showToast === 'function') showToast('Сайт успешно подключен к Telegram', 'success');
            loadSiteSettings(currentSettingsSiteId);
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка подключения', 'error'); else alert(data.error || 'Ошибка подключения');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Ошибка сети', 'error');
    } finally {
        btn.textContent = oldText;
        btn.disabled = false;
    }
});

document.getElementById('disconnectTelegramBtn')?.addEventListener('click', async () => {
    if (!currentSettingsSiteId) return;
    if (!confirm('Вы уверены, что хотите отключить уведомления в Telegram?')) return;
    
    const btn = document.getElementById('disconnectTelegramBtn');
    btn.disabled = true;
    
    try {
        const res = await fetch(`/api/site-settings/${encodeURIComponent(currentSettingsSiteId)}/telegram-disconnect`, {
            method: 'POST',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        const data = await res.json();
        if (data.success) {
            if (typeof showToast === 'function') showToast('Telegram отключен', 'success');
            loadSiteSettings(currentSettingsSiteId);
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка', 'error'); else alert(data.error || 'Ошибка');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Ошибка сети', 'error');
    } finally {
        btn.disabled = false;
    }
});

function renderCustomSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Remove existing custom dropdown if any
    if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-dropdown')) {
        select.nextElementSibling.remove();
    }
    
    select.style.display = 'none';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-dropdown';
    wrapper.style.minWidth = '160px';
    
    const header = document.createElement('div');
    header.className = 'custom-dropdown-header';
    header.style.background = 'var(--bg-card)';
    header.style.border = '1px solid var(--border)';
    header.style.borderRadius = '6px';
    header.style.padding = '8px 12px';
    
    const text = document.createElement('div');
    text.className = 'custom-dropdown-text';
    text.textContent = select.options[select.selectedIndex]?.text || '';
    
    const icon = document.createElement('div');
    icon.innerHTML = '<svg fill="currentColor" height="16" viewBox="0 0 24 24" width="16"><path d="M7 10l5 5 5-5z"/></svg>';
    
    header.appendChild(text);
    header.appendChild(icon);
    wrapper.appendChild(header);
    
    const list = document.createElement('div');
    list.className = 'custom-dropdown-list';
    
    Array.from(select.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-dropdown-item';
        item.textContent = opt.text;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            text.textContent = opt.text;
            select.value = opt.value;
            select.dispatchEvent(new Event('change'));
            wrapper.classList.remove('open');
        });
        list.appendChild(item);
    });
    wrapper.appendChild(list);
    
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
        if (!isOpen) wrapper.classList.add('open');
    });
    
    select.parentNode.insertBefore(wrapper, select.nextSibling);
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.site-dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
        menu.closest('.hero-card')?.classList.remove('active-dropdown');
    });
});

// --- TRASH BIN OPERATIONS ---
async function loadTrashBin() {
    const clientsList = document.getElementById('deletedClientsList');
    const sitesList = document.getElementById('deletedSitesList');
    if (!clientsList || !sitesList) return;

    try {
        const res = await fetch('/api/trash');
        if (!res.ok) throw new Error('Failed to load trash bin');
        const data = await res.json();

        // Render Clients
        if (!data.clients || data.clients.length === 0) {
            clientsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; background: rgba(255,255,255,0.01); border-radius: 8px; border: 1px dashed var(--border);">Нет удаленных клиентов</div>';
        } else {
            clientsList.innerHTML = '';
            data.clients.forEach(c => {
                const div = document.createElement('div');
                div.style.background = 'var(--bg-body)';
                div.style.border = '1px solid var(--border)';
                div.style.borderRadius = '8px';
                div.style.padding = '12px 16px';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                
                const deletedDate = new Date(c.deletedAt).toLocaleDateString('ru-RU');
                
                div.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">${c.name} (${c.username})</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Удален: ${deletedDate} • Сайтов в корзине: ${c.sitesCount}</div>
                    </div>
                    <button class="btn btn-outline restore-client-btn" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 600;">
                        Восстановить
                    </button>
                `;
                
                div.querySelector('.restore-client-btn').addEventListener('click', async () => {
                    await restoreClientFromTrash(c.id);
                });
                
                clientsList.appendChild(div);
            });
        }

        // Render Sites
        if (!data.sites || data.sites.length === 0) {
            sitesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px; background: rgba(255,255,255,0.01); border-radius: 8px; border: 1px dashed var(--border);">Нет удаленных сайтов</div>';
        } else {
            sitesList.innerHTML = '';
            data.sites.forEach(s => {
                const div = document.createElement('div');
                div.style.background = 'var(--bg-body)';
                div.style.border = '1px solid var(--border)';
                div.style.borderRadius = '8px';
                div.style.padding = '12px 16px';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                
                const deletedDate = new Date(s.deletedAt).toLocaleDateString('ru-RU');
                
                div.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">${s.displayName} (${s.siteId})</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Удален: ${deletedDate}</div>
                    </div>
                    <button class="btn btn-outline restore-site-btn" data-folder="${s.folderName}" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 600;">
                        Восстановить
                    </button>
                `;
                
                div.querySelector('.restore-site-btn').addEventListener('click', async () => {
                    await restoreSiteFromTrash(s.folderName);
                });
                
                sitesList.appendChild(div);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function restoreSiteFromTrash(folderName) {
    try {
        const res = await fetch('/api/trash/restore-site', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ folderName })
        });
        const data = await res.json();
        if (res.ok) {
            if (typeof showToast === 'function') showToast(data.message || 'Сайт успешно восстановлен!');
            loadTrashBin();
            loadSites();
            loadStats();
        } else {
            alert(data.error || 'Ошибка при восстановлении сайта');
        }
    } catch (err) {
        alert('Не удалось связаться с сервером');
    }
}

async function restoreClientFromTrash(clientId) {
    try {
        const res = await fetch('/api/trash/restore-client', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ id: clientId })
        });
        const data = await res.json();
        if (res.ok) {
            if (typeof showToast === 'function') showToast(data.message || 'Клиент успешно восстановлен!');
            loadTrashBin();
            loadSites();
            loadStats();
        } else {
            alert(data.error || 'Ошибка при восстановлении клиента');
        }
    } catch (err) {
        alert('Не удалось связаться с сервером');
    }
}

// Commerce blocked modal helper
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('goToCommerceSettingsBtn')?.addEventListener('click', () => {
        document.getElementById('commerceBlockedModal').style.display = 'none';
        switchSiteTab('settings');
    });
});
