const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cheerio = require('cheerio');

const { 
    initDb, 
    purgeTrashBin, 
    readJsonObj, 
    readJson, 
    writeJson, 
    createBackup, 
    SITE_SETTINGS_FILE, 
    USERS_FILE, 
    PLATFORM_CONFIG_FILE,
    ensureTemplateExtracted
} = require('./src/utils/db');
const telegramService = require('./src/services/telegram');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Initialize Database structure
initDb().catch(err => console.error('DB Initialization failed:', err));

// Serve CMS static UI files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// Serve Global Developer Files
const globalFilesDir = path.join(__dirname, 'data', 'global_files');
if (!fs.existsSync(globalFilesDir)) fs.mkdirSync(globalFilesDir, { recursive: true });
app.use('/global', express.static(globalFilesDir));

// Mount Modular API Routers
app.use(require('./src/routes/auth'));
app.use(require('./src/routes/sites'));
app.use(require('./src/routes/analytics'));
app.use(require('./src/routes/backups'));
app.use(require('./src/routes/files'));
app.use(require('./src/routes/admin'));

// Serve real sites statically with draft fallback & tracking injections
app.use('/real-site', async (req, res, next) => {
    const isHtml = req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.');
    if (isHtml) {
        let filename = req.path;
        if (filename === '/') return res.status(400).send('Missing site ID in path');
        
        // Remove leading slash
        const cleanPath = filename.startsWith('/') ? filename.substring(1) : filename;
        const siteId = cleanPath.split('/')[0] || cleanPath.split('\\')[0];
        
        ensureTemplateExtracted(siteId);
        
        let targetFile = cleanPath;
        if (!targetFile.endsWith('.html')) {
            // Treat as index.html
            targetFile = path.join(cleanPath, 'index.html');
        }
        
        if (req.query.preview === 'true') {
            const draftPath = targetFile.replace('.html', '.draft.html');
            const fullDraftPath = path.join(__dirname, 'site', draftPath);
            if (fs.existsSync(fullDraftPath)) {
                filename = draftPath;
            } else {
                filename = targetFile;
            }
        } else {
            filename = targetFile;
        }
        
        const fullPath = path.join(__dirname, 'site', filename);
        if (fs.existsSync(fullPath)) {
            let html = fs.readFileSync(fullPath, 'utf-8');
            const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
            const settings = siteSettingsAll[siteId] || {};
            
            // Inject styles and tracking script
            let headInjections = `\n<!-- GLOBAL_STYLES_START -->\n<link rel="stylesheet" href="/api/site-css/${siteId}">`;
            
            if (settings.palette || settings.fonts) {
                headInjections += `\n<style>\n  :root {\n`;
                if (settings.palette?.primary) headInjections += `    --primary-color: ${settings.palette.primary};\n`;
                if (settings.palette?.accent) headInjections += `    --accent-color: ${settings.palette.accent};\n`;
                if (settings.palette?.text) headInjections += `    --text-main: ${settings.palette.text};\n`;
                if (settings.palette?.bg) headInjections += `    --bg-body: ${settings.palette.bg};\n`;
                if (settings.fonts?.header) headInjections += `    --font-header: '${settings.fonts.header}', sans-serif;\n`;
                if (settings.fonts?.body) headInjections += `    --font-body: '${settings.fonts.body}', sans-serif;\n`;
                headInjections += `  }\n`;
                
                let bodyCss = [];
                if (settings.fonts?.body) bodyCss.push(`font-family: var(--font-body);`);
                if (settings.palette?.text) bodyCss.push(`color: var(--text-main);`);
                if (settings.palette?.bg) bodyCss.push(`background-color: var(--bg-body);`);
                if (bodyCss.length > 0) headInjections += `  body { ${bodyCss.join(' ')} }\n`;
                
                if (settings.fonts?.header) headInjections += `  h1, h2, h3, h4, h5, h6 { font-family: var(--font-header); }\n`;
                headInjections += `</style>\n`;
            }
            
            if (settings.fonts?.header || settings.fonts?.body) {
                const headerFont = settings.fonts?.header ? settings.fonts.header.replace(/ /g, '+') : '';
                const bodyFont = settings.fonts?.body ? settings.fonts.body.replace(/ /g, '+') : '';
                let families = [];
                if (headerFont) families.push(`family=${headerFont}`);
                if (bodyFont && bodyFont !== headerFont) families.push(`family=${bodyFont}`);
                if (families.length > 0) {
                    headInjections += `<link href="https://fonts.googleapis.com/css2?${families.join('&')}&display=swap" rel="stylesheet">\n`;
                }
            }
            headInjections += `<!-- GLOBAL_STYLES_END -->\n`;
            
            html = html.replace(/<!-- GLOBAL_STYLES_START -->[\s\S]*?<!-- GLOBAL_STYLES_END -->/g, '');
            html = html.replace('</head>', headInjections + '</head>');
 
            const trackScript = '<script src="/js/meloddy-track.js"></script>';
            if (html.includes('</body>')) {
                html = html.replace('</body>', trackScript + '</body>');
            } else {
                html += trackScript;
            }
            return res.send(html);
        }
    }
    
    // Serve SEO Robots.txt dynamically
    if (req.path.endsWith('robots.txt')) {
        const siteId = req.path.split('/')[1];
        const robotsPath = path.join(__dirname, 'site', siteId, 'robots.txt');
        if (fs.existsSync(robotsPath)) return res.sendFile(robotsPath);
        return res.type('text/plain').send('User-agent: *\nAllow: /');
    }

    // Serve Sitemap.xml dynamically
    if (req.path.endsWith('sitemap.xml')) {
        const siteId = req.path.split('/')[1];
        const siteDir = path.join(__dirname, 'site', siteId);
        if (fs.existsSync(siteDir)) {
            try {
                const files = fs.readdirSync(siteDir).filter(f => f.endsWith('.html') && !f.includes('.draft.'));
                const settings = await readJsonObj(SITE_SETTINGS_FILE);
                const platformConfig = await readJsonObj(PLATFORM_CONFIG_FILE);
                const domain = settings[siteId]?.domain || `${platformConfig.platformUrl}/real-site/${siteId}`;
                
                let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
                files.forEach(f => {
                    const url = f === 'index.html' ? domain : `${domain}/${f}`;
                    xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </url>\n`;
                });
                xml += '</urlset>';
                return res.type('application/xml').send(xml);
            } catch (e) {
                // Ignore error and proceed
            }
        }
    }

    next();
}, express.static(path.join(__dirname, 'site')));

// Auto backup runner
const runAutoBackups = async () => {
    try {
        const settings = await readJsonObj(SITE_SETTINGS_FILE);
        const users = await readJson(USERS_FILE);
        const now = new Date();
        let updated = false;
        
        for (const siteId in settings) {
            const owner = users.find(u => u.sites && u.sites.includes(siteId));
            if (owner && owner.plan === 'free') {
                continue;
            }
            
            const siteSettings = settings[siteId];
            if (siteSettings.backupEnabled) {
                const freq = siteSettings.backupFrequency || 'daily';
                const lastBackup = siteSettings.lastBackup ? new Date(siteSettings.lastBackup) : null;
                
                let shouldBackup = false;
                if (!lastBackup) {
                    shouldBackup = true;
                } else {
                    const diffHours = (now - lastBackup) / (1000 * 60 * 60);
                    if (freq === 'daily' && diffHours >= 24) shouldBackup = true;
                    if (freq === 'weekly' && diffHours >= 24 * 7) shouldBackup = true;
                    if (freq === 'monthly' && diffHours >= 24 * 30) shouldBackup = true;
                }
                
                if (shouldBackup) {
                    console.log(`Running auto backup for ${siteId}...`);
                    const result = await createBackup(siteId);
                    if (result.success) {
                        siteSettings.lastBackup = now.toISOString();
                        settings[siteId] = siteSettings;
                        updated = true;
                    }
                }
            }
        }
        
        if (updated) {
            await writeJson(SITE_SETTINGS_FILE, settings);
        }
    } catch (e) {
        console.error('Failed to run auto backups:', e);
    }
};

// Auto backup schedule (every hour)
setInterval(runAutoBackups, 1000 * 60 * 60);

// Purge Trash bin schedule (every 12 hours)
setInterval(purgeTrashBin, 1000 * 60 * 60 * 12);

// Single Page Application Frontend fallback routing
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Telegram bots and pollers
telegramService.initAllBotPollers()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to start server and bot polling:', err);
    });
