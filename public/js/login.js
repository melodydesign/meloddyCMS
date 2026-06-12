document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast('Вход успешен. Перенаправление...', 'success');
            setTimeout(() => window.location.href = '/dashboard.html', 500);
        } else {
            showToast(data.error || 'Ошибка входа', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regNickname').value;
    const name = document.getElementById('regName').value;
    const password = document.getElementById('regPassword').value;
    const roleVal = document.getElementById('regRole').value;
    const role = roleVal === 'owner' ? 'client' : 'developer';

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, name, password, role })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast('Регистрация успешна! Перенаправление...', 'success');
            setTimeout(() => window.location.href = '/dashboard.html', 1000);
        } else {
            showToast(data.error || 'Ошибка регистрации', 'error');
        }
    } catch (err) {
        showToast('Ошибка сети', 'error');
    }
});
