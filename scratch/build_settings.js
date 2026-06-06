const fs = require('fs');

const settingsHTML = fs.readFileSync('public/settings.html', 'utf8');
const profileHTML = fs.readFileSync('public/profile.html', 'utf8');

// Extract Sidebar
const sidebarMatch = settingsHTML.match(/<aside class="sidebar">[\s\S]*?<\/aside>/);
let sidebar = sidebarMatch[0];
// Remove profile link from sidebar
sidebar = sidebar.replace(/<a href="\/profile\.html"[\s\S]*?<\/a>/, '');

const newHTML = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Настройки - meloddyCMS</title>
    <link rel="stylesheet" href="/css/style.css?v=1780230002">
    <script src="/js/theme-v2.js?v=1780230002"></script>
    <script src="/js/utils.js?v=1780230000"></script>
    <script>
        fetch('/api/check-auth').then(res => {
            if (!res.ok) window.location.href = '/login.html';
        }).catch(() => window.location.href = '/login.html');
    </script>
    <style>
        .custom-select-wrapper { display: inline-block; position: relative; }
        .custom-select-trigger { background: var(--bg-body); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.5rem 2rem 0.5rem 0.75rem; font-size: 0.875rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; min-width: 200px; transition: border-color 0.2s, box-shadow 0.2s; position: relative; }
        .custom-select-trigger:after { content: ''; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid var(--text-muted); position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .custom-select-trigger:hover { border-color: var(--primary); }
        .custom-select-options { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); margin-top: 4px; max-height: 200px; overflow-y: auto; width: 100%; position: absolute; top: 100%; left: 0; z-index: 10000; display: none; }
        .custom-select-options.show { display: block; }
        .custom-select-option { padding: 0.5rem 0.75rem; font-size: 0.875rem; color: var(--text-main); cursor: pointer; transition: background 0.2s; }
        .custom-select-option:hover { background: var(--bg-hover); }
        .custom-select-option.selected { background: var(--bg-active); color: var(--primary); }
        .main-content { overflow-y: auto !important; }
        
        .settings-layout { display: flex; gap: 2rem; align-items: flex-start; }
        @media (max-width: 768px) { .settings-layout { flex-direction: column; } }
        .settings-nav { width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 5px; position: sticky; top: 2rem; }
        @media (max-width: 768px) { .settings-nav { width: 100%; position: static; flex-direction: row; flex-wrap: wrap; } }
        .settings-nav-item { padding: 12px 16px; border-radius: var(--radius-md); color: var(--text-muted); cursor: pointer; transition: all 0.2s; font-weight: 500; display: flex; align-items: center; gap: 10px; }
        .settings-nav-item:hover { background: var(--bg-hover); color: var(--text-main); }
        .settings-nav-item.active { background: var(--primary); color: white; }
        .settings-content { flex: 1; min-width: 0; background: transparent; border-radius: var(--radius-lg); }
        .settings-tab-pane { display: none; animation: fadeIn 0.3s ease; }
        .settings-tab-pane.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="app-layout">
        <!-- Sidebar -->
        ${sidebar}

        <!-- Main Content -->
        <main class="main-content">
            <div class="dashboard-container">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: clamp(1.5rem, 3vh, 2.5rem);">
                    <div>
                        <h1 style="font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; margin-bottom: 5px;">Настройки</h1>
                        <p style="color: var(--text-muted); margin: 0;">Управление аккаунтом и системой</p>
                    </div>
                </div>

                <div class="settings-layout">
                    <div class="settings-nav">
                        <div class="settings-nav-item active" data-tab="tab-profile">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            Профиль
                        </div>
                        <div class="settings-nav-item" data-tab="tab-appearance">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                            Внешний вид
                        </div>
                        <div class="settings-nav-item" data-tab="tab-security">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Безопасность
                        </div>
                        <div class="settings-nav-item" data-tab="tab-subscription">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Подписка
                        </div>
                        <div class="settings-nav-item" data-tab="tab-developer">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                            Разработчик
                        </div>
                    </div>

                    <div class="settings-content">
                        
                        <!-- TAB: PROFILE -->
                        <div class="settings-tab-pane active" id="tab-profile">
                            <div class="glass-panel" style="padding: 2rem;">
                                <h3 style="margin-top: 0; margin-bottom: 1.5rem;">Данные профиля</h3>
                                <div class="hero-card" style="margin-bottom: 2rem; background: rgba(0,0,0,0.1); border: 1px solid var(--border); box-shadow: none;">
                                    <div style="display: flex; align-items: center; gap: 20px;">
                                        <div id="avatarLetter" style="width: 60px; height: 60px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 600; color: white;">&nbsp;</div>
                                        <div>
                                            <h3 id="heroStudioName" style="margin-bottom: 5px;">&nbsp;</h3>
                                            <p id="heroUsername" style="color: var(--text-muted); margin: 0;">&nbsp;</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <form id="profileForm" style="display: flex; flex-direction: column; gap: 15px;">
                                    <div class="form-field">
                                        <label class="form-label" for="usernameInput">Имя пользователя (Логин)</label>
                                        <input type="text" id="usernameInput">
                                    </div>
                                    <div class="form-field">
                                        <label class="form-label" for="studioNameInput">Имя / Название студии</label>
                                        <input type="text" id="studioNameInput">
                                    </div>
                                    <div class="form-field">
                                        <label class="form-label" for="emailInput">Контактный Email</label>
                                        <input type="email" id="emailInput">
                                    </div>
                                    <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                                        <button type="submit" class="btn" style="padding: 10px 20px;">Сохранить изменения</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <!-- TAB: APPEARANCE -->
                        <div class="settings-tab-pane" id="tab-appearance">
                            <div class="glass-panel" style="padding: 2rem;">
                                <h3 style="margin-top: 0; margin-bottom: 1.5rem;">Оформление панели</h3>
                                <div class="form-field" style="margin-bottom: 1.5rem;">
                                    <label class="form-label" for="themeSelect">Тема оформления</label>
                                    <select id="themeSelect" style="width: 100%; padding: 12px;">
                                        <option value="light">Светлая</option>
                                        <option value="dark">Темная</option>
                                    </select>
                                </div>
                                <div class="form-field">
                                    <label class="form-label">Язык панели</label>
                                    <select style="width: 100%; padding: 12px;">
                                        <option value="ru">Русский</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- TAB: SECURITY -->
                        <div class="settings-tab-pane" id="tab-security">
                            <div class="glass-panel" style="padding: 2rem;">
                                <h3 style="margin-top: 0; margin-bottom: 1.5rem;">Смена пароля</h3>
                                <form id="passwordForm" style="display: flex; flex-direction: column; gap: 15px;">
                                    <div class="form-field">
                                        <label class="form-label" for="currentPasswordInput">Текущий пароль</label>
                                        <input type="password" id="currentPasswordInput" required>
                                    </div>
                                    <div class="form-field">
                                        <label class="form-label" for="newPasswordInput">Новый пароль</label>
                                        <input type="password" id="newPasswordInput" required>
                                    </div>
                                    <div class="form-field">
                                        <label class="form-label" for="newPasswordConfirmInput">Подтвердите пароль</label>
                                        <input type="password" id="newPasswordConfirmInput" required>
                                    </div>
                                    <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                                        <button type="submit" class="btn btn-outline" style="padding: 10px 20px;">Изменить пароль</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <!-- TAB: SUBSCRIPTION -->
                        <div class="settings-tab-pane" id="tab-subscription">
                            <div class="glass-panel" style="padding: 2rem;">
                                <h3 style="margin-top: 0; margin-bottom: 1.5rem;">Ваша подписка</h3>
                                <div style="display: flex; flex-direction: column; gap: 15px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md); border: 1px solid var(--border);">
                                        <span style="color: var(--text-muted);">Текущий план:</span>
                                        <span id="planSpan" style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">Beta</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md); border: 1px solid var(--border);">
                                        <span style="color: var(--text-muted);">Статус подписки:</span>
                                        <span style="color: #00CC66; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                                            <span style="width: 8px; height: 8px; background: #00CC66; border-radius: 50%; display: inline-block;"></span>
                                            Активна
                                        </span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md); border: 1px solid var(--border);">
                                        <span style="color: var(--text-muted);">Лимит сайтов:</span>
                                        <span style="font-weight: 600; color: var(--text-main);">5 сайтов</span>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; text-align: center; margin-top: 10px;">
                                        * Идёт бета-тестирование. Все функции бесплатны, лимит: 5 сайтов.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB: DEVELOPER -->
                        <div class="settings-tab-pane" id="tab-developer">
                            
                            <!-- Client Bind to Developer -->
                            <div class="glass-panel" id="clientBindCard" style="display: flex; flex-direction: column; padding: 2rem; margin-bottom: 1.5rem;">
                                <h3 style="margin-top: 0; margin-bottom: 1.5rem;">Привязка к разработчику</h3>
                                
                                <!-- Not bound -->
                                <div id="bindFormContainer" style="display: none; flex-direction: column; gap: 15px;">
                                    <p style="color: var(--text-muted); margin: 0;">Укажите код разработчика, чтобы передать ему права на управление вашими сайтами.</p>
                                    <div style="display: flex; gap: 10px;">
                                        <input type="text" id="bindDevCodeInput" placeholder="DEV-XXXXXX" style="flex: 1; padding: 10px; background: var(--bg-body); border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);">
                                        <button id="requestBindBtn" class="btn" style="padding: 10px 20px;">Отправить заявку</button>
                                    </div>
                                </div>

                                <!-- Pending -->
                                <div id="bindPendingContainer" style="display: none; flex-direction: column; gap: 15px;">
                                    <div style="display: flex; align-items: center; gap: 12px; background: rgba(243, 156, 18, 0.1); border: 1px dashed #f39c12; padding: 15px; border-radius: var(--radius-md);">
                                        <div style="color: #f39c12;">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        </div>
                                        <div style="flex: 1;">
                                            <h4 style="margin: 0 0 5px 0; color: #f39c12;">Ожидание подтверждения</h4>
                                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">Заявка отправлена разработчику <strong id="pendingDevCode"></strong>.</p>
                                        </div>
                                        <button id="cancelBindBtn" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; border-color: var(--border);">Отменить</button>
                                    </div>
                                </div>

                                <!-- Already Bound -->
                                <div id="bindActiveContainer" style="display: none; flex-direction: column; gap: 15px;">
                                    <div style="display: flex; align-items: center; gap: 12px; background: rgba(0, 204, 102, 0.1); border: 1px dashed #00cc66; padding: 15px; border-radius: var(--radius-md);">
                                        <div style="color: #00cc66;">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        </div>
                                        <div style="flex: 1;">
                                            <h4 style="margin: 0 0 5px 0; color: #00cc66;">Вы привязаны к разработчику</h4>
                                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">Разработчик <strong id="activeDevCode"></strong> управляет вашими проектами.</p>
                                        </div>
                                        <button id="unbindBtn" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; color: #ff4d4d; border-color: rgba(255,77,77,0.2);">Отвязать</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Developer Code -->
                            <div class="glass-panel" id="developerCodeCard" style="display: none; flex-direction: column; padding: 2rem;">
                                <h3 style="margin-top: 0; margin-bottom: 1rem;">Мой код разработчика</h3>
                                <p style="color: var(--text-muted); margin-top: 0; margin-bottom: 15px;">Этот код клиенты должны ввести для привязки к вам.</p>
                                <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-body); border: 1px solid var(--border); padding: 12px 16px; border-radius: var(--radius-md);">
                                    <code id="developerCodeDisplay" style="font-size: 1.1rem; color: var(--primary); font-weight: 700; letter-spacing: 1px; flex: 1;">DEV-XXXXXX</code>
                                    <button id="copyDevCodeBtn" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;">Копировать</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <div id="toastContainer" class="toast-container"></div>
        </main>
    </div>
    
    <script src="/js/toast.js?v=1780229728"></script>
    <script src="/js/profile.js?v=1780229728"></script>
    <script>
        // Tabs Logic
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.settings-tab-pane').forEach(p => p.classList.remove('active'));
                
                item.classList.add('active');
                document.getElementById(item.getAttribute('data-tab')).classList.add('active');
            });
        });

        // Theme selection logic
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = typeof getTheme === 'function' ? getTheme() : 'dark';
        }
        
        // Init custom selects
        document.querySelectorAll('select').forEach(sel => initCustomSelect(sel));
        
        themeSelect?.addEventListener('change', () => {
            const theme = themeSelect.value;
            if (typeof setTheme === 'function') setTheme(theme);
            if (typeof showToast === 'function') showToast('Тема успешно изменена', 'success');
        });
        
        // Logout handler
        document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            const csrfToken = getCsrfToken();
            await fetch('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
            window.location.href = '/login.html';
        });
    </script>
</body>
</html>
`;

fs.writeFileSync('public/settings.html', newHTML);
