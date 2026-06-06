const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const AdmZip = require('adm-zip');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SITES_FILE = path.join(DATA_DIR, 'sites.json');
const SITE_SETTINGS_FILE = path.join(DATA_DIR, 'site-settings.json');
const PLATFORM_CONFIG_FILE = path.join(DATA_DIR, 'platform-config.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'logs', 'analytics.json');
const HISTORY_FILE = path.join(DATA_DIR, 'logs', 'history.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DELETED_SITES_FILE = path.join(DATA_DIR, 'deleted-sites.json');
const DELETED_CLIENTS_FILE = path.join(DATA_DIR, 'deleted-clients.json');
const DELETED_SITES_DIR = path.join(DATA_DIR, 'deleted_sites');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');

// Promise-based file lock to prevent race conditions and data corruption
const fileLocks = {};
const withFileLock = async (filePath, callback) => {
    const resolvedPath = path.resolve(filePath);
    if (!fileLocks[resolvedPath]) {
        fileLocks[resolvedPath] = Promise.resolve();
    }
    let release;
    const nextLock = new Promise(resolve => { release = resolve; });
    const currentLock = fileLocks[resolvedPath];
    fileLocks[resolvedPath] = nextLock;
    await currentLock;
    try {
        return await callback();
    } finally {
        release();
    }
};

// Helper to read/write JSON
const readJson = async (file) => {
    return withFileLock(file, async () => {
        try {
            if (!fs.existsSync(file)) return [];
            const content = await fs.promises.readFile(file, 'utf-8');
            return JSON.parse(content || '[]');
        } catch (e) {
            return [];
        }
    });
};

const readJsonObj = async (file) => {
    return withFileLock(file, async () => {
        try {
            if (!fs.existsSync(file)) return {};
            const content = await fs.promises.readFile(file, 'utf-8');
            return JSON.parse(content || '{}');
        } catch (e) {
            return {};
        }
    });
};

const writeJson = async (file, data) => {
    return withFileLock(file, async () => {
        await fs.promises.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
    });
};

// Helper to get directory size
const getDirSize = async (dirPath) => {
    let size = 0;
    try {
        const files = await fs.promises.readdir(dirPath);
        for (let i = 0; i < files.length; i++) {
            const filePath = path.join(dirPath, files[i]);
            const stats = await fs.promises.stat(filePath);
            if (stats.isFile()) size += stats.size;
            else if (stats.isDirectory()) size += await getDirSize(filePath);
        }
    } catch (e) {
        // Ignore errors
    }
    return size;
};

// Log History
const logHistory = async (siteId, action, userId, details = {}) => {
    return withFileLock(HISTORY_FILE, async () => {
        try {
            const logsDir = path.dirname(HISTORY_FILE);
            if (!fs.existsSync(logsDir)) await fs.promises.mkdir(logsDir, { recursive: true });

            let history = [];
            if (fs.existsSync(HISTORY_FILE)) {
                const content = await fs.promises.readFile(HISTORY_FILE, 'utf-8');
                if (content.trim()) history = JSON.parse(content);
            }
            
            history.unshift({
                siteId,
                action, 
                userId,
                timestamp: new Date().toISOString(),
                details
            });
            
            if (history.length > 500) history = history.slice(0, 500);
            await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to log history:', e);
        }
    });
};

// Helper to create backup
const createBackup = async (siteId) => {
    const siteDir = path.join(__dirname, '..', '..', 'site', siteId);
    const backupDir = path.join(BACKUPS_DIR, siteId);
    if (!fs.existsSync(backupDir)) await fs.promises.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipPath = path.join(backupDir, `${siteId}_${timestamp}.zip`);
    
    try {
        const zip = new AdmZip();
        zip.addLocalFolder(siteDir);
        zip.writeZip(zipPath);
        return { success: true, path: zipPath, filename: `${siteId}_${timestamp}.zip` };
    } catch (error) {
        console.error('Backup failed:', error);
        return { success: false, error: error.message };
    }
};

// Helper: is user a developer (has a developer code, regardless of role field)
const isDeveloper = (user) => !!(user && user.developerCode);

// Helper: check if current user has access to a specific site
const checkSiteAccess = async (req, siteId, requiredPermission = null) => {
    if (!req.user) return false;
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => u.id === req.user.id);
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    
    if (siteId && siteId.startsWith('_template_')) {
        return isDeveloper(currentUser);
    }
    
    const isOwner = (currentUser.sites || []).includes(siteId);
    if (isOwner) return true; // Owner (client or developer's own site)
    
    if (isDeveloper(currentUser)) {
        const settings = await readJsonObj(SITE_SETTINGS_FILE);
        const siteSet = settings[siteId] || {};
        if (siteSet.developerAccess && siteSet.developerAccess.code === currentUser.developerCode) {
            if (!requiredPermission) return true; // General access
            return !siteSet.developerAccess.permissions || siteSet.developerAccess.permissions[requiredPermission] !== false;
        }
    }
    
    return false;
};

// Helper: ensure template is extracted if it's a template
const ensureTemplateExtracted = (siteId) => {
    if (!siteId || !siteId.startsWith('_template_')) return;
    
    const templateId = siteId.substring('_template_'.length);
    const templatesDir = path.join(DATA_DIR, 'templates');
    if (!fs.existsSync(templatesDir)) return;

    let targetZipPath = path.join(templatesDir, templateId);
    
    if (!fs.existsSync(targetZipPath)) {
        if (!templateId.endsWith('.zip') && fs.existsSync(targetZipPath + '.zip')) {
            targetZipPath += '.zip';
        } else {
            const files = fs.readdirSync(templatesDir);
            const match = files.find(f => f.includes(`_${templateId}_`) || f === `${templateId}.zip` || f.includes(templateId));
            if (match) {
                targetZipPath = path.join(templatesDir, match);
            }
        }
    }
    
    const tmpDir = path.join(__dirname, '..', '..', 'site', siteId);
    
    if (fs.existsSync(targetZipPath) && !fs.existsSync(tmpDir)) {
        try {
            const zip = new AdmZip(targetZipPath);
            zip.extractAllTo(tmpDir, true);
            console.log('Extracted template to', tmpDir);
        } catch (e) {
            console.error('Failed to extract template', e);
        }
    }
};

// Helper: extract siteId from a path like "siteName/page.html"
const extractSiteIdFromPath = (pagePath) => {
    if (!pagePath) return null;
    const parts = pagePath.replace(/\\/g, '/').split('/');
    return parts[0] || null;
};

// Initialize default user if not exists
const initDb = async () => {
    if (!fs.existsSync(USERS_FILE)) {
        const hash = await bcrypt.hash('admin', 10);
        await writeJson(USERS_FILE, [{ id: 1, username: 'admin', password: hash, role: 'admin' }]);
        console.log('Default user created: admin / admin');
    }
    if (!fs.existsSync(SITES_FILE)) {
        await writeJson(SITES_FILE, [
            { id: 'site1', name: 'My First Promo', content: '<h1>Hello World</h1>' }
        ]);
    }
    if (!fs.existsSync(PLATFORM_CONFIG_FILE)) {
        await writeJson(PLATFORM_CONFIG_FILE, {
            botToken: '8903430408:AAGI-cSwQB724Q00y-LJlp_lhz-4dyOJUOo',
            platformUrl: 'https://meloddy-crm.ru'
        });
    }
    if (!fs.existsSync(DELETED_SITES_FILE)) {
        await writeJson(DELETED_SITES_FILE, []);
    }
    if (!fs.existsSync(DELETED_CLIENTS_FILE)) {
        await writeJson(DELETED_CLIENTS_FILE, []);
    }
};

const purgeTrashBin = async () => {
    try {
        const deletedSites = await readJson(DELETED_SITES_FILE);
        const deletedClients = await readJson(DELETED_CLIENTS_FILE);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        let keptSites = [];
        deletedSites.forEach(s => {
            const age = now - new Date(s.deletedAt).getTime();
            if (age >= maxAge) {
                const folderPath = path.join(DELETED_SITES_DIR, s.folderName);
                if (fs.existsSync(folderPath)) {
                    fs.rmSync(folderPath, { recursive: true, force: true });
                }
                console.log(`Permanently purged deleted site: ${s.siteId} (deleted on ${s.deletedAt})`);
            } else {
                keptSites.push(s);
            }
        });
        await writeJson(DELETED_SITES_FILE, keptSites);
        
        let keptClients = [];
        deletedClients.forEach(c => {
            const age = now - new Date(c.deletedAt).getTime();
            if (age >= maxAge) {
                console.log(`Permanently purged deleted client: ${c.name} (deleted on ${c.deletedAt})`);
            } else {
                keptClients.push(c);
            }
        });
        await writeJson(DELETED_CLIENTS_FILE, keptClients);
    } catch (e) {
        console.error('Failed to purge trash bin:', e);
    }
};

module.exports = {
    DATA_DIR,
    USERS_FILE,
    SITES_FILE,
    SITE_SETTINGS_FILE,
    PLATFORM_CONFIG_FILE,
    ANALYTICS_FILE,
    HISTORY_FILE,
    BACKUPS_DIR,
    DELETED_SITES_FILE,
    DELETED_CLIENTS_FILE,
    DELETED_SITES_DIR,
    REQUESTS_FILE,
    withFileLock,
    readJson,
    readJsonObj,
    writeJson,
    getDirSize,
    logHistory,
    createBackup,
    checkSiteAccess,
    ensureTemplateExtracted,
    extractSiteIdFromPath,
    initDb,
    purgeTrashBin,
    isDeveloper
};
