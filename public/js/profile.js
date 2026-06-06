// Profile Javascript

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfileData();
    await loadBindStatus();
});

async function loadBindStatus() {
    const bindForm = document.getElementById('bindFormContainer');
    const bindPending = document.getElementById('bindPendingContainer');
    const bindActive = document.getElementById('bindActiveContainer');
    if (!bindForm || !bindPending || !bindActive) return;

    try {
        const res = await fetch('/api/user/bind-status');
        if (!res.ok) return;
        const data = await res.json();
        
        bindForm.style.display = 'none';
        bindPending.style.display = 'none';
        bindActive.style.display = 'none';

        if (data.status === 'none') {
            bindForm.style.display = 'flex';
        } else if (data.status === 'pending') {
            bindPending.style.display = 'flex';
            document.getElementById('pendingDevCode').textContent = data.devCode;
        } else if (data.status === 'bound') {
            bindActive.style.display = 'flex';
            document.getElementById('activeDevCode').textContent = data.devCode;
        }
    } catch (err) {
        console.error('Error loading bind status', err);
    }
}

document.getElementById('requestBindBtn')?.addEventListener('click', async () => {
    const devCode = document.getElementById('bindDevCodeInput').value.trim();
    if (!devCode) {
        if (typeof showToast === 'function') showToast('Введите код разработчика', 'error');
        return;
    }
    try {
        const res = await fetch('/api/user/request-bind', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ devCode })
        });
        const data = await res.json();
        if (res.ok) {
            if (typeof showToast === 'function') showToast('Заявка отправлена', 'success');
            loadBindStatus();
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка', 'error');
        }
    } catch (err) {
        console.error(err);
    }
});

document.getElementById('cancelBindBtn')?.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/user/cancel-bind', { method: 'POST' });
        if (res.ok) {
            if (typeof showToast === 'function') showToast('Заявка отменена', 'success');
            loadBindStatus();
        }
    } catch (err) {
        console.error(err);
    }
});

document.getElementById('unbindBtn')?.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/user/cancel-bind', { method: 'POST' });
        if (res.ok) {
            if (typeof showToast === 'function') showToast('Связь разорвана', 'success');
            loadBindStatus();
        }
    } catch (err) {
        console.error(err);
    }
});

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('usernameInput').value;
    const email = document.getElementById('emailInput').value;
    const studioName = document.getElementById('studioNameInput').value;
    try {
        const res = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, studioName })
        });
        const data = await res.json();
        if (res.ok) {
            if (typeof showToast === 'function') showToast('Профиль обновлен', 'success');
            loadProfileData();
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка', 'error');
        }
    } catch (err) {
        console.error(err);
    }
});

document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    if (newPassword !== confirmPassword) {
        if (typeof showToast === 'function') showToast('Пароли не совпадают', 'error');
        return;
    }
    try {
        const res = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            if (typeof showToast === 'function') showToast('Пароль изменен', 'success');
            e.target.reset();
        } else {
            if (typeof showToast === 'function') showToast(data.error || 'Ошибка', 'error');
        }
    } catch (err) {
        console.error(err);
    }
});

async function loadProfileData() {
    try {
        const res = await fetch('/api/check-auth');
        if (!res.ok) return;
        const data = await res.json();
        const user = data.user;
        if (!user) return;
        
        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) usernameInput.value = user.username;
        
        const emailInput = document.getElementById('emailInput');
        if (emailInput && user.email) emailInput.value = user.email;
        
        const studioNameInput = document.getElementById('studioNameInput');
        if (studioNameInput && user.studioName) studioNameInput.value = user.studioName;
        
        // Update hero section
        const heroStudioName = document.getElementById('heroStudioName');
        const heroUsername = document.getElementById('heroUsername');
        const avatarLetter = document.getElementById('avatarLetter');
        
        const displayName = user.studioName || user.username;
        if (heroStudioName) heroStudioName.textContent = displayName;
        
        let roleText = 'Клиент';
        if (user.role === 'admin') roleText = 'Главный разработчик';
        else if (user.role === 'developer') roleText = 'Разработчик';
        
        if (heroUsername) heroUsername.textContent = `@${user.username} · ${roleText}`;
        if (avatarLetter && displayName) avatarLetter.textContent = displayName.charAt(0).toUpperCase();
        
        // Update plan display
        const planName = (user.plan || 'beta').toUpperCase();
        const planBadge = document.getElementById('planBadge');
        if (planBadge) planBadge.textContent = `Тариф: ${planName === 'BETA' ? 'Beta' : planName}`;
        const planSpan = document.getElementById('planSpan');
        if (planSpan) planSpan.textContent = planName === 'BETA' ? 'Beta' : planName;
        
        // Handle developer section visibility
        const clientBindCard = document.getElementById('clientBindCard');
        const developerCodeCard = document.getElementById('developerCodeCard');
        const developerCodeDisplay = document.getElementById('developerCodeDisplay');
        
        if (user.role === 'developer') {
            if (clientBindCard) clientBindCard.style.display = 'none';
            if (developerCodeCard) developerCodeCard.style.display = 'block';
            if (developerCodeDisplay && user.developerCode) developerCodeDisplay.textContent = user.developerCode;
        } else if (user.role === 'admin') {
            if (clientBindCard) clientBindCard.style.display = 'none';
            if (developerCodeCard) developerCodeCard.style.display = 'none';
            if (planBadge) planBadge.style.display = 'none';
            const profileColumn1 = document.getElementById('profileColumn1');
            if (profileColumn1) profileColumn1.style.display = 'none';
        } else {
            if (clientBindCard) clientBindCard.style.display = 'block';
            if (developerCodeCard) developerCodeCard.style.display = 'none';
        }
    } catch (err) {
        console.error('Error loading profile data', err);
    }
}

document.getElementById('copyDevCodeBtn')?.addEventListener('click', () => {
    const code = document.getElementById('developerCodeDisplay')?.textContent;
    const btn = document.getElementById('copyDevCodeBtn');
    if (!code) return;
    
    const onSuccess = () => {
        if (typeof showToast === 'function') showToast('Код скопирован!', 'success');
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '✓ Скопировано';
            setTimeout(() => btn.textContent = orig, 2000);
        }
    };
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(onSuccess).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = code;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            onSuccess();
        });
    } else {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        onSuccess();
    }
});
