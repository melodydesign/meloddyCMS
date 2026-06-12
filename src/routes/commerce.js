const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { checkAuth } = require('../middleware/auth');
const { checkSiteAccess, readJsonObj } = require('../utils/db');

// Helper to download external image with max 5MB size limit
async function downloadExternalImage(url, siteId) {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') return resolve(url);
        
        // Only download http/https URLs
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return resolve(url);
        }
        
        // Skip local server URLs
        if (url.includes('/real-site/')) {
            return resolve(url);
        }
        
        const client = url.startsWith('https') ? https : http;
        
        const request = client.get(url, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Failed to download image ${url}: status code ${res.statusCode}`);
                return resolve(url);
            }
            
            // Check content-length header
            const contentLength = parseInt(res.headers['content-length']);
            const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
            if (contentLength && contentLength > maxSizeBytes) {
                console.error(`Image download cancelled: size ${contentLength} bytes exceeds 5MB limit`);
                return resolve(url);
            }
            
            // Guess extension
            let ext = 'jpg';
            const contentType = res.headers['content-type'];
            if (contentType) {
                if (contentType.includes('image/png')) ext = 'png';
                else if (contentType.includes('image/gif')) ext = 'gif';
                else if (contentType.includes('image/webp')) ext = 'webp';
                else if (contentType.includes('image/svg')) ext = 'svg';
                else if (contentType.includes('image/jpeg')) ext = 'jpg';
            }
            
            // Generate unique name using hash
            const hash = crypto.createHash('md5').update(url).digest('hex');
            const filename = `downloaded_${hash}.${ext}`;
            
            const targetDir = path.join(__dirname, '..', '..', 'site', siteId, 'images');
            ensureDirExists(targetDir);
            
            const filePath = path.join(targetDir, filename);
            const fileStream = fs.createWriteStream(filePath);
            
            let downloadedBytes = 0;
            let limitExceeded = false;
            
            res.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                if (downloadedBytes > maxSizeBytes) {
                    limitExceeded = true;
                    request.destroy(); // Cancel request
                    fileStream.destroy();
                    fs.unlink(filePath, () => {}); // Delete partial file
                }
            });
            
            res.pipe(fileStream);
            
            fileStream.on('finish', () => {
                fileStream.close();
                if (limitExceeded) {
                    console.error(`Image download cancelled: real size exceeded 5MB limit`);
                    resolve(url);
                } else {
                    resolve(`images/${filename}`);
                }
            });
            
            fileStream.on('error', (err) => {
                console.error('File stream error:', err);
                resolve(url);
            });
        });
        
        request.on('error', (err) => {
            console.error('Download request error:', err);
            resolve(url);
        });
    });
}

const CATEGORIES_DIR = path.join(__dirname, '..', '..', 'data', 'categories');
const SCHEMAS_DIR = path.join(__dirname, '..', '..', 'data', 'content-schemas');
const PRODUCTS_DIR = path.join(__dirname, '..', '..', 'data', 'products');
const ORDERS_DIR = path.join(__dirname, '..', '..', 'data', 'orders');
const SITE_SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'site-settings.json');
const PLATFORM_CONFIG_FILE = path.join(__dirname, '..', '..', 'data', 'platform-config.json');

// Helper to ensure directory exists
function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Helper to read site JSON file
function readSiteData(dir, siteId, defaultValue = []) {
    const filePath = path.join(dir, `${siteId}.json`);
    try {
        if (!fs.existsSync(filePath)) {
            return defaultValue;
        }
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        return defaultValue;
    }
}

// Helper to write site JSON file safely
function writeSiteData(dir, siteId, data) {
    ensureDirExists(dir);
    const filePath = path.join(dir, `${siteId}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err);
        return false;
    }
}

// Translit helper for slug generation
function generateSlug(text) {
    const cyrillicToLatin = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
        'я': 'ya'
    };
    return text.toLowerCase()
        .split('')
        .map(char => cyrillicToLatin[char] !== undefined ? cyrillicToLatin[char] : char)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

// Category tree calculations
function getCategoryDepth(categories, categoryId) {
    let depth = 1;
    let current = categories.find(c => c.id === categoryId);
    while (current && current.parentId) {
        depth++;
        current = categories.find(c => c.id === current.parentId);
    }
    return depth;
}

function getSubtreeHeight(categories, parentId) {
    const children = categories.filter(c => c.parentId === parentId);
    if (children.length === 0) return 1;
    let maxHeight = 0;
    children.forEach(child => {
        const h = getSubtreeHeight(categories, child.id);
        if (h > maxHeight) maxHeight = h;
    });
    return maxHeight + 1;
}

function hasCycle(categories, id, newParentId) {
    if (id === newParentId) return true;
    let current = categories.find(c => c.id === newParentId);
    while (current) {
        if (current.id === id) return true;
        current = categories.find(c => c.id === current.parentId);
    }
    return false;
}

// ----------------------------------------------------
// 1. CATEGORIES API
// ----------------------------------------------------

router.get('/api/commerce/:siteId/categories', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    const categories = readSiteData(CATEGORIES_DIR, siteId, []);
    res.json(categories);
});

// Public categories API for storefront
router.get('/api/commerce/:siteId/public/categories', async (req, res) => {
    const siteId = req.params.siteId;
    
    // Validate site settings exist
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const siteSet = siteSettingsAll[siteId];
    if (!siteSet) return res.status(404).json({ error: 'Сайт не найден' });
    
    const categories = readSiteData(CATEGORIES_DIR, siteId, []);
    res.json(categories);
});

router.post('/api/commerce/:siteId/categories', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { name, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Название категории обязательно' });
    
    const categories = readSiteData(CATEGORIES_DIR, siteId, []);
    
    if (parentId) {
        const parent = categories.find(c => c.id === parentId);
        if (!parent) return res.status(400).json({ error: 'Родительская категория не найдена' });
        
        const parentDepth = getCategoryDepth(categories, parentId);
        if (parentDepth + 1 > 3) {
            return res.status(400).json({ error: 'Превышена максимальная глубина вложенности (3 уровня)' });
        }
    }
    
    const newCategory = {
        id: 'cat_' + Math.random().toString(36).substring(2, 9),
        name,
        parentId: parentId || null,
        sortOrder: categories.length
    };
    
    categories.push(newCategory);
    writeSiteData(CATEGORIES_DIR, siteId, categories);
    
    res.status(201).json(newCategory);
});

router.put('/api/commerce/:siteId/categories/:id', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const catId = req.params.id;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { name, parentId, sortOrder } = req.body;
    const categories = readSiteData(CATEGORIES_DIR, siteId, []);
    const cat = categories.find(c => c.id === catId);
    
    if (!cat) return res.status(404).json({ error: 'Категория не найдена' });
    
    if (name) cat.name = name;
    if (sortOrder !== undefined) cat.sortOrder = parseInt(sortOrder) || 0;
    
    if (parentId !== undefined) {
        const targetParentId = parentId || null;
        if (targetParentId !== cat.parentId) {
            if (targetParentId) {
                if (hasCycle(categories, catId, targetParentId)) {
                    return res.status(400).json({ error: 'Невозможно переместить категорию внутрь себя или своих потомков' });
                }
                const parentDepth = getCategoryDepth(categories, targetParentId);
                const subtreeHeight = getSubtreeHeight(categories, catId);
                if (parentDepth + subtreeHeight > 3) {
                    return res.status(400).json({ error: 'Превышена максимальная глубина вложенности (3 уровня)' });
                }
            }
            cat.parentId = targetParentId;
        }
    }
    
    writeSiteData(CATEGORIES_DIR, siteId, categories);
    res.json(cat);
});

router.delete('/api/commerce/:siteId/categories/:id', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const catId = req.params.id;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    let categories = readSiteData(CATEGORIES_DIR, siteId, []);
    const cat = categories.find(c => c.id === catId);
    if (!cat) return res.status(404).json({ error: 'Категория не найдена' });
    
    // Move child categories to deleted category's parent (or root)
    categories.forEach(c => {
        if (c.parentId === catId) {
            c.parentId = cat.parentId;
        }
    });
    
    categories = categories.filter(c => c.id !== catId);
    writeSiteData(CATEGORIES_DIR, siteId, categories);
    
    // Remove deleted category from all products for this site
    const products = readSiteData(PRODUCTS_DIR, siteId, []);
    let productsUpdated = false;
    products.forEach(p => {
        if (p.categories && p.categories.includes(catId)) {
            p.categories = p.categories.filter(id => id !== catId);
            productsUpdated = true;
        }
    });
    if (productsUpdated) {
        writeSiteData(PRODUCTS_DIR, siteId, products);
    }
    
    res.json({ success: true, message: 'Категория удалена и очищена из товаров' });
});

// ----------------------------------------------------
// 2. SCHEMAS API
// ----------------------------------------------------

router.get('/api/commerce/:siteId/schemas', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    const schemas = readSiteData(SCHEMAS_DIR, siteId, { groups: [] });
    res.json(schemas);
});

router.post('/api/commerce/:siteId/schemas/groups', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Название группы обязательно' });
    
    const schemas = readSiteData(SCHEMAS_DIR, siteId, { groups: [] });
    const newGroup = {
        id: 'group_' + Math.random().toString(36).substring(2, 9),
        name,
        fields: []
    };
    
    schemas.groups.push(newGroup);
    writeSiteData(SCHEMAS_DIR, siteId, schemas);
    res.status(201).json(newGroup);
});

router.put('/api/commerce/:siteId/schemas/groups/:groupId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const groupId = req.params.groupId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { name } = req.body;
    const schemas = readSiteData(SCHEMAS_DIR, siteId, { groups: [] });
    const group = schemas.groups.find(g => g.id === groupId);
    if (!group) return res.status(404).json({ error: 'Группа не найдена' });
    
    if (name) group.name = name;
    writeSiteData(SCHEMAS_DIR, siteId, schemas);
    res.json(group);
});

router.delete('/api/commerce/:siteId/schemas/groups/:groupId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const groupId = req.params.groupId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const schemas = readSiteData(SCHEMAS_DIR, siteId, { groups: [] });
    schemas.groups = schemas.groups.filter(g => g.id !== groupId);
    writeSiteData(SCHEMAS_DIR, siteId, schemas);
    res.json({ success: true, message: 'Группа полей удалена' });
});

router.post('/api/commerce/:siteId/schemas/groups/:groupId/fields', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const groupId = req.params.groupId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { name, type, options } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Название и тип поля обязательны' });
    
    const schemas = readSiteData(SCHEMAS_DIR, siteId, { groups: [] });
    const group = schemas.groups.find(g => g.id === groupId);
    if (!group) return res.status(404).json({ error: 'Группа не найдена' });
    
    const newField = {
        id: 'field_' + Math.random().toString(36).substring(2, 9),
        name,
        type, // text, number, select, boolean
        options: options || [] // array of strings (for select type)
    };
    
    group.fields.push(newField);
    writeSiteData(SCHEMAS_DIR, siteId, schemas);
    res.status(201).json(newField);
});

router.put('/api/commerce/:siteId/schemas/groups/:groupId/fields/:fieldId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const groupId = req.params.groupId;
    const fieldId = req.params.fieldId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { name, type, options } = req.body;
    const schemas = readSiteData(SCHEMAS_DIR, siteId, { groups: [] });
    const group = schemas.groups.find(g => g.id === groupId);
    if (!group) return res.status(404).json({ error: 'Группа не найдена' });
    
    const field = group.fields.find(f => f.id === fieldId);
    if (!field) return res.status(404).json({ error: 'Поле не найдено' });
    
    if (name) field.name = name;
    if (type) field.type = type;
    if (options) field.options = options;
    
    writeSiteData(SCHEMAS_DIR, siteId, schemas);
    res.json(field);
});

router.delete('/api/commerce/:siteId/schemas/groups/:groupId/fields/:fieldId', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const groupId = req.params.groupId;
    const fieldId = req.params.fieldId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const schemas = readSiteData(SCHEMAS_DIR, siteId, { groups: [] });
    const group = schemas.groups.find(g => g.id === groupId);
    if (!group) return res.status(404).json({ error: 'Группа не найдена' });
    
    group.fields = group.fields.filter(f => f.id !== fieldId);
    writeSiteData(SCHEMAS_DIR, siteId, schemas);
    res.json({ success: true, message: 'Поле удалено' });
});

// ----------------------------------------------------
// 3. PRODUCTS API
// ----------------------------------------------------

// Public GET route for storefront
router.get('/api/commerce/:siteId/public/products', async (req, res) => {
    const siteId = req.params.siteId;
    
    // Validate site settings exist
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const siteSet = siteSettingsAll[siteId];
    if (!siteSet) return res.status(404).json({ error: 'Сайт не найден' });
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const minPrice = parseFloat(req.query.minPrice);
    const maxPrice = parseFloat(req.query.maxPrice);
    
    let products = readSiteData(PRODUCTS_DIR, siteId, []);
    
    // Only return active products to public
    products = products.filter(p => p.status === 'active');
    
    // Filter
    if (search) {
        const lowerSearch = search.toLowerCase();
        products = products.filter(p => 
            p.name.toLowerCase().includes(lowerSearch) || 
            (p.sku && p.sku.toLowerCase().includes(lowerSearch))
        );
    }
    
    // Filter by category (ID, Name, or Slug)
    if (category) {
        const categoriesList = readSiteData(CATEGORIES_DIR, siteId, []);
        const targetCat = categoriesList.find(c => 
            c.id === category || 
            c.name.toLowerCase() === category.toLowerCase() || 
            generateSlug(c.name) === category.toLowerCase()
        );
        
        products = products.filter(p => {
            if (!p.categories) return false;
            if (p.categories.includes(category)) return true;
            if (targetCat) {
                if (p.categories.includes(targetCat.id)) return true;
                
                return p.categories.some(pc => {
                    const lowerPc = pc.toLowerCase();
                    return lowerPc === targetCat.name.toLowerCase() || 
                           lowerPc === generateSlug(targetCat.name) || 
                           lowerPc === targetCat.id;
                });
            }
            return false;
        });
    }
    
    // Filter by price
    if (!isNaN(minPrice)) {
        products = products.filter(p => p.price >= minPrice);
    }
    if (!isNaN(maxPrice)) {
        products = products.filter(p => p.price <= maxPrice);
    }
    
    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = products.slice((page - 1) * limit, page * limit);
    
    res.json({
        products: paginated,
        total,
        page,
        totalPages
    });
});

router.get('/api/commerce/:siteId/products', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';
    const type = req.query.type || '';
    const minPrice = parseFloat(req.query.minPrice);
    const maxPrice = parseFloat(req.query.maxPrice);
    
    let products = readSiteData(PRODUCTS_DIR, siteId, []);
    
    // Filter
    if (search) {
        const lowerSearch = search.toLowerCase();
        products = products.filter(p => 
            p.name.toLowerCase().includes(lowerSearch) || 
            (p.sku && p.sku.toLowerCase().includes(lowerSearch))
        );
    }
    
    // Filter by category (ID, Name, or Slug)
    if (category) {
        const categoriesList = readSiteData(CATEGORIES_DIR, siteId, []);
        const targetCat = categoriesList.find(c => 
            c.id === category || 
            c.name.toLowerCase() === category.toLowerCase() || 
            generateSlug(c.name) === category.toLowerCase()
        );
        
        products = products.filter(p => {
            if (!p.categories) return false;
            if (p.categories.includes(category)) return true;
            if (targetCat) {
                if (p.categories.includes(targetCat.id)) return true;
                
                return p.categories.some(pc => {
                    const lowerPc = pc.toLowerCase();
                    return lowerPc === targetCat.name.toLowerCase() || 
                           lowerPc === generateSlug(targetCat.name) || 
                           lowerPc === targetCat.id;
                });
            }
            return false;
        });
    }
    
    // Filter by price
    if (!isNaN(minPrice)) {
        products = products.filter(p => p.price >= minPrice);
    }
    if (!isNaN(maxPrice)) {
        products = products.filter(p => p.price <= maxPrice);
    }
    
    if (status) {
        products = products.filter(p => p.status === status);
    }
    if (type) {
        products = products.filter(p => p.type === type);
    }
    
    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = products.slice((page - 1) * limit, page * limit);
    
    res.json({
        products: paginated,
        total,
        page,
        totalPages
    });
});

router.post('/api/commerce/:siteId/products', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { 
        name, sku, price, oldPrice, stock, status, 
        categories, tags, description, images, 
        customFields, seo, type, bundleItems, variants 
    } = req.body;
    
    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Название товара и цена обязательны' });
    }
    
    // Validate images limit
    if (images && images.length > 10) {
        return res.status(400).json({ error: 'Максимум 10 изображений на один товар' });
    }
    
    // Process external images (download them locally)
    let processedImages = [];
    if (images && images.length > 0) {
        processedImages = await Promise.all(images.map(img => downloadExternalImage(img, siteId)));
    }
    
    const products = readSiteData(PRODUCTS_DIR, siteId, []);
    
    // Check SKU uniqueness
    if (sku) {
        const dup = products.find(p => p.sku === sku);
        if (dup) return res.status(400).json({ error: 'Товар с таким артикулом уже существует' });
    }
    
    const newProduct = {
        id: 'prod_' + Math.random().toString(36).substring(2, 9),
        name,
        slug: generateSlug(name) + '-' + Math.floor(1000 + Math.random() * 9000),
        sku: sku || '',
        price: parseFloat(price) || 0,
        oldPrice: oldPrice ? parseFloat(oldPrice) : null,
        stock: stock !== undefined ? parseInt(stock) : 0,
        status: status || 'active',
        categories: categories || [],
        tags: tags || [],
        description: description || '',
        images: processedImages,
        customFields: customFields || {},
        seo: seo || { title: '', description: '', keywords: '' },
        type: type || 'product', // 'product' or 'bundle'
        bundleItems: bundleItems || [], // items linked in this bundle
        variants: variants || [], // linked variants config
        createdAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    writeSiteData(PRODUCTS_DIR, siteId, products);
    res.status(201).json(newProduct);
});

router.put('/api/commerce/:siteId/products/:id', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const prodId = req.params.id;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const products = readSiteData(PRODUCTS_DIR, siteId, []);
    const product = products.find(p => p.id === prodId);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    
    const { 
        name, sku, price, oldPrice, stock, status, 
        categories, tags, description, images, 
        customFields, seo, type, bundleItems, variants 
    } = req.body;
    
    // Validate images limit
    if (images && images.length > 10) {
        return res.status(400).json({ error: 'Максимум 10 изображений на один товар' });
    }
    
    // Process external images (download them locally)
    let processedImages = product.images || [];
    if (images) {
        processedImages = await Promise.all(images.map(img => downloadExternalImage(img, siteId)));
    }
    
    if (sku && sku !== product.sku) {
        const dup = products.find(p => p.sku === sku && p.id !== prodId);
        if (dup) return res.status(400).json({ error: 'Товар с таким артикулом уже существует' });
        product.sku = sku;
    }
    
    if (name) {
        product.name = name;
        product.slug = generateSlug(name) + '-' + prodId.split('_')[1];
    }
    if (price !== undefined) product.price = parseFloat(price) || 0;
    if (oldPrice !== undefined) product.oldPrice = oldPrice ? parseFloat(oldPrice) : null;
    if (stock !== undefined) product.stock = parseInt(stock) || 0;
    if (status) product.status = status;
    if (categories) product.categories = categories;
    if (tags) product.tags = tags;
    if (description !== undefined) product.description = description;
    if (images) product.images = processedImages;
    if (customFields) product.customFields = customFields;
    if (seo) product.seo = seo;
    if (type) product.type = type;
    if (bundleItems) product.bundleItems = bundleItems;
    if (variants) product.variants = variants;
    
    writeSiteData(PRODUCTS_DIR, siteId, products);
    res.json(product);
});

// Soft Delete (Move to Trash)
router.delete('/api/commerce/:siteId/products/:id', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const prodId = req.params.id;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const products = readSiteData(PRODUCTS_DIR, siteId, []);
    const product = products.find(p => p.id === prodId);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    
    // Save to Trash file
    const trashDir = path.join(PRODUCTS_DIR);
    ensureDirExists(trashDir);
    const trash = readSiteData(PRODUCTS_DIR, `${siteId}_trash`, []);
    
    product.deletedAt = new Date().toISOString();
    trash.push(product);
    
    writeSiteData(PRODUCTS_DIR, `${siteId}_trash`, trash);
    
    // Remove from main list
    const remaining = products.filter(p => p.id !== prodId);
    writeSiteData(PRODUCTS_DIR, siteId, remaining);
    
    res.json({ success: true, message: 'Товар перемещен в корзину' });
});

// GET Trash list
router.get('/api/commerce/:siteId/products-trash', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    const trash = readSiteData(PRODUCTS_DIR, `${siteId}_trash`, []);
    res.json(trash);
});

// Restore from Trash
router.post('/api/commerce/:siteId/products/:id/restore', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const prodId = req.params.id;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const trash = readSiteData(PRODUCTS_DIR, `${siteId}_trash`, []);
    const productIndex = trash.findIndex(p => p.id === prodId);
    if (productIndex === -1) return res.status(404).json({ error: 'Товар не найден в корзине' });
    
    const product = trash[productIndex];
    delete product.deletedAt;
    
    // Write back to main products list
    const products = readSiteData(PRODUCTS_DIR, siteId, []);
    products.push(product);
    writeSiteData(PRODUCTS_DIR, siteId, products);
    
    // Delete from trash
    trash.splice(productIndex, 1);
    writeSiteData(PRODUCTS_DIR, `${siteId}_trash`, trash);
    
    res.json({ success: true, message: 'Товар восстановлен' });
});

// Force permanent delete
router.delete('/api/commerce/:siteId/products/:id/force', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const prodId = req.params.id;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    let trash = readSiteData(PRODUCTS_DIR, `${siteId}_trash`, []);
    const exists = trash.find(p => p.id === prodId);
    if (!exists) return res.status(404).json({ error: 'Товар не найден в корзине' });
    
    trash = trash.filter(p => p.id !== prodId);
    writeSiteData(PRODUCTS_DIR, `${siteId}_trash`, trash);
    
    res.json({ success: true, message: 'Товар удален навсегда' });
});

// ----------------------------------------------------
// 4. ORDERS CRM
// ----------------------------------------------------

router.get('/api/commerce/:siteId/orders', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    const orders = readSiteData(ORDERS_DIR, siteId, []);
    res.json(orders);
});

// Public POST route for clients (NO checkAuth, site validation by settings)
router.post('/api/commerce/:siteId/orders', async (req, res) => {
    const siteId = req.params.siteId;
    
    // Validate site settings exist
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const siteSet = siteSettingsAll[siteId];
    if (!siteSet) return res.status(404).json({ error: 'Сайт не найден' });
    
    const { clientName, clientPhone, clientEmail, comment, items } = req.body;
    if (!clientName || !clientPhone || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'ФИО, Телефон и товары заказа обязательны' });
    }
    
    const orders = readSiteData(ORDERS_DIR, siteId, []);
    
    const orderNum = orders.length + 1;
    const orderId = `#ORD-${orderNum.toString().padStart(4, '0')}`;
    
    let totalPrice = 0;
    const formattedItems = items.map(item => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        totalPrice += price * qty;
        return {
            productId: item.productId,
            name: item.name || 'Товар',
            price,
            quantity: qty,
            image: item.image || ''
        };
    });
    
    const newOrder = {
        id: 'ord_' + Math.random().toString(36).substring(2, 9),
        orderId,
        clientName,
        clientPhone,
        clientEmail: clientEmail || '',
        comment: comment || '',
        items: formattedItems,
        totalPrice,
        status: 'new', // new, processing, completed, cancelled
        createdAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    writeSiteData(ORDERS_DIR, siteId, orders);
    
    // Deduct stock from products if active
    const products = readSiteData(PRODUCTS_DIR, siteId, []);
    items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p) {
            p.stock = Math.max(0, p.stock - (parseInt(item.quantity) || 1));
        }
    });
    writeSiteData(PRODUCTS_DIR, siteId, products);
    
    // Send Telegram notification
    if (siteSet.telegramChatId) {
        const msg = `🛒 *Новый заказ ${orderId}!*\n\n` +
                    `👤 Клиент: ${clientName}\n` +
                    `📞 Телефон: ${clientPhone}\n` +
                    `✉️ Email: ${clientEmail || '—'}\n` +
                    `💬 Комментарий: ${comment || '—'}\n\n` +
                    `📦 Товары:\n` +
                    formattedItems.map(item => `• ${item.name} x${item.quantity} (${item.price} ₽)`).join('\n') +
                    `\n\n💵 *Итого: ${totalPrice} ₽*`;
        try {
            const { sendTelegramMessage } = require('../services/telegram');
            const platformConfig = await readJsonObj(PLATFORM_CONFIG_FILE);
            const platformToken = platformConfig.botToken || '8903430408:AAGI-cSwQB724Q00y-LJlp_lhz-4dyOJUOo';
            sendTelegramMessage(siteSet.telegramChatId, msg, platformToken);
        } catch (err) {
            console.error('Failed to send telegram order notification:', err);
        }
    }
    
    res.status(201).json({ success: true, orderId: newOrder.orderId, order: newOrder });
});

router.put('/api/commerce/:siteId/orders/:id/status', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    const orderId = req.params.id;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { status } = req.body;
    const allowed = ['new', 'processing', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Неверный статус заказа' });
    
    const orders = readSiteData(ORDERS_DIR, siteId, []);
    const order = orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    
    order.status = status;
    writeSiteData(ORDERS_DIR, siteId, orders);
    res.json(order);
});

// ----------------------------------------------------
// 5. ANALYTICS API
// ----------------------------------------------------

router.get('/api/commerce/:siteId/analytics', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const orders = readSiteData(ORDERS_DIR, siteId, []);
    
    let totalRevenue = 0;
    let completedOrdersCount = 0;
    const productsSales = {};
    
    orders.forEach(order => {
        if (order.status === 'completed') {
            totalRevenue += order.totalPrice;
            completedOrdersCount++;
            
            // Product stats
            order.items.forEach(item => {
                if (!productsSales[item.productId]) {
                    productsSales[item.productId] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productsSales[item.productId].quantity += item.quantity;
                productsSales[item.productId].revenue += item.price * item.quantity;
            });
        }
    });
    
    const avgCheck = completedOrdersCount > 0 ? parseFloat((totalRevenue / completedOrdersCount).toFixed(2)) : 0;
    const totalOrdersCount = orders.length;
    const conversionRate = totalOrdersCount > 0 ? parseFloat(((completedOrdersCount / totalOrdersCount) * 100).toFixed(2)) : 0;
    
    // Sort top products
    const topProducts = Object.values(productsSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
        
    res.json({
        totalRevenue,
        completedOrdersCount,
        totalOrdersCount,
        avgCheck,
        conversionRate,
        topProducts
    });
});

// Reorder products in database
router.post('/api/commerce/:siteId/products/reorder', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: 'Неверный формат ID товаров' });
    }
    
    let products = readSiteData(PRODUCTS_DIR, siteId, []);
    
    // Position tracking to keep non-reordered products untouched
    const reorderSet = new Set(productIds);
    const positions = [];
    products.forEach((p, idx) => {
        if (reorderSet.has(p.id)) {
            positions.push(idx);
        }
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));
    const reorderedSublist = productIds
        .map(id => productMap.get(id))
        .filter(Boolean);
    
    positions.forEach((pos, idx) => {
        if (idx < reorderedSublist.length) {
            products[pos] = reorderedSublist[idx];
        }
    });
    
    writeSiteData(PRODUCTS_DIR, siteId, products);
    res.json({ success: true });
});

// Reorder and re-parent categories in database
router.post('/api/commerce/:siteId/categories/reorder', checkAuth, async (req, res) => {
    const siteId = req.params.siteId;
    if (!(await checkSiteAccess(req, siteId))) return res.status(403).json({ error: 'Доступ запрещен' });
    
    const { categoriesList } = req.body;
    if (!categoriesList || !Array.isArray(categoriesList)) {
        return res.status(400).json({ error: 'Неверный формат списка категорий' });
    }
    
    let categories = readSiteData(CATEGORIES_DIR, siteId, []);
    
    categoriesList.forEach(item => {
        const cat = categories.find(c => c.id === item.id);
        if (cat) {
            if (item.parentId !== undefined) cat.parentId = item.parentId || null;
            if (item.sortOrder !== undefined) cat.sortOrder = parseInt(item.sortOrder) || 0;
        }
    });
    
    writeSiteData(CATEGORIES_DIR, siteId, categories);
    res.json({ success: true });
});

router.helpers = {
    getCategoryDepth,
    getSubtreeHeight,
    hasCycle,
    generateSlug
};

module.exports = router;
