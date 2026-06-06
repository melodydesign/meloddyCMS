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
