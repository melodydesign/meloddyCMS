const THEME_KEY = 'webcms-theme';

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
    updateToggleIcon(theme);
}

function toggleTheme() {
    const current = getTheme();
    setTheme(current === 'light' ? 'dark' : 'light');
}

function updateToggleIcon(theme) {
    const iconEl = document.getElementById('theme-icon');
    const textEl = document.getElementById('theme-text');
    if (!iconEl) return;
    
    if (theme === 'dark') {
        iconEl.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
        if(textEl) textEl.textContent = 'Светлая тема';
    } else {
        iconEl.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
        if(textEl) textEl.textContent = 'Тёмная тема';
    }
}

// Init theme on load — light is default
setTheme(getTheme());

// Bind events on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme toggle binding
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }
    updateToggleIcon(getTheme());

    // 2. Mobile Menu Logic (Burger and Drawer)
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenuBtn');
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    
    if (mobileMenuBtn && mobileNavDrawer) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mobileNavDrawer.classList.add('open');
        });
    }
    if (closeMobileMenuBtn && mobileNavDrawer) {
        closeMobileMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mobileNavDrawer.classList.remove('open');
        });
    }
    // Close mobile menu drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileNavDrawer && mobileNavDrawer.classList.contains('open')) {
            if (!mobileNavDrawer.contains(e.target) && e.target !== mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
                mobileNavDrawer.classList.remove('open');
            }
        }
    });

    // 3. User Authorization check and Profile capsule populate
    // Run authentication only on pages that contain topbar navigation menu
    const hasTopbar = document.querySelector('.topbar');
    if (hasTopbar) {
        fetch('/api/check-auth')
            .then(res => {
                if (!res.ok) {
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = '/login.html';
                    }
                    throw new Error('Unauthorized');
                }
                return res.json();
            })
            .then(data => {
                if (data && data.authenticated && data.user) {
                    // Show admin link in desktop and mobile menus if admin
                    if (data.user.role === 'admin') {
                        const adminLink = document.getElementById('adminSidebarLink');
                        if (adminLink) adminLink.style.display = 'inline-flex';
                        const adminMobileLink = document.getElementById('adminMobileLink');
                        if (adminMobileLink) adminMobileLink.style.display = 'flex';
                    }
                    
                    // Populate user profile capsule
                    const userName = data.user.studioName || data.user.username;
                    const uNameEl = document.getElementById('topbarUserName');
                    if (uNameEl) uNameEl.textContent = userName;
                    const uEmailEl = document.getElementById('topbarUserEmail');
                    if (uEmailEl) uEmailEl.textContent = data.user.email || '';
                    const uAvatarEl = document.getElementById('topbarUserAvatar');
                    if (uAvatarEl) uAvatarEl.textContent = userName.charAt(0).toUpperCase();
                    
                    const userCapsule = document.getElementById('topbarUserInfo');
                    if (userCapsule) {
                        userCapsule.style.display = 'flex';
                        userCapsule.addEventListener('click', () => {
                            window.location.href = '/settings.html';
                        });
                    }
                }
            })
            .catch((err) => {
                console.warn('Auth check skipped/failed:', err.message);
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = '/login.html';
                }
            });
    }

    // Auto initialize custom selects
    setTimeout(() => {
        document.querySelectorAll('select').forEach(sel => {
            if (typeof initCustomSelect === 'function') initCustomSelect(sel);
        });
    }, 100);
});

function initCustomSelect(selectEl) {
    if (!selectEl) return;
    if (selectEl.classList.contains('no-custom-select')) return;
    
    const existingWrapper = selectEl.parentNode.querySelector('.custom-select-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }

    selectEl.style.display = 'none';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.style.width = selectEl.style.width || '100%';
    if (selectEl.style.flex) {
        wrapper.style.flex = selectEl.style.flex;
        if (!selectEl.style.width) {
            wrapper.style.width = 'auto';
        }
    }
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `<span>${selectEl.options[selectEl.selectedIndex]?.text || ''}</span>`;
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-select-options';
    
    Array.from(selectEl.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        if (opt.value === selectEl.value) item.classList.add('selected');
        item.textContent = opt.text;
        item.setAttribute('data-value', opt.value);
        
        item.addEventListener('click', () => {
            selectEl.value = opt.value;
            trigger.querySelector('span').textContent = opt.text;
            optionsContainer.classList.remove('show');
            wrapper.classList.remove('open');
            
            optionsContainer.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            
            selectEl.dispatchEvent(new Event('change'));
        });
        
        optionsContainer.appendChild(item);
    });
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = optionsContainer.classList.contains('show');
        
        document.querySelectorAll('.custom-select-options').forEach(el => {
            el.classList.remove('show');
            el.parentNode.classList.remove('open');
        });
        
        if (!isOpen) {
            optionsContainer.classList.add('show');
            wrapper.classList.add('open');
        }
    });
    
    document.addEventListener('click', () => {
        optionsContainer.classList.remove('show');
        wrapper.classList.remove('open');
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    selectEl.parentNode.insertBefore(wrapper, selectEl);
}
window.initCustomSelect = initCustomSelect;
