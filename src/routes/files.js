const express = require('express');
const fs = require('fs');
const path = require('path');
const { 
    checkSiteAccess, 
    extractSiteIdFromPath, 
    readJson, 
    USERS_FILE 
} = require('../utils/db');
const { checkAuth } = require('../middleware/auth');

const AdmZip = require('adm-zip');

const router = express.Router();
const SITE_DIR = path.resolve(__dirname, '..', '..', 'site');
const GLOBAL_DIR = path.resolve(__dirname, '..', '..', 'data', 'global_files');
const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'data', 'templates');
const TMP_TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'data', 'tmp_templates');
// TMP_TEMPLATES_DIR is no longer heavily used but kept for repack if needed.

function repackTemplate(templateId, tmpDir) {
    try {
        const zipPath = path.join(TEMPLATES_DIR, templateId);
        const zip = new AdmZip();
        zip.addLocalFolder(tmpDir);
        zip.writeZip(zipPath);
    } catch (e) {
        console.error('Failed to repack template', e);
    }
}

async function resolvePathAndAccess(req, inputPath) {
    let isTemplate = false;
    let templateId = null;
    let tmpDir = null;

    const siteId = extractSiteIdFromPath(inputPath || '');

    if (siteId && siteId.startsWith('_template_')) {
        const users = await readJson(USERS_FILE);
        const user = users.find(u => String(u.id) === String(req.user.id));
        if (!user || user.role !== 'developer') {
            return { error: 'Только разработчики могут редактировать шаблоны' };
        }
        
        templateId = siteId.substring('_template_'.length);
        const templateZipPath = path.join(TEMPLATES_DIR, templateId);
        
        if (!fs.existsSync(templateZipPath)) {
            return { error: 'Шаблон не найден' };
        }
        
        tmpDir = path.join(SITE_DIR, siteId);
        
        if (!fs.existsSync(tmpDir)) {
            try {
                const zip = new AdmZip(templateZipPath);
                zip.extractAllTo(tmpDir, true);
            } catch (e) {
                console.error('Extraction error:', e);
                return { error: 'Ошибка распаковки шаблона' };
            }
        }
        isTemplate = true;
    }

    if (inputPath && inputPath.startsWith('global/')) {
        const users = await readJson(USERS_FILE);
        const user = users.find(u => u.id === req.user.id);
        if (!user || user.role !== 'admin') {
            return { error: 'Access denied to global files' };
        }
        const devGlobalPath = path.join(GLOBAL_DIR, user.developerCode);
        if (!fs.existsSync(devGlobalPath)) fs.mkdirSync(devGlobalPath, { recursive: true });
        
        const relativeGlobal = inputPath.substring(7); // remove "global/"
        const targetPath = path.resolve(devGlobalPath, relativeGlobal);
        
        if (!targetPath.startsWith(devGlobalPath)) {
             return { error: 'Access denied' };
        }
        return { targetPath, basePath: devGlobalPath, isGlobal: true };
    }
    
    const targetPath = path.resolve(SITE_DIR, inputPath || '');
    if (!targetPath.startsWith(path.resolve(SITE_DIR))) {
        return { error: 'Access denied' };
    }
    if (siteId && !(await checkSiteAccess(req, siteId, 'files'))) {
        return { error: 'Доступ запрещен' };
    }
    
    return { targetPath, basePath: SITE_DIR, isGlobal: false, isTemplate, templateId, tmpDir };
}

router.get('/api/files', checkAuth, async (req, res) => {
    const inputPath = req.query.path || '';
    const resolved = await resolvePathAndAccess(req, inputPath);
    if (resolved.error) return res.status(403).json({ error: resolved.error });
    
    const { targetPath: dirPath, basePath, isGlobal } = resolved;

    try {
        if (!fs.existsSync(dirPath)) return res.json([]);
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        let result = items.map(item => {
            const relPath = path.relative(basePath, path.join(dirPath, item.name)).replace(/\\/g, '/');
            return {
                name: item.name,
                isDirectory: item.isDirectory(),
                path: isGlobal ? 'global/' + relPath : relPath
            };
        });
        
        if (inputPath === '') {
            const { checkSiteAccess } = require('../utils/db');
            const filteredResult = [];
            for (const item of result) {
                // Special display name for template folders
                if (item.name.startsWith('_template_')) {
                    const templateName = item.name.substring('_template_'.length).split('_').slice(1).join('_');
                    item.displayName = '📦 Шаблон: ' + (templateName || item.name);
                }
                
                // Only show sites the user actually has access to!
                if (await checkSiteAccess(req, item.name)) {
                    filteredResult.push(item);
                }
            }
            result = filteredResult;
        }

        // Inject global folder at root if developer
        if (inputPath === '') {
            const users = await readJson(USERS_FILE);
            const user = users.find(u => u.id === req.user.id);
            if (user && user.role === 'admin') {
                result.push({
                    name: '🌐 Общие файлы (Global)',
                    isDirectory: true,
                    path: 'global'
                });
            }
        }
        
        result.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/all-images', checkAuth, (req, res) => {
    const results = [];

    function scanDir(dir) {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                scanDir(fullPath);
            } else if (item.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
                results.push({
                    name: item.name,
                    url: '/real-site/' + path.relative(SITE_DIR, fullPath).replace(/\\/g, '/')
                });
            }
        }
    }

    try {
        scanDir(SITE_DIR);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/activity', checkAuth, async (req, res) => {
    const results = [];
    const users = await readJson(USERS_FILE);
    const currentUser = users.find(u => u.id === req.user.id);
    
    let allowedSites = [];
    if (currentUser) {
        if (currentUser.role === 'admin') {
            if (fs.existsSync(SITE_DIR)) {
                allowedSites = fs.readdirSync(SITE_DIR).filter(s => {
                    try { return fs.statSync(path.join(SITE_DIR, s)).isDirectory(); } catch(e) { return false; }
                });
            }
        } else if (currentUser.role === 'client') {
            allowedSites = currentUser.sites || [];
        } else if (currentUser.role === 'developer') {
            const { readJsonObj, SITES_FILE, SITE_SETTINGS_FILE } = require('../utils/db');
            const sitesObj = await readJsonObj(SITES_FILE);
            const settings = await readJsonObj(SITE_SETTINGS_FILE);
            Object.keys(sitesObj).forEach(siteId => {
                if (settings[siteId]?.developerAccess?.code === currentUser.developerCode) {
                    allowedSites.push(siteId);
                }
            });
            const ownSites = currentUser.sites || [];
            allowedSites = [...new Set([...allowedSites, ...ownSites])];
        }
    }

    function scanDir(dir) {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                scanDir(fullPath);
            } else {
                const stats = fs.statSync(fullPath);
                results.push({
                    name: item.name,
                    path: path.relative(SITE_DIR, fullPath).replace(/\\/g, '/'),
                    mtime: stats.mtime,
                    size: stats.size
                });
            }
        }
    }

    try {
        let finalSites = allowedSites;
        if (req.query.siteId) {
            if (allowedSites.includes(req.query.siteId)) {
                finalSites = [req.query.siteId];
            } else {
                finalSites = []; // no access to this site
            }
        }

        finalSites.forEach(s => {
            const p = path.join(SITE_DIR, s);
            if (fs.existsSync(p)) {
                scanDir(p);
            }
        });

        // Date filtering
        const now = Date.now();
        let filteredResults = results;
        if (req.query.dateFilter === 'today') {
            const startOfDay = new Date();
            startOfDay.setHours(0,0,0,0);
            filteredResults = results.filter(r => r.mtime >= startOfDay.getTime());
        } else if (req.query.dateFilter === 'week') {
            const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
            filteredResults = results.filter(r => r.mtime >= startOfWeek.getTime());
        } else if (req.query.dateFilter === 'month') {
            const startOfMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);
            filteredResults = results.filter(r => r.mtime >= startOfMonth.getTime());
        }

        filteredResults.sort((a, b) => b.mtime - a.mtime);
        
        const limit = parseInt(req.query.limit) || 40;
        const offset = parseInt(req.query.offset) || 0;
        const paginated = filteredResults.slice(offset, offset + limit);
        
        res.json({
            items: paginated,
            total: filteredResults.length,
            hasMore: offset + limit < filteredResults.length
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/file', checkAuth, async (req, res) => {
    const resolved = await resolvePathAndAccess(req, req.query.path);
    if (resolved.error) return res.status(403).json({ error: resolved.error });
    if (!fs.existsSync(resolved.targetPath)) return res.status(404).json({ error: 'File not found' });
    
    const content = fs.readFileSync(resolved.targetPath, 'utf-8');
    res.json({ content });
});

router.post('/api/file', checkAuth, async (req, res) => {
    const resolved = await resolvePathAndAccess(req, req.body.path);
    if (resolved.error) return res.status(403).json({ error: resolved.error });
    
    fs.writeFileSync(resolved.targetPath, req.body.content, 'utf-8');
    if (resolved.isTemplate) repackTemplate(resolved.templateId, resolved.tmpDir);
    res.json({ success: true });
});

router.post('/api/delete-file', checkAuth, async (req, res) => {
    const resolved = await resolvePathAndAccess(req, req.body.path);
    if (resolved.error) return res.status(403).json({ error: resolved.error });
    
    const filePath = resolved.targetPath;
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    if (fs.statSync(filePath).isDirectory()) {
        return res.status(400).json({ error: 'Cannot delete directory' });
    }
    fs.unlinkSync(filePath);
    if (resolved.isTemplate) repackTemplate(resolved.templateId, resolved.tmpDir);
    res.json({ success: true });
});

router.post('/api/create-folder', checkAuth, async (req, res) => {
    const { path: parentPath, folderName } = req.body;
    if (!folderName || !/^[a-zA-Z0-9-_а-яА-ЯёЁ\s]+$/.test(folderName)) {
        return res.status(400).json({ error: 'Некорректное имя папки' });
    }
    
    const resolved = await resolvePathAndAccess(req, parentPath);
    if (resolved.error) return res.status(403).json({ error: resolved.error });
    
    const targetDir = path.resolve(resolved.targetPath, folderName);
    
    if (fs.existsSync(targetDir)) {
        return res.status(400).json({ error: 'Папка уже существует' });
    }
    
    try {
        fs.mkdirSync(targetDir, { recursive: true });
        if (resolved.isTemplate) repackTemplate(resolved.templateId, resolved.tmpDir);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/api/rename-file-or-folder', checkAuth, async (req, res) => {
    const { path: oldPath, newName } = req.body;
    if (!newName || !/^[a-zA-Z0-9-_а-яА-ЯёЁ\s\.]+$/.test(newName)) {
        return res.status(400).json({ error: 'Некорректное имя' });
    }
    
    const resolved = await resolvePathAndAccess(req, oldPath);
    if (resolved.error) return res.status(403).json({ error: resolved.error });
    
    const oldResolved = resolved.targetPath;
    if (oldResolved === resolved.basePath) { // Cannot rename root
        return res.status(400).json({ error: 'Нельзя переименовать корень' });
    }
    
    const parentDir = path.dirname(oldResolved);
    const newResolved = path.join(parentDir, newName);
    
    if (fs.existsSync(newResolved)) {
        return res.status(400).json({ error: 'Файл или папка с таким именем уже существует' });
    }
    
    try {
        fs.renameSync(oldResolved, newResolved);
        if (resolved.isTemplate) repackTemplate(resolved.templateId, resolved.tmpDir);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/api/delete-folder', checkAuth, async (req, res) => {
    const resolved = await resolvePathAndAccess(req, req.body.path);
    if (resolved.error) return res.status(403).json({ error: resolved.error });
    
    const folderPath = resolved.targetPath;
    if (folderPath === resolved.basePath) {
        return res.status(400).json({ error: 'Cannot delete root directory' });
    }
    
    if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ error: 'Folder not found' });
    }
    if (!fs.statSync(folderPath).isDirectory()) {
        return res.status(400).json({ error: 'Not a directory' });
    }
    
    try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        if (resolved.isTemplate) repackTemplate(resolved.templateId, resolved.tmpDir);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
