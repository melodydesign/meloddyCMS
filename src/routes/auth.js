const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { 
    readJson, 
    writeJson, 
    readJsonObj, 
    isDeveloper,
    USERS_FILE, 
    PLATFORM_CONFIG_FILE,
    REQUESTS_FILE 
} = require('../utils/db');
const { checkAuth } = require('../middleware/auth');
const telegramService = require('../services/telegram');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_change_me';

const loginAttempts = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 5;

// Generate Developer Code
router.post('/api/developer/generate-code', checkAuth, async (req, res) => {
    const { customCode } = req.body;
    const users = await readJson(USERS_FILE);
    const userIndex = users.findIndex(u => String(u.id) === String(req.user.id));
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    const user = users[userIndex];
    if (user.developerCode) {
        return res.status(400).json({ error: 'Код разработчика уже сгенерирован' });
    }
    
    let finalCode = '';
    if (customCode) {
        // Validate custom code uniqueness
        const codeExists = users.some(u => u.developerCode === customCode);
        if (codeExists) {
            return res.status(400).json({ error: 'Этот код уже используется другим разработчиком' });
        }
        if (customCode.length < 5 || customCode.length > 20) {
            return res.status(400).json({ error: 'Код должен быть от 5 до 20 символов' });
        }
        finalCode = customCode;
    } else {
        const uniqueHash = Math.random().toString(36).substring(2, 8).toUpperCase();
        finalCode = `DEV-${uniqueHash}`;
    }
    
    user.developerCode = finalCode;
    
    if (user.role === 'client') {
        user.role = 'developer';
    }
    
    await writeJson(USERS_FILE, users);
    res.json({ success: true, developerCode: user.developerCode, newRole: user.role });
});

// Register
router.post('/api/register', async (req, res) => {
    const { username, password, role, email } = req.body;
    if (!username || !password || password.length < 6 || !email) {
        return res.status(400).json({ error: 'Заполните все поля (минимум 6 символов для пароля)' });
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Некорректный формат email' });
    }
    
    const users = await readJson(USERS_FILE);
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }
    if (users.find(u => u.email && u.email === email)) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const hashedPassword = await bcrypt.hash(password, 10);
    const reqRole = role === 'developer' ? 'developer' : 'client';
    
    const newUser = {
        id: newId,
        username,
        email,
        password: hashedPassword,
        role: reqRole,
        plan: 'beta',
        sites: []
    };
    
    // Всегда генерируем уникальный код для пользователя
    let isUnique = false;
    let newDevCode = '';
    while (!isUnique) {
        const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
        newDevCode = `dev-${randomDigits}`;
        if (!users.some(u => u.developerCode === newDevCode)) {
            isUnique = true;
        }
    }
    newUser.developerCode = newDevCode;
    
    users.push(newUser);
    await writeJson(USERS_FILE, users);
    
    const token = jwt.sign(
        { id: newUser.id, username: newUser.username, role: newUser.role }, 
        SECRET_KEY, 
        { expiresIn: '24h' }
    );
    const csrfToken = Math.random().toString(36).substring(2, 15);
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
    res.cookie('csrfToken', csrfToken, { maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
    
    res.json({ message: 'Registered successfully' });
});

// Login
router.post('/api/login', async (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    
    if (!loginAttempts[ip]) loginAttempts[ip] = [];
    loginAttempts[ip] = loginAttempts[ip].filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (loginAttempts[ip].length >= MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Слишком много попыток. Попробуйте через минуту.' });
    }
    
    loginAttempts[ip].push(now);

    const { email, password } = req.body;
    const users = await readJson(USERS_FILE);
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role || 'client' }, 
        SECRET_KEY, 
        { expiresIn: '24h' }
    );
    
    // Generate CSRF token
    const csrfToken = Math.random().toString(36).substring(2, 15);
    
    // Set cookies
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
    res.cookie('csrfToken', csrfToken, { maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' }); // JS can read this
    
    res.json({ message: 'Logged in successfully' });
});

// Logout
router.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

// Get Check Auth Status (for frontend routing)
router.get('/api/check-auth', checkAuth, async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const users = await readJson(USERS_FILE);
    const user = users.find(u => String(u.id) === String(req.user.id));
    res.json({ 
        authenticated: true, 
        user: { 
            id: req.user.id, 
            username: user ? user.username : req.user.username, 
            email: user ? user.email : '', 
            role: user ? user.role : 'client',
            studioName: user ? (user.studioName || '') : '',
            plan: user ? (user.plan || 'free') : 'free',
            developerCode: user ? user.developerCode : null
        } 
    });
});

// Profile update API
router.post('/api/profile', checkAuth, async (req, res) => {
    const { username, email } = req.body;
    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Некорректный формат email' });
    }
    const users = await readJson(USERS_FILE);
    const userIndex = users.findIndex(u => String(u.id) === String(req.user.id));
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    let tokenUpdated = false;
    if (username && typeof username === 'string' && username.trim() !== '') {
        const newUsername = username.trim();
        if (newUsername !== users[userIndex].username) {
            if (newUsername.length < 3) {
                return res.status(400).json({ error: 'Имя пользователя должно быть не менее 3 символов' });
            }
            if (users.find(u => u.username === newUsername && String(u.id) !== String(users[userIndex].id))) {
                return res.status(400).json({ error: 'Имя пользователя уже занято' });
            }
            users[userIndex].username = newUsername;
            tokenUpdated = true;
        }
    }
    
    users[userIndex].email = email;
    
    
    await writeJson(USERS_FILE, users);
    
    if (tokenUpdated) {
        const token = jwt.sign(
            { id: users[userIndex].id, username: users[userIndex].username, role: users[userIndex].role }, 
            SECRET_KEY, 
            { expiresIn: '24h' }
        );
        res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
    }
    
    res.json({ success: true, message: 'Профиль обновлен!' });
});

// Change Password API
router.post('/api/change-password', checkAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
    }
    
    const users = await readJson(USERS_FILE);
    const userIndex = users.findIndex(u => String(u.id) === String(req.user.id));
    if (userIndex === -1) return res.status(404).json({ error: 'Пользователь не найден' });
    
    const user = users[userIndex];
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
        return res.status(400).json({ error: 'Неверный текущий пароль' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    await writeJson(USERS_FILE, users);
    res.json({ success: true, message: 'Пароль успешно изменен!' });
});

// Platform Config API
router.get('/api/platform-config', checkAuth, async (req, res) => {
    const config = await readJsonObj(PLATFORM_CONFIG_FILE);
    res.json(config);
});

router.post('/api/platform-config', checkAuth, async (req, res) => {
    const { botToken, platformUrl } = req.body;
    const config = await readJsonObj(PLATFORM_CONFIG_FILE);
    
    if (botToken) config.botToken = botToken;
    if (platformUrl) config.platformUrl = platformUrl;
    
    await writeJson(PLATFORM_CONFIG_FILE, config);
    
    if (botToken) {
        telegramService.updateDefaultToken(botToken);
    }
    
    res.json({ success: true, message: 'Настройки платформы сохранены!' });
});

// Get Telegram Bot Username
router.get('/api/bot-info', (req, res) => {
    res.json({ username: telegramService.getDefaultBotUsername() });
});


// ----------------------------------------------------
// Developer Binding Request System (Phase 4)
// ----------------------------------------------------

// 1. Client requests to bind to a developer
router.post('/api/user/request-bind', checkAuth, async (req, res) => {
    try {
        const { developerCode } = req.body;
        if (!developerCode) return res.status(400).json({ error: 'Код разработчика не указан' });

        const users = await readJson(USERS_FILE);
        const clientIndex = users.findIndex(u => String(u.id) === String(req.user.id));
        if (clientIndex === -1) return res.status(404).json({ error: 'Пользователь не найден' });
        const client = users[clientIndex];

        if (client.developerAccess && client.developerAccess.code === developerCode) {
            return res.status(400).json({ error: 'Вы уже привязаны к этому разработчику' });
        }

        const developer = users.find(u => u.developerCode === developerCode);
        if (!developer) return res.status(404).json({ error: 'Разработчик с таким кодом не найден' });

        const requests = await readJson(REQUESTS_FILE);
        
        // Check if there is already a pending request from this client
        const existingReqIndex = requests.findIndex(r => r.clientId === client.id && r.status === 'pending');
        if (existingReqIndex !== -1) {
            // Update the existing request
            requests[existingReqIndex].developerId = developer.id;
            requests[existingReqIndex].timestamp = new Date().toISOString();
        } else {
            // Create new request
            requests.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                clientId: client.id,
                clientName: client.username,
                developerId: developer.id,
                developerCode: developerCode,
                status: 'pending',
                timestamp: new Date().toISOString()
            });
        }

        await writeJson(REQUESTS_FILE, requests);

        // Notify Developer via Telegram (Commented out because telegramService doesn't have sendMessage implemented yet)
        // try {
        //     await telegramService.sendMessage(
        //         `🔔 <b>Новая заявка на привязку!</b>\n` +
        //         `Клиент <b>${client.username}</b> хочет привязаться к вам по коду <code>${developerCode}</code>.\n` +
        //         `Зайдите в Дашборд -> Заявки, чтобы принять или отклонить.`
        //     );
        // } catch (e) {
        //     console.error('Failed to notify via Telegram:', e);
        // }

        res.json({ success: true, message: 'Заявка отправлена разработчику' });
    } catch (err) {
        console.error('Error requesting bind:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 2. Client cancels their pending request
router.post('/api/user/cancel-bind', checkAuth, async (req, res) => {
    try {
        let requests = await readJson(REQUESTS_FILE);
        const reqIndex = requests.findIndex(r => r.clientId === req.user.id && r.status === 'pending');
        if (reqIndex !== -1) {
            requests.splice(reqIndex, 1);
            await writeJson(REQUESTS_FILE, requests);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 3. Client checks their current request status (used on Profile load)
router.get('/api/user/bind-status', checkAuth, async (req, res) => {
    try {
        const users = await readJson(USERS_FILE);
        const currentUser = users.find(u => String(u.id) === String(req.user.id));
        if (!currentUser) return res.status(404).json({ error: 'Пользователь не найден' });

        if (currentUser.developerAccess && currentUser.developerAccess.code) {
            return res.json({ status: 'bound', devCode: currentUser.developerAccess.code });
        }

        const requests = await readJson(REQUESTS_FILE);
        const pendingReq = requests.find(r => r.clientId === req.user.id && r.status === 'pending');
        
        if (pendingReq) {
            return res.json({ status: 'pending', devCode: pendingReq.developerCode });
        }

        res.json({ status: 'none' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 4. Developer gets all pending requests
router.get('/api/developer/requests', checkAuth, async (req, res) => {
    try {
        const users = await readJson(USERS_FILE);
        const currentUser = users.find(u => String(u.id) === String(req.user.id));
        if (!currentUser || !isDeveloper(currentUser)) {
            return res.status(403).json({ error: 'Доступ только для разработчиков' });
        }

        const requests = await readJson(REQUESTS_FILE);
        const myRequests = requests.filter(r => r.developerId === req.user.id && r.status === 'pending');
        res.json(myRequests);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// 5. Developer accepts or rejects a request
router.post('/api/developer/requests/:reqId/action', checkAuth, async (req, res) => {
    try {
        const { reqId } = req.params;
        const { action } = req.body; // 'accept' or 'reject'

        const users = await readJson(USERS_FILE);
        const currentUser = users.find(u => String(u.id) === String(req.user.id));
        if (!currentUser || !isDeveloper(currentUser)) {
            return res.status(403).json({ error: 'Доступ только для разработчиков' });
        }

        const requests = await readJson(REQUESTS_FILE);
        const reqIndex = requests.findIndex(r => r.id === reqId);
        if (reqIndex === -1) return res.status(404).json({ error: 'Заявка не найдена' });

        const request = requests[reqIndex];
        if (request.developerId !== req.user.id) return res.status(403).json({ error: 'Это не ваша заявка' });

        const clientIndex = users.findIndex(u => u.id === request.clientId);
        if (clientIndex === -1) return res.status(404).json({ error: 'Клиент больше не существует' });
        
        const client = users[clientIndex];

        if (action === 'accept') {
            const isExpired = (Date.now() - new Date(request.timestamp).getTime()) > 24 * 60 * 60 * 1000;
            if (isExpired) {
                return res.status(400).json({ error: 'Заявка просрочена (прошло более 24 часов)' });
            }

            client.developerAccess = {
                code: request.developerCode,
                developerId: currentUser.id
            };
            await writeJson(USERS_FILE, users);
            requests.splice(reqIndex, 1);
            await writeJson(REQUESTS_FILE, requests);
            
            // await telegramService.sendMessage(
            //     `✅ Разработчик <b>${currentUser.username}</b> ПРИНЯЛ заявку от клиента <b>${client.username}</b>.`
            // );

        } else if (action === 'reject') {
            requests.splice(reqIndex, 1);
            await writeJson(REQUESTS_FILE, requests);
            
            // await telegramService.sendMessage(
            //     `❌ Разработчик <b>${currentUser.username}</b> ОТКЛОНИЛ заявку от клиента <b>${client.username}</b>.`
            // );
        } else {
            return res.status(400).json({ error: 'Неизвестное действие' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error processing request:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// Become a developer
router.post('/api/user/become-developer', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const userIndex = users.findIndex(u => String(u.id) === String(req.user.id));
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    users[userIndex].role = 'developer';
    await writeJson(USERS_FILE, users);
    
    // Update token
    const token = jwt.sign(
        { id: users[userIndex].id, username: users[userIndex].username, role: 'developer' }, 
        SECRET_KEY, 
        { expiresIn: '24h' }
    );
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
    
    // Also update token? Not strictly necessary if we rely on check-auth or if they re-login,
    // but check-auth pulls from DB so it's fine for subsequent requests.
    res.json({ success: true });
});

module.exports = router;

