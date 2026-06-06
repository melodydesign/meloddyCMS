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
        filename: (req, fil
<truncated 31196 bytes>
mises.readdir(SITE_DIR);
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
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.

