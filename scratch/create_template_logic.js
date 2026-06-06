
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
        const currentUser = usersList.find(u => u.id === req.user.id);
        
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
