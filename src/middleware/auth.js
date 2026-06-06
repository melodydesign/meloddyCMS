const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_change_me';

const checkAuth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

const checkCsrf = (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }
    if (req.path === '/api/login' || req.path === '/api/track') {
        return next();
    }
    
    const csrfCookie = req.cookies.csrfToken;
    const csrfHeader = req.headers['x-csrf-token'];
    
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ error: 'CSRF token mismatch' });
    }
    next();
};

module.exports = {
    checkAuth,
    checkCsrf
};
