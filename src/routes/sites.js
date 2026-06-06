const express = require('express');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const AdmZip = require('adm-zip');
const { 
    readJson, 
    writeJson, 
    readJsonObj, 
    getDirSize, 
    logHistory, 
    checkSiteAccess, 
    isDeveloper,
    ensureTemplateExtracted,
    extractSiteIdFromPath,
    USERS_FILE,
    SITES_FILE,
    SITE_SETTINGS_FILE,
    PLATFORM_CONFIG_FILE,
    ANALYTICS_FILE,
    HISTORY_FILE,
    BACKUPS_DIR,
    DELETED_SITES_FILE,
    DELETED_CLIENTS_FILE,
    DELETED_SITES_DIR
} = require('../utils/db');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();
const SITE_DIR = path.resolve(__dirname, '..', '..', 'site');
const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'data', 'templates');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

// Configure Multer for File Uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const targetPath = path.resolve(SITE_DIR, req.body.path || '');
            if (!targetPath.startsWith(SITE_DIR)) return cb(new Error('Invalid path'));
            if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
            cb(null, targetPath);
        },
        filename: (req, file, cb) => {
            try {
                // Decode from ISO-8859-1 (latin1) to UTF-8 to fix Cyrillic characters upload
                const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf-8');
                cb(null, utf8Name);
            } catch (err) {
                cb(null, file.originalname);
            }
        }
    })
});

// Configure Multer for ZIP Uploads (in memory)
// Configure Multer for ZIP Uploads (in memory)
const zipUpload = multer({ storage: multer.memoryStorage() }).single('zipFile');

// REMOVED: Duplicate upload-zip handler (was here, superseded by handler at line ~1014)


// In-memory Editor Locks
const editorLocks = {};

// Editor Lock - Heartbeat
router.post('/api/sites/:siteId/heartbeat', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    editorLocks[siteId] = {
        userId: req.user.id,
        timestamp: Date.now()
    };
    res.json({ success: true });
});

// Editor Lock - Status
router.get('/api/sites/:siteId/lock-status', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const lock = editorLocks[siteId];
    if (lock && (Date.now() - lock.timestamp < 30000)) { // 30 sec expiration
        if (lock.userId === req.user.id) {
            return res.json({ locked: false }); // User is holding their own lock
        }
        
        const users = await readJson(USERS_FILE);
        const lockedBy = users.find(u => u.id === lock.userId);
        return res.json({ 
            locked: true, 
            lockedBy: lockedBy ? (lockedBy.role === 'developer' ? 'Разработчик' : 'Пользователь') : 'Другой пользователь' 
        });
    }
    
    res.json({ locked: false });
});

// 1. Get Individual Site Info
router.get('/api/site-info/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const sitePath = path.join(SITE_DIR, siteId);
    if (!fs.existsSync(sitePath)) return res.status(404).json({ error: 'Site not found' });
    
    if (!(await checkSiteAccess(req, siteId, 'files'))) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const size = await getDirSize(sitePath);
    const hasIndex = fs.existsSync(path.join(sitePath, 'index.html'));
    const files = await fs.promises.readdir(sitePath).catch(() => []);
    const hasDrafts = files.some(f => f.includes('.draft.html'));
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    
    let lastPub = settings[siteId]?.lastPublish || 'Никогда';
    if (lastPub === 'Никогда' && fs.existsSync(HISTORY_FILE)) {
        try {
            const content = await fs.promises.readFile(HISTORY_FILE, 'utf-8');
            const history = JSON.parse(content);
            const pub = history.find(h => h.siteId === siteId && h.action === 'publish');
            if (pub) lastPub = new Date(pub.timestamp).toLocaleString('ru-RU');
        } catch(e) {}
    }
    
    res.json({
        id: siteId,
        size: (size / 1024 / 1024).toFixed(2) + ' MB',
        status: hasIndex ? 'Онлайн' : 'Оффлайн',
        hasDrafts,
        lastPublish: lastPub,
        lastPublication: lastPub
    });
});



const TEMPLATES_INDEX = path.join(TEMPLATES_DIR, 'index.json');
if (!fs.existsSync(TEMPLATES_INDEX)) fs.writeFileSync(TEMPLATES_INDEX, JSON.stringify([]));

function getTemplatesMeta() {
    try { return JSON.parse(fs.readFileSync(TEMPLATES_INDEX, 'utf-8')); } catch(e) { return []; }
}
function saveTemplatesMeta(meta) {
    fs.writeFileSync(TEMPLATES_INDEX, JSON.stringify(meta, null, 2));
}

// 2.5 Get Developer Templates (Modified)
router.get('/api/templates', checkAuth, async (req, res) => {
    try {
        const users = await readJson(USERS_FILE);
        const user = users.find(u => String(u.id) === String(req.user.id));
        
        let targetCode = '';
        if (user.role === 'admin' || user.role === 'developer') {
            targetCode = user.developerCode;
        } else if (user.role === 'client' && user.developerCode) {
            targetCode = user.developerCode;
        }
        
        if (!targetCode) return res.json([]);
        
        const files = fs.readdirSync(TEMPLATES_DIR);
        const meta = getTemplatesMeta();
        
        const templates = files
            .filter(f => f.startsWith(`${targetCode}_`) && f.endsWith('.zip'))
            .map(f => {
                const name = f.replace(`${targetCode}_`, '').replace('.zip', '');
                const m = meta.find(x => x.id === f) || {};
                return { 
                    id: f, 
                    name: m.name || name,
                    description: m.description || '',
                    tags: m.tags || []
                };
            });
            
        res.json(templates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Upload Template
router.post('/api/templates/upload', checkAuth, zipUpload, async (req, res) => {
    try {
        const users = await readJson(USERS_FILE);
        const user = users.find(u => String(u.id) === String(req.user.id));
        if (!user || !isDeveloper(user)) {
            return res.status(403).json({ error: 'Только разработчики могут загружать шаблоны' });
        }
        
        if (!req.file) return res.status(400).json({ error: 'Файл архива обязателен' });
        const { name, description, tags } = req.body;
        
        const safeName = (name || 'template').replace(/[^a-zA-Z0-9-_\sа-яА-ЯёЁ]/g, '').trim().replace(/\s+/g, '_');
        const filename = `${user.developerCode}_${safeName}_${Date.now()}.zip`;
        const filepath = path.join(TEMPLATES_DIR, filename);
        
        fs.writeFileSync(filepath, req.file.buffer);
        
        let parsedTags = [];
        try { parsedTags = JSON.parse(tags); } catch(e) {}
        
        const meta = getTemplatesMeta();
        meta.push({
            id: filename,
            name: name || safeName,
            description: description || '',
            tags: parsedTags,
            owner: user.id
        });
        saveTemplatesMeta(meta);
        
        res.json({ success: true, id: filename });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки шаблона' });
    }
});

// Download Template
router.get('/api/templates/:id/download', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const users = await readJson(USERS_FILE);
        const user = users.find(u => String(u.id) === String(req.user.id));
        
        let targetCode = '';
        if (user.role === 'admin' || user.role === 'developer') {
            targetCode = user.developerCode;
        } else if (user.role === 'client' && user.developerCode) {
            targetCode = user.developerCode;
        }
        
        if (!id.startsWith(`${targetCode}_`)) return res.status(403).json({ error: 'Нет доступа к этому шаблону' });
        
        const filepath = path.join(TEMPLATES_DIR, id);
        if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Шаблон не найден' });
        
        res.download(filepath);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка скачивания' });
    }
});

// Delete Template
router.delete('/api/templates/:id', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const users = await readJson(USERS_FILE);
        const user = users.find(u => String(u.id) === String(req.user.id));
        
        if (!isDeveloper(user)) return res.status(403).json({ error: 'Нет доступа' });
        if (!id.startsWith(`${user.developerCode}_`)) return res.status(403).json({ error: 'Нет доступа к этому шаблону' });
        
        const filepath = path.join(TEMPLATES_DIR, id);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        
        const meta = getTemplatesMeta();
        const newMeta = meta.filter(m => m.id !== id);
        saveTemplatesMeta(newMeta);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка удаления' });
    }
});


// Save Site as Template
router.post('/api/sites/:id/save-template', checkAuth, async (req, res) => {
    const siteId = req.params.id;
    const { templateName } = req.body;
    
    if (!templateName || !/^[a-zA-Z0-9-_А-Яа-яЁё]+$/.test(templateName)) {
        return res.status(400).json({ error: 'Некорректное имя шаблона' });
    }

    if (!(await checkSiteAccess(req, siteId, 'settings'))) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const users = await readJson(USERS_FILE);
    const user = users.find(u => String(u.id) === String(req.user.id));
    if (!user || !isDeveloper(user)) {
        return res.status(403).json({ error: 'Только разработчики могут сохранять шаблоны' });
    }

    const siteDir = path.join(SITE_DIR, siteId);
    if (!fs.existsSync(siteDir)) {
        return res.status(404).json({ error: 'Сайт не найден' });
    }

    try {
        const zip = new AdmZip();
        zip.addLocalFolder(siteDir);
        
        const templateFilename = `${user.developerCode}_${templateName}.zip`;
        const templatePath = path.join(TEMPLATES_DIR, templateFilename);
        
        zip.writeZip(templatePath);
        res.json({ success: true, templateId: templateFilename });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка при создании шаблона: ' + e.message });
    }
});



// 2. Get Sites List (Client/Admin filtered)
router.get('/api/sites', checkAuth, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (!fs.existsSync(SITE_DIR)) return res.json([]);
    const items = await fs.promises.readdir(SITE_DIR, { withFileTypes: true }).catch(() => []);
    const siteSettings = await readJsonObj(SITE_SETTINGS_FILE);
    
    const dirs = items.filter(item => item.isDirectory());
    const sites = await Promise.all(dirs.map(async (item) => {
        const id = item.name;
        const sitePath = path.join(SITE_DIR, id);
        const size = await getDirSize(sitePath);
        const hasIndex = fs.existsSync(path.join(sitePath, 'index.html'));
        const files = await fs.promises.readdir(sitePath).catch(() => []);
        const hasDrafts = files.some(f => f.includes('.draft.html'));
        
        return {
            id,
            name: siteSettings[id]?.displayName || id,
            path: id,
            description: siteSettings[id]?.description || '',
            domain: siteSettings[id]?.domain || '',
            size,
            status: hasIndex ? 'online' : 'offline',
            hasDrafts,
            developerAccess: siteSettings[id]?.developerAccess || null
        };
    }));
    
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    
    if (currentUser && currentUser.role === 'admin') {
        const clients = users.filter(u => u.role === 'client');
        const grouped = clients.map(c => ({
            id: c.id,
            username: c.username,
            name: c.name || c.username,
            sites: sites.filter(s => (c.sites || []).includes(s.id))
        }));
        
        return res.json({
            isAdmin: true,
            clients: grouped,
            allSites: sites
        });
    } else if (currentUser && currentUser.role === 'developer') {
        const devCode = currentUser.developerCode;
        const ownSitesIds = currentUser.sites || [];
        const ownSites = sites.filter(s => ownSitesIds.includes(s.id));
        
        const assignedSites = sites.filter(s => {
            const siteSet = siteSettings[s.id] || {};
            return siteSet.developerAccess && siteSet.developerAccess.code === devCode;
        });
        
        const clients = users.filter(u => u.role === 'client');
        const grouped = clients.map(c => {
            const cSites = assignedSites.filter(s => (c.sites || []).includes(s.id));
            if (cSites.length > 0) {
                return {
                    id: c.id,
                    username: c.username,
                    name: c.name || c.username,
                    sites: cSites
                };
            }
            return null;
        }).filter(c => c !== null);
        
        return res.json({
            isAdmin: false,
            isDeveloper: true,
            ownSites: ownSites,
            clients: grouped
        });
    } else if (currentUser && currentUser.role === 'client') {
        const userSites = currentUser.sites || [];
        const filteredSites = sites.filter(s => userSites.includes(s.id));
        return res.json({
            isAdmin: false,
            isDeveloper: false,
            sites: filteredSites
        });
    }
    
    res.json(sites);
});

// 3. Transfer Site & Developer Access
router.post('/api/sites/:siteId/transfer', checkAuth, express.json(), async (req, res) => {
    try {
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    const { siteId } = req.params;
    const { targetEmail, developerCode } = req.body;
    
    // Check if user has permission to transfer
    const isOwner = (currentUser.sites || []).includes(siteId);
    if (!currentUser || (currentUser.role !== 'admin' && !isOwner)) {
        return res.status(403).json({ error: 'Доступ запрещен. Только владелец или администратор может передать сайт.' });
    }
    
    // Validate limits for the target client
    let targetClient = null;
    if (targetEmail && targetEmail.trim() !== '') {
        targetClient = users.find(u => u.email && u.email.toLowerCase() === targetEmail.toLowerCase().trim() && u.role === 'client');
        if (!targetClient) {
            return res.status(404).json({ error: 'Пользователь (клиент) с таким email не найден' });
        }
        
        const maxSites = targetClient.plan === 'free' ? 1 : 5;
        const currentSiteCount = (targetClient.sites || []).length;
        if (currentSiteCount >= maxSites && !(targetClient.sites || []).includes(siteId)) {
            return res.status(400).json({ error: `Передача невозможна: у выбранного клиента превышен лимит сайтов (${maxSites}).` });
        }
    }

    // Verify developer code if provided
    let devAccess = null;
    if (developerCode && developerCode.trim() !== '') {
        const devUser = users.find(u => u.developerCode && u.developerCode.toLowerCase() === developerCode.trim().toLowerCase());
        if (!devUser) {
            return res.status(400).json({ error: 'Разработчик с таким кодом не найден' });
        }
        devAccess = { code: devUser.developerCode, developerId: devUser.id };
    }
    
    // Remove site from any user who currently owns it (even admin or other dev)
    users.forEach(u => {
        if (u.sites && u.sites.includes(siteId)) {
            u.sites = u.sites.filter(s => s !== siteId);
        }
    });
    
    // Add site to new target client if specified
    if (targetClient) {
        if (!targetClient.sites) targetClient.sites = [];
        if (!targetClient.sites.includes(siteId)) {
            targetClient.sites.push(siteId);
        }
    }
    
    await writeJson(USERS_FILE, users);

    // Update site-settings.json
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    if (!settings[siteId]) settings[siteId] = {};
    settings[siteId].owner = targetClient ? targetClient.id : null;
    settings[siteId].developerAccess = devAccess;
    await writeJson(SITE_SETTINGS_FILE, settings);

    res.json({ success: true, message: 'Настройки сайта успешно обновлены!' });
    } catch (e) { console.error('TRANSFER ERROR:', e); res.status(500).json({ error: 'Internal error: ' + e.message, stack: e.stack }); }
});

// 4. Delete Site to Trash
router.post('/api/sites/:siteId/delete', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    const { siteId } = req.params;
    const isOwner = (currentUser.sites || []).includes(siteId);
    if (!currentUser || (currentUser.role !== 'admin' && !isOwner)) {
        return res.status(403).json({ error: 'Только владелец или администратор может удалить сайт.' });
    }
    
    const sitePath = path.join(SITE_DIR, siteId);
    if (!fs.existsSync(sitePath)) {
        return res.status(404).json({ error: 'Сайт не найден на диске' });
    }
    
    // Find original owner
    let originalClientId = null;
    const owner = users.find(u => u.sites && u.sites.includes(siteId));
    if (owner) {
        originalClientId = owner.id;
        owner.sites = owner.sites.filter(s => s !== siteId);
        await writeJson(USERS_FILE, users);
    }
    
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    const displayName = settings[siteId]?.displayName || siteId;
    
    const folderName = `${siteId}_${Date.now()}`;
    const trashPath = path.join(DELETED_SITES_DIR, folderName);
    
    if (!fs.existsSync(DELETED_SITES_DIR)) {
        await fs.promises.mkdir(DELETED_SITES_DIR, { recursive: true });
    }
    
    try {
        await fs.promises.rename(sitePath, trashPath);
        
        const deletedSites = await readJson(DELETED_SITES_FILE);
        deletedSites.push({
            siteId,
            displayName,
            clientId: originalClientId,
            deletedAt: new Date().toISOString(),
            folderName
        });
        await writeJson(DELETED_SITES_FILE, deletedSites);
        
        await logHistory(siteId, 'delete', req.user.id, { displayName });
        
        // Clean up site-settings
        delete settings[siteId];
        await writeJson(SITE_SETTINGS_FILE, settings);
        
        res.json({ success: true, message: 'Сайт успешно перемещен в корзину на 7 дней!' });
    } catch (e) {
        console.error('Delete site failed:', e);
        res.status(500).json({ error: 'Не удалось перенести сайт в корзину: ' + e.message });
    }
});

// 5. Delete Client to Trash
router.post('/api/clients/:id/delete', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const clientId = parseInt(req.params.id);
    const clientIndex = users.findIndex(u => u.id === clientId && u.role === 'client');
    if (clientIndex === -1) {
        return res.status(404).json({ error: 'Клиент не найден' });
    }
    
    const client = users[clientIndex];
    const clientSites = client.sites || [];
    
    const deletedSites = await readJson(DELETED_SITES_FILE);
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    
    if (!fs.existsSync(DELETED_SITES_DIR)) {
        await fs.promises.mkdir(DELETED_SITES_DIR, { recursive: true });
    }
    
    for (const siteId of clientSites) {
        const sitePath = path.join(SITE_DIR, siteId);
        if (fs.existsSync(sitePath)) {
            const displayName = settings[siteId]?.displayName || siteId;
            const folderName = `${siteId}_${Date.now()}`;
            const trashPath = path.join(DELETED_SITES_DIR, folderName);
            
            try {
                await fs.promises.rename(sitePath, trashPath);
                deletedSites.push({
                    siteId,
                    displayName,
                    clientId: client.id,
                    deletedAt: new Date().toISOString(),
                    folderName,
                    linkedToClientDelete: client.id
                });
            } catch (err) {
                console.error(`Failed to move site ${siteId} of client ${client.id} to trash`, err);
            }
        }
    }
    
    await writeJson(DELETED_SITES_FILE, deletedSites);
    
    users.splice(clientIndex, 1);
    await writeJson(USERS_FILE, users);
    
    const deletedClients = await readJson(DELETED_CLIENTS_FILE);
    deletedClients.push({
        ...client,
        deletedAt: new Date().toISOString()
    });
    await writeJson(DELETED_CLIENTS_FILE, deletedClients);
    
    res.json({ success: true, message: 'Клиент и все его сайты перенесены в корзину на 7 дней!' });
});

// 6. Get Trash Bin Items
router.get('/api/trash', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const deletedSites = await readJson(DELETED_SITES_FILE);
    const deletedClients = await readJson(DELETED_CLIENTS_FILE);
    
    res.json({
        sites: deletedSites,
        clients: deletedClients.map(c => ({
            id: c.id,
            username: c.username,
            name: c.name || c.username,
            email: c.email,
            deletedAt: c.deletedAt,
            sitesCount: (c.sites || []).length
        }))
    });
});

// 7. Restore Site from Trash
router.post('/api/trash/restore-site', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { folderName } = req.body;
    const deletedSites = await readJson(DELETED_SITES_FILE);
    const siteIndex = deletedSites.findIndex(s => s.folderName === folderName);
    if (siteIndex === -1) {
        return res.status(404).json({ error: 'Сайт не найден в корзине' });
    }
    
    const site = deletedSites[siteIndex];
    const sourcePath = path.join(DELETED_SITES_DIR, folderName);
    const destPath = path.join(SITE_DIR, site.siteId);
    
    if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ error: 'Папка сайта не найдена в корзине' });
    }
    
    try {
        await fs.promises.rename(sourcePath, destPath);
        
        if (site.clientId) {
            const client = users.find(u => u.id === site.clientId && u.role === 'client');
            if (client) {
                if (!client.sites) client.sites = [];
                if (!client.sites.includes(site.siteId)) {
                    client.sites.push(site.siteId);
                }
                await writeJson(USERS_FILE, users);
            }
        }
        
        deletedSites.splice(siteIndex, 1);
        await writeJson(DELETED_SITES_FILE, deletedSites);
        
        await logHistory(site.siteId, 'restore_trash', req.user.id, { displayName: site.displayName });
        res.json({ success: true, message: 'Сайт успешно восстановлен!' });
    } catch (e) {
        res.status(500).json({ error: 'Не удалось восстановить сайт: ' + e.message });
    }
});

// 8. Restore Client from Trash
router.post('/api/trash/restore-client', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const clientId = parseInt(req.body.id);
    const deletedClients = await readJson(DELETED_CLIENTS_FILE);
    const clientIndex = deletedClients.findIndex(c => c.id === clientId);
    if (clientIndex === -1) {
        return res.status(404).json({ error: 'Клиент не найден в корзине' });
    }
    
    const client = deletedClients[clientIndex];
    
    // Add client back to active users list
    delete client.deletedAt;
    users.push(client);
    await writeJson(USERS_FILE, users);
    
    // Restore all sites linked to this client
    const deletedSites = await readJson(DELETED_SITES_FILE);
    const keptSites = [];
    for (const s of deletedSites) {
        if (s.linkedToClientDelete === clientId) {
            const sourcePath = path.join(DELETED_SITES_DIR, s.folderName);
            const destPath = path.join(SITE_DIR, s.siteId);
            if (fs.existsSync(sourcePath)) {
                try {
                    await fs.promises.rename(sourcePath, destPath);
                } catch (err) {
                    console.error(`Failed to restore site ${s.siteId} folder`, err);
                }
            }
        } else {
            keptSites.push(s);
        }
    }
    
    await writeJson(DELETED_SITES_FILE, keptSites);
    
    deletedClients.splice(clientIndex, 1);
    await writeJson(DELETED_CLIENTS_FILE, deletedClients);
    
    res.json({ success: true, message: 'Клиент и все его сайты успешно восстановлены!' });
});

// 9. Get Clients List
router.get('/api/clients', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const clients = users.filter(u => u.role === 'client').map(c => ({
        id: c.id,
        username: c.username,
        name: c.name || c.username
    }));
    res.json(clients);
});

// 10. Rename Client
router.post('/api/clients/:id/rename', checkAuth, async (req, res) => {
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const clientId = parseInt(req.params.id);
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Имя обязательно' });
    }
    
    const clientIndex = users.findIndex(u => u.id === clientId && u.role === 'client');
    if (clientIndex === -1) {
        return res.status(404).json({ error: 'Клиент не найден' });
    }
    
    users[clientIndex].name = name;
    await writeJson(USERS_FILE, users);
    res.json({ success: true, message: 'Имя клиента успешно изменено' });
});

// 11. Get Dashboard/Platform Stats
router.get('/api/stats', checkAuth, async (req, res) => {
    let totalSites = 0;
    let totalPages = 0;
    let totalImages = 0;
    let totalSize = 0;

    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => String(u.id) === String(req.user.id));
    
    let allowedSites = [];
    let totalClients = 0;
    if (currentUser) {
        if (currentUser.role === 'admin') {
            if (fs.existsSync(SITE_DIR)) {
                const items = await fs.promises.readdir(SITE_DIR);
                for (const s of items) {
                    try {
                        const stat = await fs.promises.stat(path.join(SITE_DIR, s));
                        if (stat.isDirectory()) allowedSites.push(s);
                    } catch(e) {}
                }
            }
        } else if (currentUser.role === 'client') {
            allowedSites = currentUser.sites || [];
        } else if (currentUser.role === 'developer') {
            const sitesObj = await readJsonObj(SITES_FILE);
            const settings = await readJsonObj(SITE_SETTINGS_FILE);
            
            let clientSet = new Set();
            Object.keys(sitesObj).forEach(siteId => {
                if (settings[siteId]?.developerAccess?.code === currentUser.developerCode) {
                    allowedSites.push(siteId);
                    clientSet.add(sitesObj[siteId].owner);
                }
            });
            totalClients = clientSet.size;
        }
    }

    totalSites = allowedSites.length;

    async function traverse(dir) {
        if (!fs.existsSync(dir)) return;
        try {
            const files = await fs.promises.readdir(dir);
            await Promise.all(files.map(async (file) => {
                const filePath = path.join(dir, file);
                const stat = await fs.promises.stat(filePath);
                if (stat.isDirectory()) {
                    await traverse(filePath);
                } else {
                    totalSize += stat.size;
                    if (file.endsWith('.html') && !file.includes('.draft.html')) {
                        totalPages++;
                    }
                    if (file.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
                        totalImages++;
                    }
                }
            }));
        } catch (e) {}
    }

    await Promise.all(
        allowedSites.map(async (s) => {
            const p = path.join(SITE_DIR, s);
            if (fs.existsSync(p)) {
                await traverse(p);
            }
        })
    );

    const plan = currentUser ? (currentUser.plan || 'beta') : 'beta';
    
    let limitStr = plan === 'free' ? '1 сайт' : '5 сайтов';
    if (currentUser && currentUser.sitesLimit) {
        limitStr = `${currentUser.sitesLimit} ${currentUser.sitesLimit === 1 ? 'сайт' : (currentUser.sitesLimit >= 2 && currentUser.sitesLimit <= 4 ? 'сайта' : 'сайтов')}`;
    }
    const limit = limitStr;

    const analytics = await readJsonObj(ANALYTICS_FILE);
    let totalUniqueVisitors = 0;
    allowedSites.forEach(s => {
        if (analytics[s] && analytics[s].uniqueVisitors) {
            totalUniqueVisitors += analytics[s].uniqueVisitors.length;
        }
    });

    res.json({
        totalSites,
        totalPages,
        totalImages,
        totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
        plan,
        limit,
        totalUniqueVisitors,
        totalClients
    });
});

// 12. Get Pages List for a specific Site
router.get('/api/pages', checkAuth, async (req, res) => {
    const site = req.query.site || 'samuraVPS';
    if (!(await checkSiteAccess(req, site, 'files'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    ensureTemplateExtracted(site);
    
    const sitePath = path.join(SITE_DIR, site);
    if (!fs.existsSync(sitePath)) return res.json([]);
    const files = fs.readdirSync(sitePath).filter(f => f.endsWith('.html') && !f.includes('.draft.html'));
    res.json(files);
});

// 13. Upload Static Files to Site Folder
router.post('/api/upload', checkAuth, upload.array('files'), (req, res) => {
    try {
        const filePaths = req.files.map(f => ({
            name: f.filename,
            url: `/real-site/${(req.body.path ? req.body.path + '/' : '')}${f.filename}`.replace(/\\/g, '/')
        }));
        res.json({ success: true, files: filePaths });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 14. ZIP Site Upload and Validation
router.post('/api/sites/upload-zip', checkAuth, zipUpload, async (req, res) => {
    try {
        const { siteId } = req.body;
        if (!siteId) {
            return res.status(400).json({ error: 'ID сайта обязателен' });
        }
        
        // Check plan limits
        const users = await readJson(USERS_FILE);
        const user = users.find(u => String(u.id) === String(req.user.id));
        if (user) {
            const maxSites = user.sitesLimit || (user.plan === 'free' ? 1 : 5);
            if (!user.sites || !user.sites.includes(siteId)) {
                const siteCount = (user.sites || []).length;
                if (siteCount >= maxSites) {
                    return res.status(400).json({ error: `Превышен лимит сайтов (максимум ${maxSites}). Обратитесь к администратору.` });
                }
            }
        }

        // Validate siteId
        const siteIdRegex = /^[a-zA-Z0-9-_]+$/;
        if (!siteIdRegex.test(siteId)) {
            return res.status(400).json({ error: 'ID сайта должен состоять только из латинских букв, цифр, дефисов и подчеркиваний' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Файл архива (.ZIP) обязателен' });
        }

        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();
        
        let singleTopFolder = null;
        const indexEntry = zipEntries.find(e => e.entryName.toLowerCase().endsWith('index.html') && !e.isDirectory);
        
        if (!indexEntry) {
            return res.status(400).json({ error: 'В архиве не найден обязательный файл index.html' });
        }
        
        const indexParts = indexEntry.entryName.split('/');
        if (indexParts.length > 1) {
            singleTopFolder = indexParts[0] + '/';
        }
        
        const sitePath = path.join(SITE_DIR, siteId);
        
        // Ensure site directory exists and is clean
        if (fs.existsSync(sitePath)) {
            fs.rmSync(sitePath, { recursive: true, force: true });
        }
        fs.mkdirSync(sitePath, { recursive: true });
        
        zipEntries.forEach(entry => {
            if (entry.isDirectory) return;
            
            let targetRelativePath = entry.entryName;
            if (singleTopFolder && targetRelativePath.startsWith(singleTopFolder)) {
                targetRelativePath = targetRelativePath.substring(singleTopFolder.length);
            }
            
            if (!targetRelativePath) return;
            
            if (targetRelativePath.toLowerCase() === 'index.html') {
                targetRelativePath = 'index.html';
            }
            
            const targetFilePath = path.join(sitePath, targetRelativePath);
            const targetFileDir = path.dirname(targetFilePath);
            
            if (!fs.existsSync(targetFileDir)) {
                fs.mkdirSync(targetFileDir, { recursive: true });
            }
            
            fs.writeFileSync(targetFilePath, entry.getData());
        });
        
        const indexHtmlPath = path.join(sitePath, 'index.html');
        if (!fs.existsSync(indexHtmlPath)) {
            return res.status(400).json({ error: 'Не удалось извлечь index.html. Убедитесь в корректности архива.' });
        }
        
        const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
        const $ = cheerio.load(htmlContent);
        
        const editableTexts = $('[data-editable]').length;
        const editableImgs = $('[data-img-editable]').length;
        
        let warning = null;
        if (editableTexts === 0 && editableImgs === 0) {
            warning = '⚠️ Внимание: на сайте не найдено редактируемых элементов (атрибутов data-editable или data-img-editable). Визуальный редактор будет пуст, пока вы не разметите свои HTML-файлы.';
        }
        
        const usersList = await readJson(USERS_FILE);
        const uploadUser = usersList.find(u => String(u.id) === String(req.user.id));
        
        const siteSettings = await readJsonObj(SITE_SETTINGS_FILE);
        siteSettings[siteId] = {
            displayName: siteId,
            description: "Загружен вручную через ZIP-архив",
            domain: "",
            telegramChatId: null,
            telegramToken: "",
            botCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            developerAccess: (uploadUser && uploadUser.developerCode) ? { code: uploadUser.developerCode, developerId: uploadUser.id } : null
        };
        await writeJson(SITE_SETTINGS_FILE, siteSettings);
        
        const { clientId } = req.body;
        
        if (clientId === 'new') {
            const clients = usersList.filter(u => u.role === 'client');
            const baseName = 'Новый клиент';
            let clientName = req.body.newClientName ? req.body.newClientName.trim() : baseName;
            
            if (!req.body.newClientName) {
                const hasBase = clients.some(c => c.name === baseName);
                if (hasBase) {
                    let maxNum = 0;
                    clients.forEach(c => {
                        if (c.name && c.name.startsWith(baseName)) {
                            const numPart = c.name.substring(baseName.length).trim();
                            if (numPart) {
                                const num = parseInt(numPart);
                                if (!isNaN(num) && num > maxNum) {
                                    maxNum = num;
                                }
                            }
                        }
                    });
                    clientName = `${baseName} ${maxNum + 1}`;
                }
            }
            
            const hashedPassword = await bcrypt.hash('123456', 10);
            const newClientId = Math.max(...usersList.map(u => u.id)) + 1;
            const newClient = {
                id: newClientId,
                username: `client_${Date.now()}`,
                name: clientName,
                password: hashedPassword,
                plan: "beta",
                email: `client${newClientId}@meloddy.cms`,
                role: "client",
                sites: [siteId]
            };
            usersList.push(newClient);
            await writeJson(USERS_FILE, usersList);
        } else if (clientId) {
            const targetId = parseInt(clientId);
            const targetClient = usersList.find(u => u.id === targetId && u.role === 'client');
            if (targetClient) {
                if (!targetClient.sites) targetClient.sites = [];
                if (!targetClient.sites.includes(siteId)) {
                    targetClient.sites.push(siteId);
                }
                await writeJson(USERS_FILE, usersList);
            }
        } else {
            const user = usersList.find(u => String(u.id) === String(req.user.id));
            if (user) {
                if (!user.sites) user.sites = [];
                if (!user.sites.includes(siteId)) {
                    user.sites.push(siteId);
                }
                await writeJson(USERS_FILE, usersList);
            }
        }
        
        res.json({
            success: true,
            message: 'Сайт успешно загружен и настроен!',
            editableTexts,
            editableImgs,
            warning
        });
        
    } catch (e) {
        console.error('ZIP Upload Error:', e);
        res.status(500).json({ error: 'Ошибка сервера при загрузке: ' + e.message });
    }
});

// 15. Save Visual Edits
router.post('/api/save-visual', checkAuth, async (req, res) => {
    const { page, updates, imgUpdates, altUpdates, hrefUpdates, blockOrder, styleUpdates, classUpdates, tagNameUpdates, seoUpdates } = req.body;
    const filename = page || 'index.html';
    
    if (!/^[a-zA-Z0-9_\-\/]+\.html$/.test(filename)) {
        return res.status(400).json({ error: 'Некорректное имя файла' });
    }
    const siteIdFromPage = extractSiteIdFromPath(filename);
    if (!(await checkSiteAccess(req, siteIdFromPage, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const draftFilename = filename.replace('.html', '.draft.html');
    const draftPath = path.join(SITE_DIR, draftFilename);
    const livePath = path.join(SITE_DIR, filename);
    
    const sourcePath = fs.existsSync(draftPath) ? draftPath : livePath;
    if (!fs.existsSync(sourcePath)) return res.status(404).json({error: 'File not found'});
    
    const html = fs.readFileSync(sourcePath, 'utf-8');
    const $ = cheerio.load(html, { decodeEntities: false });
    
    if (updates) {
        for (const [id, value] of Object.entries(updates)) {
            $(`[data-editable="${id}"]`).html(value);
        }
    }
    
    if (imgUpdates) {
        for (const [id, value] of Object.entries(imgUpdates)) {
            const src = value.replace(/^\/real-site\//, '');
            $(`[data-img-editable="${id}"]`).attr('src', src);
        }
    }

    if (altUpdates) {
        for (const [id, value] of Object.entries(altUpdates)) {
            $(`[data-img-editable="${id}"]`).attr('alt', value);
        }
    }
    
    if (hrefUpdates) {
        for (const [id, value] of Object.entries(hrefUpdates)) {
            $(`[data-editable="${id}"]`).attr('href', value);
        }
    }
    
    if (styleUpdates) {
        for (const [id, value] of Object.entries(styleUpdates)) {
            $(`[data-editable="${id}"], [data-img-editable="${id}"]`).attr('style', value);
        }
    }
    
    if (classUpdates) {
        for (const [id, value] of Object.entries(classUpdates)) {
            $(`[data-editable="${id}"], [data-img-editable="${id}"]`).attr('class', value);
        }
    }
    
    const ALLOWED_TAGS = ['h1','h2','h3','h4','h5','h6','p','span','div','a','li','ul','ol','blockquote','pre','code','em','strong','b','i','u','small','sub','sup','section','article','header','footer','nav','aside','main','figure','figcaption','details','summary'];
    if (tagNameUpdates) {
        for (const [id, value] of Object.entries(tagNameUpdates)) {
            if (!ALLOWED_TAGS.includes(value.toLowerCase())) continue;
            const el = $(`[data-editable="${id}"]`);
            if (el.length) {
                const content = el.html();
                const attrs = el.attr();
                const newEl = $(`<${value}></${value}>`);
                newEl.html(content);
                for (const [attrName, attrVal] of Object.entries(attrs)) {
                    newEl.attr(attrName, attrVal);
                }
                el.replaceWith(newEl);
            }
        }
    }
    
    if (seoUpdates) {
        const { title, description, keywords, ogTitle, ogDescription, ogImage } = seoUpdates;
        if (title) $('title').text(title);
        
        const updateMeta = (name, content, attr = 'name') => {
            if (!content) return;
            let meta = $(`meta[${attr}="${name}"]`);
            if (!meta.length) {
                $('head').append(`<meta ${attr}="${name}" content="${content}">`);
            } else {
                meta.attr('content', content);
            }
        };

        updateMeta('description', description);
        updateMeta('keywords', keywords);
        updateMeta('og:title', ogTitle, 'property');
        updateMeta('og:description', ogDescription, 'property');
        updateMeta('og:image', ogImage, 'property');
    }

    if (blockOrder && blockOrder.length > 0) {
        const firstBlock = $(`[data-block-id="${blockOrder[0]}"]`);
        if (firstBlock.length) {
            const container = firstBlock.parent();
            const blocks = [];
            blockOrder.forEach(id => {
                const el = $(`[data-block-id="${id}"]`);
                if (el.length) {
                    blocks.push(el.clone());
                    el.remove();
                }
            });
            blocks.forEach(b => container.append(b));
        }
    }
    
    fs.writeFileSync(draftPath, $.html(), 'utf-8');
    
    const siteId = filename.split('/')[0];
    await logHistory(siteId, 'save', req.user.id, { page: filename });
    
    res.json({ success: true, message: 'Черновик сохранен!' });
});

// 16. Get Site Settings
router.get('/api/site-settings/:siteId', checkAuth, async (req, res) => {
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    if (!settings[siteId]) {
        settings[siteId] = {
            displayName: siteId,
            description: '',
            domain: '',
            metrikaId: '',
            webvisor: false,
            favicon: '',
            telegramToken: '',
            telegramChatId: null
        };
    }
    
    if (!settings[siteId].botCode) {
        settings[siteId].botCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await writeJson(SITE_SETTINGS_FILE, settings);
    }
    
    res.json(settings[siteId]);
});

// 17. Save Site Settings
router.post('/api/site-settings/:siteId', checkAuth, async (req, res) => {
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    const { 
        displayName, 
        description, 
        domain, 
        metrikaId, 
        webvisor, 
        favicon, 
        palette, 
        fonts, 
        backupEnabled, 
        backupFrequency,
        telegramToken,
        telegramChatId,
        developerAccess
    } = req.body;
    
    // Validations
    const isValidColor = (c) => !c || /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+)/.test(c);
    if (palette) {
        for (const val of Object.values(palette)) {
            if (typeof val === 'string' && !isValidColor(val)) {
                return res.status(400).json({ error: 'Некорректное значение цвета в палитре' });
            }
        }
    }
    const isValidFont = (f) => !f || /^[a-zA-Z0-9\s\-,'"]+$/.test(f);
    if (fonts) {
        if (!isValidFont(fonts.header) || !isValidFont(fonts.body)) {
            return res.status(400).json({ error: 'Некорректное название шрифта' });
        }
    }
    if (metrikaId && !/^\d*$/.test(metrikaId)) {
        return res.status(400).json({ error: 'ID метрики должен содержать только цифры' });
    }
    
    const oldToken = settings[siteId]?.telegramToken || '';
    
    const oldDevCode = settings[siteId]?.developerAccess?.code;
    const newDevCode = developerAccess?.code;
    
    settings[siteId] = {
        ...settings[siteId],
        displayName: displayName || siteId,
        description: description || '',
        domain: domain || '',
        metrikaId: metrikaId || '',
        webvisor: !!webvisor,
        favicon: favicon || '',
        palette: palette || settings[siteId]?.palette || { primary: '#0070f3', accent: '#7928ca', text: '#000000', bg: '#ffffff' },
        fonts: fonts || settings[siteId]?.fonts || { header: 'Inter', body: 'Inter' },
        backupEnabled: !!backupEnabled,
        backupFrequency: backupFrequency || 'daily',
        telegramToken: telegramToken !== undefined ? telegramToken.trim() : oldToken,
        telegramChatId: telegramChatId !== undefined ? telegramChatId : (settings[siteId]?.telegramChatId || null),
        developerAccess: developerAccess || settings[siteId]?.developerAccess || { code: '', permissions: {} }
    };
    
    await writeJson(SITE_SETTINGS_FILE, settings);
    
    if (oldDevCode && oldDevCode !== newDevCode) {
        // Find the developer who had this code
        const usersList = await readJson(USERS_FILE);
        const oldDevUser = usersList.find(u => u.developerCode === oldDevCode);
        if (oldDevUser && oldDevUser.telegramChatId) {
            try {
                const { sendTelegramMessage } = require('../services/telegram');
                const config = await readJsonObj(PLATFORM_CONFIG_FILE);
                const platformToken = config.botToken || '8903430408:AAGI-cSwQB724Q00y-LJlp_lhz-4dyOJUOo';
                const siteName = settings[siteId].displayName || siteId;
                const msg = `⚠️ Внимание! Пользователь сайта *${siteName}* отозвал ваш код разработчика (\`${oldDevCode}\`).\n\nВы больше не имеете доступа к этому сайту.`;
                sendTelegramMessage(oldDevUser.telegramChatId, msg, platformToken);
            } catch (err) {
                console.error('Failed to notify developer:', err);
            }
        }
    }
    
    // Dynamically register the bot poller if custom token changed
    if (telegramToken && telegramToken !== oldToken) {
        const telegramService = require('../services/telegram');
        telegramService.startPollingForBot(telegramToken.trim());
    }
    
    res.json({ success: true });
});

// 17.1. Telegram Connect
router.post('/api/site-settings/:siteId/telegram-connect', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Код обязателен' });
    
    const telegramService = require('../services/telegram');
    const pending = telegramService.pendingConnections;
    
    if (!pending.has(code)) {
        return res.status(400).json({ error: 'Неверный или устаревший код' });
    }
    
    const chatId = pending.get(code);
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    if (!settings[siteId]) settings[siteId] = {};
    
    settings[siteId].telegramChatId = chatId;
    await writeJson(SITE_SETTINGS_FILE, settings);
    
    // Notify in Telegram
    try {
        const config = await readJsonObj(PLATFORM_CONFIG_FILE);
        const token = settings[siteId].telegramToken || config.botToken;
        const siteName = settings[siteId].displayName || siteId;
        
        telegramService.sendTelegramMessage(chatId, `✅ Бот успешно подключен к сайту *${siteName}*!\n\nТеперь сюда будут приходить заявки с этого сайта.`, token);
    } catch (e) {
        console.error('Failed to send telegram notification:', e);
    }
    
    pending.delete(code);
    
    res.json({ success: true });
});

// 17.2. Telegram Disconnect
router.post('/api/site-settings/:siteId/telegram-disconnect', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    if (settings[siteId] && settings[siteId].telegramChatId) {
        settings[siteId].telegramChatId = null;
        await writeJson(SITE_SETTINGS_FILE, settings);
    }
    
    res.json({ success: true });
});


// 18. Get Robots.txt for Site
router.get('/api/robots/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'domain'))) return res.status(403).json({ error: 'Доступ запрещен' });
    const robotsPath = path.join(SITE_DIR, siteId, 'robots.txt');
    if (fs.existsSync(robotsPath)) {
        res.type('text/plain').send(fs.readFileSync(robotsPath, 'utf-8'));
    } else {
        res.type('text/plain').send('User-agent: *\nAllow: /');
    }
});

// 19. Save Robots.txt for Site
router.post('/api/robots/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    const { content } = req.body;
    const robotsPath = path.join(SITE_DIR, siteId, 'robots.txt');
    
    const sitePath = path.join(SITE_DIR, siteId);
    if (!fs.existsSync(sitePath)) fs.mkdirSync(sitePath, { recursive: true });
    
    fs.writeFileSync(robotsPath, content, 'utf-8');
    res.json({ success: true, message: 'robots.txt сохранен!' });
});

// 20. Get Nginx configuration for Site
router.get('/api/nginx-config/:siteId', checkAuth, async (req, res) => {
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    const siteId = req.params.siteId;
    const siteSettings = settings[siteId] || {};
    const domain = siteSettings.domain || `${siteId}.example.com`;
    const PORT = process.env.PORT || 3000;
    
    const config = `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://localhost:${PORT}/real-site/${siteId}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS (после настройки Let's Encrypt):
# server {
#     listen 443 ssl;
#     server_name ${domain};
#     ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
#
#     location / {
#         proxy_pass http://localhost:${PORT}/real-site/${siteId}/;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#     }
# }`;
    
    res.json({ config, domain });
});

// 21. Publish Draft Changes to Live
router.post('/api/publish', checkAuth, async (req, res) => {
    const { page } = req.body;
    const filename = page || 'index.html';
    const siteIdFromPage = extractSiteIdFromPath(filename);
    if (!(await checkSiteAccess(req, siteIdFromPage, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    const draftFilename = filename.replace('.html', '.draft.html');
    
    const draftPath = path.join(SITE_DIR, draftFilename);
    const livePath = path.join(SITE_DIR, filename);
    
    if (!fs.existsSync(draftPath)) return res.status(404).json({error: 'Нет черновика для публикации'});
    
    const siteId = filename.split('/')[0];
    const settings = await readJsonObj(SITE_SETTINGS_FILE);
    const siteSettings = settings[siteId] || {};

    // Create backup before publishing
    let backupFile = null;
    if (fs.existsSync(livePath)) {
        const backupDir = path.join(BACKUPS_DIR, siteId);
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        backupFile = `${path.basename(filename)}_${Date.now()}.bak`;
        fs.copyFileSync(livePath, path.join(backupDir, backupFile));
    }
    
    let html = fs.readFileSync(draftPath, 'utf-8');
    
    if (siteSettings.metrikaId) {
        html = html.replace(/<!-- METRIKA_START -->[\s\S]*?<!-- METRIKA_END -->/g, '');
        
        const metrikaScript = `<!-- METRIKA_START -->
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${siteSettings.metrikaId}, "init", {
    clickmap:true,
    trackLinks:true,
    accurateTrackBounce:true${siteSettings.webvisor ? ',\n    webvisor:true' : ''}
});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${siteSettings.metrikaId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- METRIKA_END -->`;
        
        html = html.replace('</head>', metrikaScript + '\n</head>');
    }
    
    if (siteSettings.favicon) {
        html = html.replace(/<!-- FAVICON_START -->[\s\S]*?<!-- FAVICON_END -->/g, '');
        const faviconTag = `<!-- FAVICON_START -->\n<link rel="icon" href="${siteSettings.favicon}" type="image/x-icon">\n<!-- FAVICON_END -->`;
        html = html.replace('</head>', faviconTag + '\n</head>');
    }
    
    fs.writeFileSync(livePath, html, 'utf-8');
    
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    if (!siteSettingsAll[siteId]) siteSettingsAll[siteId] = {};
    siteSettingsAll[siteId].lastPublish = new Date().toISOString();
    await writeJson(SITE_SETTINGS_FILE, siteSettingsAll);
    
    await logHistory(siteId, 'publish', req.user.id, { 
        page: filename, 
        backup: backupFile 
    });
    
    res.json({ success: true, message: 'Сайт успешно опубликован!' });
});

// 22. Get Audit/History Logs for Site
router.get('/api/history/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    const history = await readJson(HISTORY_FILE);
    const siteHistory = history.filter(h => h.siteId === siteId);
    res.json(siteHistory);
});

// 23. Rollback Site to Previous Publish State
router.post('/api/rollback', checkAuth, async (req, res) => {
    const { siteId, backupFile, page } = req.body;
    if (!siteId || !backupFile || !page) return res.status(400).json({ error: 'Missing parameters' });
    if (!(await checkSiteAccess(req, siteId, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const backupPath = path.join(BACKUPS_DIR, siteId, backupFile);
    const livePath = path.join(SITE_DIR, page);
    
    if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Backup not found' });
    
    try {
        fs.copyFileSync(backupPath, livePath);
        await logHistory(siteId, 'rollback', req.user.id, { page, backupFile });
        res.json({ success: true, message: 'Откат выполнен успешно!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 24. Get Global style.css for Site
router.get('/api/site-css/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'analytics'))) return res.status(403).json({ error: 'Доступ запрещен' });
    const cssPath = path.join(SITE_DIR, siteId, 'css', 'style.css');
    if (fs.existsSync(cssPath)) {
        res.type('text/css').send(fs.readFileSync(cssPath, 'utf-8'));
    } else {
        res.type('text/css').send('/* Глобальные стили проекта */\nbody {\n  margin: 0;\n}');
    }
});

// 25. Save Global style.css for Site
router.post('/api/site-css/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    const { css } = req.body;
    const cssDir = path.join(SITE_DIR, siteId, 'css');
    const cssPath = path.join(cssDir, 'style.css');
    
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    
    fs.writeFileSync(cssPath, css, 'utf-8');
    res.json({ success: true, message: 'CSS успешно сохранен!' });
});

// 26. Discard Draft Changes (Revert)
router.post('/api/revert', checkAuth, async (req, res) => {
    const { page } = req.body;
    const filename = page || 'index.html';
    const siteIdFromPage = extractSiteIdFromPath(filename);
    if (!(await checkSiteAccess(req, siteIdFromPage, 'editor'))) return res.status(403).json({ error: 'Доступ запрещен' });
    const draftFilename = filename.replace('.html', '.draft.html');
    
    const draftPath = path.join(SITE_DIR, draftFilename);
    
    if (!fs.existsSync(draftPath)) return res.status(404).json({error: 'Нет черновика для отмены'});
    
    fs.unlinkSync(draftPath);
    res.json({ success: true, message: 'Изменения отменены (черновик удален)!' });
});

// Create Site from Template
router.post('/api/sites/create-from-template', checkAuth, async (req, res) => {
    try {
        const { siteId, templateId, clientId, newClientName } = req.body;
        
        if (!siteId || !templateId) {
            return res.status(400).json({ error: 'ID сайта и ID шаблона обязательны' });
        }
        
        const siteIdRegex = /^[a-zA-Z0-9-_]+$/;
        if (!siteIdRegex.test(siteId)) {
            return res.status(400).json({ error: 'Недопустимые символы в ID сайта' });
        }
        
        const usersList = await readJson(USERS_FILE);
        const currentUser = usersList.find(u => String(u.id) === String(req.user.id));
        
        if (!currentUser || currentUser.role !== 'developer') {
            return res.status(403).json({ error: 'Только разработчики могут создавать сайты из шаблонов' });
        }
        
        const templatePath = path.join(TEMPLATES_DIR, templateId);
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const siteDir = path.join(SITE_DIR, siteId);
        if (fs.existsSync(siteDir)) {
            return res.status(400).json({ error: 'Сайт с таким ID уже существует' });
        }
        
        fs.mkdirSync(siteDir, { recursive: true });
        
        const zip = new AdmZip(templatePath);
        zip.extractAllTo(siteDir, true);
        
        const siteSettings = await readJsonObj(SITE_SETTINGS_FILE);
        siteSettings[siteId] = {
            displayName: siteId,
            description: "Создан из шаблона",
            domain: "",
            telegramChatId: null,
            telegramToken: "",
            botCode: Math.random().toString(36).substring(2, 8).toUpperCase()
        };
        await writeJson(SITE_SETTINGS_FILE, siteSettings);
        
        // Add site to user
        if (!currentUser.sites) currentUser.sites = [];
        if (!currentUser.sites.includes(siteId)) {
            currentUser.sites.push(siteId);
        }
        await writeJson(USERS_FILE, usersList);
        
        res.json({
            success: true,
            message: 'Сайт успешно создан из шаблона!'
        });
        
    } catch (e) {
        console.error('Template Create Error:', e);
        res.status(500).json({ error: 'Ошибка сервера при создании: ' + e.message });
    }
});

module.exports = router;
