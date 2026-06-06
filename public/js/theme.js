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

// Init theme on load — light is default (:root = light)
setTheme(getTheme());

// Bind toggle if exists
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }
    updateToggleIcon(getTheme());
});
