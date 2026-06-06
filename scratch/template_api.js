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
        if (!user || user.role !== 'developer' || !user.developerCode) {
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
        
        if (user.role !== 'developer') return res.status(403).json({ error: 'Нет доступа' });
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
