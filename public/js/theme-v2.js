/**
 * theme-v2.js — Темы + респонсивная мобильная навигация для meloddyCMS
 * Подключается в <head> для предотвращения FOUC (flash of unstyled content)
 */

const THEME_KEY = 'webcms-theme';

// ─── Theme Management ───────────────────────────────────────────────

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
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
        iconEl.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
        if (textEl) textEl.textContent = 'Светлая тема';
    } else {
        iconEl.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
        if (textEl) textEl.textContent = 'Темная тема';
    }
}

// Apply theme immediately to prevent flash
setTheme(getTheme());


// ─── Mobile Navigation (responsive) ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle button binding
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.addEventListener('click', toggleTheme);
    }
    updateToggleIcon(getTheme());

    // Only set up mobile nav if sidebar is present
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // ── Create mobile header element (hidden by default) ──
    const mobileHeader = document.createElement('header');
    mobileHeader.className = 'mobile-header';
        const style = document.createElement('style');
        style.textContent = '.mobile-header { display: none !important; } @media (max-width: 768px) { .mobile-header { display: flex !important; } }';
        document.head.appendChild(style);
    mobileHeader.innerHTML = `
        <button class="mobile-menu-toggle" aria-label="Открыть меню">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line class="burger-line burger-line-1" x1="4" y1="6" x2="20" y2="6"></line>
                <line class="burger-line burger-line-2" x1="4" y1="12" x2="20" y2="12"></line>
                <line class="burger-line burger-line-3" x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
        </button>
        <div class="mobile-header-logo">
            <span style="font-size:16px; margin-right:8px; display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; background:var(--primary, #6c5ce7); color:white; border-radius:6px; font-weight:bold; font-family:'Outfit',sans-serif;">m</span>
            <span style="font-size:1.1rem; font-weight:700; color:var(--text-main); font-family:'Outfit','Inter',sans-serif; letter-spacing:-0.03em;">meloddyCMS</span>
        </div>
        <div style="width: 44px;"></div>
    `;

    // Insert header as first child of main-content
    mainContent.insertBefore(mobileHeader, mainContent.firstChild);

    // ── Create sidebar overlay ──
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // ── State: track if menu is open ──
    let menuOpen = false;

    function openMenu() {
        menuOpen = true;
        sidebar.classList.add('open');
        overlay.classList.add('open');
        menuToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        menuOpen = false;
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        menuToggle.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ── Menu toggle button ──
    const menuToggle = mobileHeader.querySelector('.mobile-menu-toggle');
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // ── Close on overlay click ──
    overlay.addEventListener('click', closeMenu);

    // ── Close on Escape key ──
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuOpen) {
            closeMenu();
        }
    });

    // ── Responsive: apply/remove mobile mode ──
    const mq = window.matchMedia('(max-width: 1024px)');

    function applyMobileMode(isMobile) {
        if (isMobile) {
            // Mobile mode ON
            mobileHeader.style.display = 'flex';
            mainContent.style.paddingTop = '80px';
            // Allow scrolling on mobile even if page set overflow-y:hidden
            mainContent.style.overflowY = 'auto';
        } else {
            // Desktop mode — clean up everything
            mobileHeader.style.display = 'none';
            mainContent.style.paddingTop = '';
            mainContent.style.overflowY = '';
            // Ensure menu is closed when switching to desktop
            closeMenu();
            // Reset sidebar inline styles that mobile may have set
            sidebar.style.transform = '';
            sidebar.style.boxShadow = '';
        }
    }

    // Listen for breakpoint changes
    mq.addEventListener('change', (e) => {
        applyMobileMode(e.matches);
    });

    // Apply on initial load
    applyMobileMode(mq.matches);
});

document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin' || userRole === 'developer') {
        const kb = document.getElementById('navKnowledgeBase');
        if (kb) kb.style.display = 'flex';
    }
});
