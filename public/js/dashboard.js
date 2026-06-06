// Check auth first
async function checkAuth() {
    const res = await fetch('/api/check-auth');
    if (!res.ok) {
        window.location.href = '/login.html';
    }
}

const siteMenuModal = document.getElementById('siteMenuModal');
const closeSiteMenuModal = document.getElementById('closeSiteMenuModal');
let analyticsChart = null;
let browserChart = null;
let deviceChart = null;
let allClients = [];
let activeRenameClientId = null;

if (closeSiteMenuModal) {
    closeSiteMenuModal.addEventListener('click', () => {
        siteMenuModal.style.display = 'none';
        destroyAnalyticsChart();
    });
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === siteMenuModal) {
        siteMenuModal.style.display = 'none';
        destroyAnalyticsChart();
    }
});

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

// Fetch and display sites
async function loadSites() {
    const container = document.getElementById('sitesContainer');
    if (!container) return;
    
    // Force layout to flex column as requested by user
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '1.5rem';
    
    try {
        const res = await fetch('/api/sites');
        if (!res.ok) throw new Error('Failed to fetch sites');
        const data = await res.json();
        
        container.innerHTML = '';
        
        // Check role and display/hide Admin-only elements
        const isAdmin = data.isAdmin === true;
        document.querySelectorAll('.admin-only-action').forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });
        
        // Show/hide Trash Bin button
        const openTrashBinBtn = document.getElementById('openTrashBinBtn');
        if (openTrashBinBtn) {
            openTrashBinBtn.style.display = isAdmin ? 'flex' : 'none';
        }
        
        if (isAdmin) {
            allClients = data.clients || [];
            
            // Populate Transfer Client Select
            populateTransferClients();
            
            // Admin view: tabs or list of clients
            if (!data.clients || data.clients.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет клиентов</div>';
                return;
            }
            
            // Create tabs
            const tabsContainer = document.createElement('div');
            tabsContainer.style.display = 'grid';
            tabsContainer.style.gridTemplateColumns = `repeat(${data.clients.length}, 1fr)`;
            tabsContainer.style.gap = '0.5rem';
            tabsContainer.style.marginBottom = '0';
            tabsContainer.style.padding = '0.5rem';
            tabsContainer.style.background = 'rgba(255, 255, 255, 0.02)';
            tabsContainer.style.borderRadius = '12px';
            tabsContainer.style.border = '1px solid rgba(255, 255, 255, 0.05)';
            tabsContainer.style.width = '100%';
            tabsContainer.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.05)';
            
            const contentContainer = document.createElement('div');
            
            data.clients.forEach((client, index) => {
                const tab = document.createElement('div');
                tab.className = 'client-tab-item';
                tab.dataset.clientId = client.id;
                
                tab.style.display = 'flex';
                tab.style.alignItems = 'center';
                tab.style.justifyContent = 'space-between';
                tab.style.background = index === 0 ? '#FFFFFF' : 'transparent';
                tab.style.color = index === 0 ? '#1A1D20' : 'rgba(255, 255, 255, 0.6)';
                tab.style.borderRadius = '8px';
                tab.style.transition = 'all 0.2s ease';
                tab.style.padding = '0 8px';
                
                tab.innerHTML = `
                    <button class="client-name-btn" style="flex: 1; display: flex; align-items: center; justify-content: flex-start; background: none; border: none; color: inherit; cursor: pointer; font-weight: 600; font-size: 0.85rem; padding: 0.75rem 4px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; opacity: 0.8; flex-shrink: 0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span class="client-name-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${client.name || client.username}</span>
                    </button>
                    <div style="display: flex; align-items: center; gap: 2px;">
                        <button class="client-edit-btn" style="background: none; border: none; color: inherit; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; opacity: 0.5; transition: opacity 0.2s; border-radius: 4px;" title="Редактировать имя">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="client-delete-btn" style="background: none; border: none; color: #f43f5e; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; opacity: 0.5; transition: opacity 0.2s; border-radius: 4px;" title="Удалить клиента">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;
                
                // Add hover effect
                tab.addEventListener('mouseenter', () => {
                    if (tab.style.background === 'transparent' || tab.style.background === 'none') {
                        tab.style.background = 'rgba(255, 255, 255, 0.05)';
                        tab.style.color = '#FFFFFF';
                    }
                    tab.querySelectorAll('button').forEach(btn => {
                        if (!btn.classList.contains('client-name-btn')) btn.style.opacity = '0.9';
                    });
                });
                tab.addEventListener('mouseleave', () => {
                    if (tab.style.background === 'rgba(255, 255, 255, 0.05)') {
                        tab.style.background = 'transparent';
                        tab.style.color = 'rgba(255, 255, 255, 0.6)';
                    }
                    tab.querySelectorAll('button').forEach(btn => {
                        if (!btn.classList.contains('client-name-btn')) btn.style.opacity = '0.5';
                    });
                });
                
                // Switch client active tab
                tab.querySelector('.client-name-btn').addEventListener('click', () => {
                    tabsContainer.querySelectorAll('.client-tab-item').forEach(b => {
                        b.style.color = 'rgba(255, 255, 255, 0.6)';
                        b.style.background = 'transparent';
                    });
                    
                    tab.style.color = '#1A1D20';
                    tab.style.background = '#FFFFFF';
                    
                    // Show sites for this client
                    renderClientSites(client.sites, contentContainer);
                });
                
                // Rename Client Action (using custom styled modal)
                tab.querySelector('.client-edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openRenameClientModal(client.id, client.name || client.username);
                });
                
                // Delete Client Action (Trash bin retention)
                tab.querySelector('.client-delete-btn').addEventListener('click', async (e) => {
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
                                alert(data.error || 'Ошибка при удалении клиента');
                            }
                        } catch (err) {
                            alert('Не удалось связаться с сервером');
                        }
                    }
                });
                
                tabsContainer.appendChild(tab);
            });
            
            container.appendChild(tabsContainer);
            container.appendChild(contentContainer);
            
            // Render first client's sites by default
            if (data.clients.length > 0) {
                renderClientSites(data.clients[0].sites, contentContainer);
            }
            
        } else {
            // Client view: just list sites
            if (data.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет активных проектов</div>';
                return;
            }
            renderClientSites(data, container);
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Ошибка загрузки проектов</div>';
    }
}

function renderClientSites(sites, container) {
    container.innerHTML = '';
    if (!sites || sites.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет активных проектов</div>';
        return;
    }
    
    sites.forEach(site => {
        const div = document.createElement('div');
        div.className = 'hero-card';
        div.style.cursor = 'pointer';
        div.style.transition = 'transform 0.2s, box-shadow 0.2s';
        div.style.background = 'var(--bg-card)';
        div.style.border = '1px solid var(--border)';
        div.style.borderRadius = 'var(--radius-lg)';
        div.style.padding = '1.5rem';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.marginBottom = '1rem';
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="width: 48px; height: 48px; background: var(--bg-active); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--primary);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <div class="hero-info">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <h3 style="margin: 0; font-size: 1.1rem;">${site.name}</h3>
                        <span style="padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; ${site.status === 'online' ? 'background: rgba(16,185,129,0.1); color: #10b981;' : 'background: rgba(244,63,94,0.1); color: #f43f5e;'}">
                            ${site.status === 'online' ? '● Онлайн' : '○ Оффлайн'}
                        </span>
                        ${site.hasDrafts ? '<span style="background: rgba(255,165,0,0.1); color: #ffa500; padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: 700;">ЧЕРНОВИК</span>' : ''}
                    </div>
                    <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.85rem;">${site.description || 'ID: ' + site.path}</p>
                    <div style="display: flex; gap: 12px; margin-top: 6px;">
                        ${site.domain ? `<span style="color: var(--text-muted); font-size: 0.75rem; opacity: 0.7;">🌐 ${site.domain}</span>` : ''}
                        <span style="color: var(--text-muted); font-size: 0.75rem; opacity: 0.7;">📦 ${(site.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="color: var(--text-muted);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
        `;
        
        div.addEventListener('click', (e) => {
            
            localStorage.setItem('activeSite', site.path);
            const viewSiteBtn = document.getElementById('viewSiteBtn');
            if (viewSiteBtn) viewSiteBtn.href = `/real-site/${site.path}/index.html`;
            
            const openEditorBtn = document.getElementById('openEditorBtn');
            if (openEditorBtn) openEditorBtn.href = `/visual-editor.html?site=${site.path}`;
            
            // Set modal title
            const siteModalTitle = document.getElementById('siteModalTitle');
            if (siteModalTitle) siteModalTitle.textContent = site.name || site.path;
            
            // Reset to actions tab
            switchSiteTab('actions');
            
            siteMenuModal.style.display = 'flex';
        });
        
        container.appendChild(div);
    });
}

// --- Site Settings Tab Logic ---
let currentSettingsSiteId = '';

function switchSiteTab(tab) {
    const tabActions = document.getElementById('tabActions');
    const tabSettings = document.getElementById('tabSettings');
    const tabSeo = document.getElementById('tabSeo');
    const tabLeads = document.getElementById('tabLeads');
    const tabAnalytics = document.getElementById('tabAnalytics');
    
    const panelActions = document.getElementById('panelActions');
    const panelSettings = document.getElementById('panelSettings');
    const panelSeo = document.getElementById('panelSeo');
    const panelLeads = document.getElementById('panelLeads');
    const panelAnalytics = document.getElementById('panelAnalytics');
    
    // Reset all
    [tabActions, tabSettings, tabSeo, tabLeads, tabAnalytics].forEach(t => {
        if (t) {
            t.style.background = 'none';
            t.style.color = 'var(--text-muted)';
        }
    });
    [panelActions, panelSettings, panelSeo, panelLeads, panelAnalytics].forEach(p => { if (p) p.style.display = 'none'; });

    currentSettingsSiteId = localStorage.getItem('activeSite') || '';

    if (tab === 'actions') {
        if (tabActions) {
            tabActions.style.background = 'rgba(255,255,255,0.05)';
            tabActions.style.color = 'var(--text-main)';
        }
        if (panelActions) panelActions.style.display = 'block';
    } else if (tab === 'settings') {
        if (tabSettings) {
            tabSettings.style.background = 'rgba(255,255,255,0.05)';
            tabSettings.style.color = 'var(--text-main)';
        }
        if (panelSettings) panelSettings.style.display = 'block';
        if (currentSettingsSiteId) loadSiteSettings(currentSettingsSiteId);
    } else if (tab === 'seo') {
        if (tabSeo) {
            tabSeo.style.background = 'rgba(255,255,255,0.05)';
            tabSeo.style.color = 'var(--text-main)';
        }
        if (panelSeo) panelSeo.style.display = 'block';
        if (currentSettingsSiteId) loadSeoData(currentSettingsSiteId);
    } else if (tab === 'leads') {
        if (tabLeads) {
            tabLeads.style.background = 'rgba(255,255,255,0.05)';
            tabLeads.style.color = 'var(--text-main)';
        }
        if (panelLeads) panelLeads.style.display = 'block';
        if (currentSettingsSiteId) loadLeadsData(currentSettingsSiteId);
    } else if (tab === 'analytics') {
        if (tabAnalytics) {
            tabAnalytics.style.background = 'rgba(255,255,255,0.05)';
            tabAnalytics.style.color = 'var(--text-main)';
        }
        if (panelAnalytics) panelAnalytics.style.display = 'block';
        if (currentSettingsSiteId) loadAnalyticsData(currentSettingsSiteId);
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
        document.getElementById('settBackupEnabled').checked = !!data.backupEnabled;
        document.getElementById('settBackupFrequency').value = data.backupFrequency || 'daily';
        
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
                backupFrequency: document.getElementById('settBackupFrequency').value
            })
        });
        
        if (res.ok) {
            showToast('Настройки сохранены', 'success');
            // Reload sites to update display name
            loadSites();
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
    
    try {
        const res = await fetch(`/api/nginx-config/${encodeURIComponent(currentSettingsSiteId)}`);
        const data = await res.json();
        
        document.getElementById('nginxConfigOutput').textContent = data.config;
        document.getElementById('nginxConfigBlock').style.display = 'block';
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
        formData.append('files', input.files[0]);
        formData.append('path', currentSettingsSiteId);
        
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

// Fetch and display real activity
async function loadActivity() {
    const container = document.getElementById('activityContainer');
    if (!container) return;
    
    try {
        const res = await fetch('/api/activity');
        if (!res.ok) throw new Error('Failed to fetch activity');
        const data = await res.json();
        
        if (data.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Нет недавней активности</div>';
            return;
        }
        
        container.innerHTML = '';
        data.forEach(item => {
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
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 8px; height: 8px; background: ${iconColor}; border-radius: 50%;"></div>
                    <span>Изменен файл <code style="background: var(--bg-hover); padding: 2px 4px; border-radius: 3px;">${item.path}</code></span>
                    ${isDraft ? `<button class="revert-btn" data-path="${item.path}" style="background: none; border: none; color: #ff3333; cursor: pointer; font-size: 0.75rem; text-decoration: underline; margin-left: 5px;">Отменить</button>` : ''}
                </div>
                <span style="color: var(--text-muted);">${timeStr}</span>
            `;
            container.appendChild(div);
        });

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
                totalSitesEl.textContent = `${data.totalSites} из ${data.limit}`;
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
        
        // Populate owner clients select dynamically
        const select = document.getElementById('uploadSiteClientId');
        if (select) {
            select.innerHTML = '<option value="new">+ Создать нового клиента (Новый клиент)</option>';
            try {
                const res = await fetch('/api/clients');
                if (res.ok) {
                    const clients = await res.json();
                    clients.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = c.name;
                        select.appendChild(opt);
                    });
                }
            } catch (err) {
                console.error('Failed to load clients:', err);
            }
        }
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
        
        const clientIdSelect = document.getElementById('uploadSiteClientId');
        if (clientIdSelect) {
            formData.append('clientId', clientIdSelect.value);
        }

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
                alert('Имя клиента не может быть пустым!');
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
                    alert(data.error || 'Ошибка при изменении имени');
                }
            } catch (err) {
                alert('Не удалось связаться с сервером');
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
            const targetClientId = document.getElementById('transferSiteClientId').value;
            if (!siteId) return;

            try {
                const res = await fetch(`/api/sites/${siteId}/transfer`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                    },
                    body: JSON.stringify({ targetClientId })
                });

                const data = await res.json();
                if (res.ok) {
                    if (typeof showToast === 'function') showToast('Сайт успешно перенесен!');
                    document.getElementById('siteMenuModal').style.display = 'none';
                    loadSites();
                } else {
                    alert(data.error || 'Ошибка при переносе сайта');
                }
            } catch (err) {
                alert('Не удалось связаться с сервером');
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
                        document.getElementById('siteMenuModal').style.display = 'none';
                        loadSites();
                        loadStats();
                    } else {
                        alert(data.error || 'Ошибка при удалении сайта');
                    }
                } catch (err) {
                    alert('Не удалось связаться с сервером');
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
});

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
            if (typeof showToast === 'function') showToast('Сайт успешно подключен к Telegram', 'success'); else alert('Сайт успешно подключен к Telegram');
            loadSiteSettings(currentSettingsSiteId);
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка подключения', 'error'); else alert(data.error || 'Ошибка подключения');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Ошибка сети', 'error'); else alert('Ошибка сети');
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
            if (typeof showToast === 'function') showToast('Telegram отключен', 'success'); else alert('Telegram отключен');
            loadSiteSettings(currentSettingsSiteId);
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка', 'error'); else alert(data.error || 'Ошибка');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Ошибка сети', 'error'); else alert('Ошибка сети');
    } finally {
        btn.disabled = false;
    }
});
