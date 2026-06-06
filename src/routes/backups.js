const express = require('express');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { 
    checkSiteAccess, 
    createBackup, 
    logHistory, 
    BACKUPS_DIR 
} = require('../utils/db');
const { checkAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/api/backups/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'files'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const result = await createBackup(siteId);
    if (result.success) {
        await logHistory(siteId, 'backup', req.user.id, { filename: result.filename });
        res.json({ success: true, message: 'Бэкап создан!', filename: result.filename });
    } else {
        res.status(500).json({ success: false, error: result.error });
    }
});

router.get('/api/backups/:siteId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'files'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const siteBackupDir = path.join(BACKUPS_DIR, siteId);
    if (!fs.existsSync(siteBackupDir)) return res.json([]);
    
    try {
        const files = await fs.promises.readdir(siteBackupDir);
        const backupFiles = await Promise.all(
            files
                .filter(f => f.endsWith('.zip'))
                .map(async (f) => {
                    const stats = await fs.promises.stat(path.join(siteBackupDir, f));
                    return {
                        filename: f,
                        size: stats.size,
                        mtime: stats.mtime
                    };
                })
        );
        backupFiles.sort((a, b) => b.mtime - a.mtime);
        res.json(backupFiles);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/api/backups/:siteId/download/:filename', checkAuth, async (req, res) => {
    const { siteId, filename } = req.params;
    if (!(await checkSiteAccess(req, siteId, 'files'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const filePath = path.join(BACKUPS_DIR, siteId, filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    res.download(filePath);
});

router.post('/api/backups/:siteId/restore', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId, 'files'))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { filename } = req.body;
    const filePath = path.join(BACKUPS_DIR, siteId, filename);
    
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found' });
    
    const siteDir = path.join(__dirname, '..', '..', 'site', siteId);
    
    try {
        const oldDir = siteDir + '_before_restore';
        if (fs.existsSync(oldDir)) await fs.promises.rm(oldDir, { recursive: true, force: true });
        if (fs.existsSync(siteDir)) await fs.promises.rename(siteDir, oldDir);
        
        await fs.promises.mkdir(siteDir, { recursive: true });
        const zip = new AdmZip(filePath);
        zip.extractAllTo(siteDir, true);
        
        await logHistory(siteId, 'restore', req.user.id, { filename });
        res.json({ success: true, message: 'Сайт восстановлен из бэкапа!' });
    } catch (error) {
        console.error('Restore failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
