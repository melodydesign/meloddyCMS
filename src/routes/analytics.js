const express = require('express');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const { 
    readJsonObj, 
    writeJson, 
    checkSiteAccess, 
    ANALYTICS_FILE, 
    SITE_SETTINGS_FILE, 
    PLATFORM_CONFIG_FILE 
} = require('../utils/db');
const { checkAuth } = require('../middleware/auth');
const { sendTelegramMessage } = require('../services/telegram');

const router = express.Router();
const PORT = process.env.PORT || 3000;

// Track Analytics Event
router.post('/api/track', async (req, res) => {
    const { siteId, type, path: pagePath, metadata } = req.body;
    if (!siteId || !type) return res.status(400).json({ error: 'Missing data' });
    
    const analytics = await readJsonObj(ANALYTICS_FILE);
    
    if (!analytics[siteId]) analytics[siteId] = { views: [], clicks: [], forms: [], uniqueVisitors: [] };
    if (!analytics[siteId].uniqueVisitors) analytics[siteId].uniqueVisitors = [];
    
    const ua = req.headers['user-agent'] || '';
    let browserVal = metadata?.browser;
    if (!browserVal || browserVal === 'Unknown') {
        if (ua.includes("YaBrowser")) browserVal = "Yandex Browser";
        else if (ua.includes("Firefox")) browserVal = "Firefox";
        else if (ua.includes("SamsungBrowser")) browserVal = "Samsung Browser";
        else if (ua.includes("Opera") || ua.includes("OPR")) browserVal = "Opera";
        else if (ua.includes("Trident")) browserVal = "Internet Explorer";
        else if (ua.includes("Edge")) browserVal = "Edge";
        else if (ua.includes("Chrome")) browserVal = "Chrome";
        else if (ua.includes("Safari")) browserVal = "Safari";
        else browserVal = "Unknown";
    }

    let deviceVal = metadata?.device;
    if (!deviceVal || deviceVal === 'Unknown') {
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) deviceVal = "Tablet";
        else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) deviceVal = "Mobile";
        else deviceVal = "Desktop";
    }
    
    const event = {
        timestamp: new Date().toISOString(),
        path: pagePath || '/',
        metadata: metadata || {},
        ip: req.ip,
        ua: ua,
        browser: browserVal,
        os: metadata?.os || 'Unknown',
        device: deviceVal
    };
    
    // Hash IP + UA for unique visitor tracking
    const visitorHash = crypto.createHash('md5').update((req.ip || '') + ua).digest('hex');
    if (!analytics[siteId].uniqueVisitors.includes(visitorHash)) {
        analytics[siteId].uniqueVisitors.push(visitorHash);
    }
    
    if (type === 'view') analytics[siteId].views.push(event);
    else if (type === 'click') analytics[siteId].clicks.push(event);
    else if (type === 'form') {
        analytics[siteId].forms.push(event);
        
        const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
        const siteSettings = siteSettingsAll[siteId] || {};
        const platformConfig = await readJsonObj(PLATFORM_CONFIG_FILE);
        
        const token = siteSettings.telegramToken || platformConfig.botToken;
        const chatId = siteSettings.telegramChatId;
        
        if (token && chatId) {
            const formData = metadata.data || {};
            let text = `🚀 *Новая заявка через meloddyCMS!*\n\n` +
                       `🌐 *Сайт:* ${siteSettings.displayName || siteId}\n` +
                       `--------------------------------\n`;
                        
            for (const [key, value] of Object.entries(formData)) {
                let label = key;
                if (key === 'name') label = 'Имя';
                if (key === 'phone') label = 'Телефон';
                text += `👤 *${label}:*\n${value}\n\n`;
            }
            
            text += `--------------------------------\n` +
                    `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}`;
            
            sendTelegramMessage(chatId, text, token);
        }
    }
    
    // Limit storage to 5000 items
    const MAX_ANALYTICS_LIMIT = 5000;
    if (analytics[siteId].views.length > MAX_ANALYTICS_LIMIT) analytics[siteId].views.shift();
    if (analytics[siteId].clicks.length > MAX_ANALYTICS_LIMIT) analytics[siteId].clicks.shift();
    if (analytics[siteId].forms.length > MAX_ANALYTICS_LIMIT) analytics[siteId].forms.shift();
    if (analytics[siteId].uniqueVisitors.length > MAX_ANALYTICS_LIMIT) analytics[siteId].uniqueVisitors.shift();
    
    await writeJson(ANALYTICS_FILE, analytics);
    res.json({ success: true });
});

// Get Site Analytics
router.get('/api/analytics/:siteId', checkAuth, async (req, res) => {
    const { siteId } = req.params;
    if (!(await checkSiteAccess(req, siteId, 'analytics'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const analytics = await readJsonObj(ANALYTICS_FILE);
    const siteAnalytics = analytics[siteId] || { views: [], clicks: [], forms: [], uniqueVisitors: [] };
    
    res.json({
        views: siteAnalytics.views || [],
        clicks: siteAnalytics.clicks || [],
        forms: siteAnalytics.forms || [],
        uniqueVisitors: siteAnalytics.uniqueVisitors || [],
        uniqueCount: (siteAnalytics.uniqueVisitors || []).length
    });
});

// Get Local IP for QR code preview
router.get('/api/local-ip', checkAuth, (req, res) => {
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                localIp = alias.address;
                break;
            }
        }
    }
    res.json({ ip: localIp, port: PORT });
});

// Get Preview URL (Local IP)
router.get('/api/preview-url', checkAuth, (req, res) => {
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if ((alias.family === 'IPv4' || alias.family === 4) && alias.address !== '127.0.0.1' && !alias.internal) {
                localIp = alias.address;
                break;
            }
        }
    }
    res.json({ 
        url: `http://${localIp}:${PORT}`,
        ip: localIp,
        port: PORT
    });
});

module.exports = router;
