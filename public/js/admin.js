// admin.js
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check if user is Super Admin
    const res = await fetch('/api/check-auth');
    if (!res.ok) {
        window.location.href = '/login.html';
        return;
    }
    const data = await res.json();
    if (!data.user || data.user.role !== 'admin') {
        window.location.href = '/dashboard.html'; // Redirect if not admin
        return;
    }

    // Active Sidebar logic
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // 2. Load Users
    async function loadUsers() {
        const usersRes = await fetch('/api/admin/users');
        const tbody = document.getElementById('adminUsersTableBody');
        if (!usersRes.ok) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; color: #ff4d4d;">Ошибка загрузки пользователей</td></tr>';
            return;
        }
        const users = await usersRes.json();
        window.globalUsers = users;
        
        tbody.innerHTML = '';
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 10px;">Нет пользователей</td></tr>';
            return;
        }

        users.forEach(u => {
            let roleDisplay = u.role === 'admin' ? '<span style="color: #ff4d4d; font-weight: bold;">Админ</span>' : 'Клиент';
            if (u.role === 'client' && u.developerCode) roleDisplay = '<span style="color: #00DFD8; font-weight: bold;">Разработчик</span>';
            
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td style="padding: 12px 10px; color: var(--text-main); font-weight: 500;">${u.username}</td>
                <td style="padding: 12px 10px;">${roleDisplay}</td>
                <td style="padding: 12px 10px; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; color: var(--primary);">${u.plan || 'free'}</td>
                <td style="padding: 12px 10px; font-family: monospace; color: var(--text-muted);">${u.developerCode || '—'}</td>
                <td style="padding: 12px 10px; text-align: right;">
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openAdminUserModal('${u.id}')">Детали</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 3. Load Sites
    async function loadSites() {
        const sitesRes = await fetch('/api/admin/sites');
        const tbody = document.getElementById('adminSitesTableBody');
        if (!sitesRes.ok) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 10px; color: #ff4d4d;">Ошибка загрузки сайтов</td></tr>';
            return;
        }
        const sites = await sitesRes.json();
        
        tbody.innerHTML = '';
        if (sites.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 10px;">Нет сайтов в системе</td></tr>';
            return;
        }

        sites.forEach(site => {
            let domainDisplay = site.domain 
                ? `<a href="http://${site.domain}" target="_blank" style="color: var(--primary);">${site.domain}</a>` 
                : `<span style="color: var(--text-muted);">Внутренний: ${site.id}</span>`;
                
            if (site.isTemplate) {
                domainDisplay = `<span style="background: rgba(108,92,231,0.1); color: #6c5ce7; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">Шаблон: ${site.templateName || site.id}</span>`;
            }

            const ownerDisplay = site.ownerName !== 'Unknown' ? `<b>${site.ownerName}</b> <span style="color: var(--text-muted); font-size: 0.85rem;">(ID: ${site.ownerId})</span>` : `<span style="color: var(--text-muted)">Нет владельца</span>`;
            const devDisplay = site.developerAccess ? `<div style="font-size: 0.8rem; color: #00DFD8; margin-top: 4px;">Разраб: ${site.developerAccess.code}</div>` : '';
            const fullOwnerDisplay = ownerDisplay + devDisplay;

            const statusBadge = site.isActive 
                ? `<span style="background: rgba(16,185,129,0.1); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(16,185,129,0.2);">Активен</span>`
                : `<span style="background: rgba(244,63,94,0.1); color: #f43f5e; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(244,63,94,0.2);">Отключен</span>`;
                
            const toggleBtn = `<button onclick="toggleSiteStatus('${site.id}')" style="background: ${site.isActive ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)'}; color: ${site.isActive ? '#f43f5e' : '#10b981'}; border: 1px solid ${site.isActive ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; margin-left: 10px; transition: all 0.2s;">${site.isActive ? 'Выключить' : 'Включить'}</button>`;

            const editBtn = `<button onclick="openEditSiteModal('${site.id}', ${site.ownerId ? `'${site.ownerId}'` : 'null'}, ${site.developerAccess ? `'${site.developerAccess.code}'` : 'null'})" style="background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; margin-right: 10px; transition: all 0.2s;">Изменить</button>`;
            
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.innerHTML = `
                <td style="padding: 12px 10px; color: var(--text-main); font-weight: 500;">${site.id}</td>
                <td style="padding: 12px 10px;">${domainDisplay}</td>
                <td style="padding: 12px 10px;">${fullOwnerDisplay}</td>
                <td style="padding: 12px 10px; text-align: right; display: flex; align-items: center; justify-content: flex-end;">${editBtn}${statusBadge}${toggleBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Tab switching
    const tabUsers = document.getElementById('tabAdminUsers');
    const tabSites = document.getElementById('tabAdminSites');
    const secUsers = document.getElementById('adminUsersSection');
    const secSites = document.getElementById('adminSitesSection');

    tabUsers.addEventListener('click', () => {
        tabUsers.classList.add('active');
        tabSites.classList.remove('active');
        
        secUsers.style.display = 'block';
        secSites.style.display = 'none';
        
        loadUsers();
    });

    tabSites.addEventListener('click', () => {
        tabSites.classList.add('active');
        tabUsers.classList.remove('active');
        
        secSites.style.display = 'block';
        secUsers.style.display = 'none';
        
        loadSites();
    });

    // Initial load
    loadUsers();

    window.deleteUser = async function(userId) {
        if (!confirm('Вы уверены, что хотите удалить этого пользователя? (Вместе с ним удалятся все его проекты)')) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'X-CSRF-Token': (typeof getCsrfToken === 'function' ? getCsrfToken() : '') } });
            const data = await res.json();
            if (data.success) {
                showToast('Пользователь и его проекты удалены');
                loadUsers();
            } else showToast(data.error || 'Ошибка', 'error');
        } catch (e) {
            showToast('Ошибка сети', 'error');
        }
    };

    // Edit Site Logic
    window.openEditSiteModal = function(siteId, currentOwnerId, devCode) {
        const modal = document.getElementById('editSiteModal');
        document.getElementById('editSiteIdLabel').textContent = siteId;
        document.getElementById('editSiteIdInput').value = siteId;
        
        const select = document.getElementById('editSiteOwnerSelect');
        select.innerHTML = '<option value="none">Без владельца (Системный)</option>';
        
        // Assuming global variable `globalUsers` is available or fetched
        if (typeof globalUsers !== 'undefined') {
            globalUsers.forEach(u => {
                if (u.role === 'client') {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.textContent = `${u.name || u.username} (${u.email})`;
                    if (currentOwnerId && String(u.id) === String(currentOwnerId)) {
                        opt.selected = true;
                    }
                    select.appendChild(opt);
                }
            });
        }
        
        document.getElementById('editSiteDeveloperCode').value = devCode || '';
        
        modal.style.display = 'flex';
    };

    const editSiteModal = document.getElementById('editSiteModal');
    if (editSiteModal) {
        document.getElementById('closeEditSiteModal').addEventListener('click', () => editSiteModal.style.display = 'none');
        document.getElementById('cancelEditSiteBtn').addEventListener('click', () => editSiteModal.style.display = 'none');
        
        document.getElementById('editSiteForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const siteId = document.getElementById('editSiteIdInput').value;
            const targetClientId = document.getElementById('editSiteOwnerSelect').value;
            const developerCode = document.getElementById('editSiteDeveloperCode').value;
            
            try {
                const res = await fetch(`/api/sites/${siteId}/transfer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': (typeof getCsrfToken === 'function' ? getCsrfToken() : '') },
                    body: JSON.stringify({ targetClientId, developerCode })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || 'Сайт успешно обновлен');
                    editSiteModal.style.display = 'none';
                    loadSites(); // Reload sites table
                } else {
                    showToast(data.error || 'Ошибка', 'error');
                }
            } catch (err) {
                showToast('Ошибка сети', 'error');
            }
        });
    }

    window.toggleSiteStatus = async function(siteId) {
        if (!confirm('Вы уверены, что хотите изменить статус сайта ' + siteId + '?')) return;
        try {
            const res = await fetch(`/api/admin/sites/${siteId}/toggle-status`, {
                method: 'POST',
                headers: { 'X-CSRF-Token': (typeof getCsrfToken === 'function' ? getCsrfToken() : '') }
            });
            if (res.ok) {
                if (typeof showToast === 'function') showToast('Статус сайта изменен');
                loadSites();
            } else {
                alert('Ошибка при изменении статуса');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Setup Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const csrfToken = (typeof getCsrfToken === 'function' ? getCsrfToken() : '');
        await fetch('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
        window.location.href = '/login.html';
    });
});

let currentAdminUserId = null;

async function openAdminUserModal(userId) {
    currentAdminUserId = userId;
    const modal = document.getElementById('adminUserModal');
    const title = document.getElementById('adminUserModalTitle');
    const sitesList = document.getElementById('adminUserSitesList');
    const activityList = document.getElementById('adminUserActivityList');
    
    document.getElementById('adminMainContainer').style.display = 'none';
    modal.style.display = 'flex';
    
    title.textContent = 'Загрузка...';
    sitesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Загрузка...</div>';
    activityList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Загрузка...</div>';
    
    try {
        const res = await fetch('/api/admin/users/' + userId + '/details');
        if (!res.ok) throw new Error('Failed to load user details');
        const data = await res.json();
        
        title.innerHTML = 'Пользователь: <b>' + data.user.username + '</b> <span style="font-size: 0.85rem; color: var(--text-muted);">(' + (data.user.role === 'client' && data.user.developerCode ? 'Разработчик' : data.user.role) + ', ' + (data.user.plan || 'free').toUpperCase() + ')</span>';
        
        const limitInput = document.getElementById('adminUserSiteLimit');
        if (limitInput) limitInput.value = data.user.sitesLimit || (data.user.plan === 'beta' ? 5 : 1);
        
        // Render sites
        if (data.sites && data.sites.length > 0) {
            sitesList.innerHTML = data.sites.map(s => {
                let d = s.domain ? ('<a href="http://' + s.domain + '" target="_blank" style="color: var(--primary);">' + s.domain + '</a>') : s.id;
                return '<div style="background: var(--bg-card); border: 1px solid var(--border); padding: 12px; border-radius: 8px;">' + d + (s.isTemplate ? ' <span style="color: #6c5ce7; font-size: 0.8rem;">(Шаблон)</span>' : '') + '</div>';
            }).join('');
        } else {
            sitesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Сайтов нет</div>';
        }
        
        // Render activity
        if (data.activity && data.activity.length > 0) {
            activityList.innerHTML = data.activity.map(a => {
                const date = new Date(a.timestamp);
                const dateStr = date.toLocaleDateString('ru-RU') + ', ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                return '<div style="background: var(--bg-card); border: 1px solid var(--border); padding: 12px; border-radius: 8px;"><div style="color: var(--primary); font-size: 0.85rem; margin-bottom: 4px;">' + a.action.toUpperCase() + ' — ' + a.siteId + '</div><div style="font-size: 0.8rem; color: var(--text-muted);">' + (a.details?.page || a.details?.fileName || '') + ' <span style="float: right;">' + dateStr + '</span></div></div>';
            }).join('');
        } else {
            activityList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Нет активности</div>';
        }
        
    } catch (e) {
        title.textContent = 'Ошибка загрузки';
        console.error(e);
    }
}

document.getElementById('closeAdminUserModal')?.addEventListener('click', () => {
    document.getElementById('adminUserModal').style.display = 'none';
    document.getElementById('adminMainContainer').style.display = 'block';
    currentAdminUserId = null;
});

// Admin Actions
async function performAdminAction(action, payload = {}) {
    if (!currentAdminUserId) return;
    if (action === 'delete' && !confirm('Точно удалить этого пользователя? (сайты останутся)')) return;
    
    try {
        const res = await fetch('/api/admin/users/' + currentAdminUserId + '/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': (typeof getCsrfToken === 'function' ? getCsrfToken() : '')
            },
            body: JSON.stringify({ action, ...payload })
        });
        
        if (res.ok) {
            showToast('Действие успешно выполнено', 'success');
            // Refresh details
            openAdminUserModal(currentAdminUserId);
            // Refresh table behind
            document.getElementById('tabAdminUsers').click();
        } else {
            const data = await res.json();
            showToast('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Сетевая ошибка', 'error');
    }
}

document.getElementById('btnSaveSiteLimit')?.addEventListener('click', () => {
    const limitInput = document.getElementById('adminUserSiteLimit');
    const limit = parseInt(limitInput.value, 10);
    if (isNaN(limit) || limit < 1) {
        showToast('Введите корректный лимит (больше 0)', 'error');
        return;
    }
    performAdminAction('update_limit', { sitesLimit: limit });
});
document.getElementById('btnDeleteUser')?.addEventListener('click', () => performAdminAction('delete'));

