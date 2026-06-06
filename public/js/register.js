document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password_confirm').value;
    const roleInput = document.querySelector('input[name="role"]:checked');
    const role = roleInput ? roleInput.value : 'client';
    const btn = document.querySelector('.login-btn');

    if (password !== passwordConfirm) {
        showToast('Пароли не совпадают!', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Пароль должен быть не менее 6 символов', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Успешная регистрация! Вход в систему...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showToast(data.error || 'Ошибка при регистрации', 'error');
            btn.disabled = false;
            btn.innerHTML = 'Зарегистрироваться';
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Произошла ошибка при подключении к серверу', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Зарегистрироваться';
    }
});
