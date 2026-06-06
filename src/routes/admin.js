const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const { readJson, readJsonObj, writeJson, USERS_FILE, SITES_FILE, SITE_SETTINGS_FILE } = require('../utils/db');
const HISTORY_FILE = path.join(__dirname, '..', '..', 'data', 'logs', 'history.json');
const SITE_DIR = path.resolve(__dirname, '..', '..', 'site');

const requireAdmin = async (req, res, next) => {
    try {
        const users = await readJson(USERS_FILE);
        const user = users.find(u => u.id === req.user.id);
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

router.get('/api/admin/users', checkAuth, requireAdmin, async (req, res) => {
    try {
        const users = await readJson(USERS_FILE);
        const safeUsers = users.map(u => {
            const { password, ...safeUser } = u;
            return safeUser;
        });
        res.json(safeUsers);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/api/admin/sites', checkAuth, requireAdmin, async (req, res) => {
    try {
        const settings = await readJsonObj(SITE_SETTINGS_FILE);
        const users = await readJson(USERS_FILE);
        
        // Collect all unique site IDs from users and settings
        const allSiteIds = new Set();
        Object.keys(settings).forEach(id => allSiteIds.add(id));
        users.forEach(u => {
            if (u.sites && Array.isArray(u.sites)) {
                u.sites.forEach(id => allSiteIds.add(id));
            }
        });
        
        const enhancedSites = Array.from(allSiteIds)
            .filter(id => id && id !== 'undefined' && id !== 'null')
            .map(id => {
            const siteSettings = settings[id] || {};
            const owner = users.find(u => u.sites && u.sites.includes(id));
            return {
                id,
                domain: siteSettings.domain || null,
                isTemplate: siteSettings.isTemplate || false,
                isActive: siteSettings.isActive !== false,
                templateName: siteSettings.templateName || null,
                ownerId: owner ? owner.id : null,
                ownerName: owner ? (owner.name || owner.username) : 'Unknown',
                developerAccess: siteSettings.developerAccess || null
            };
        });
        
        res.json(enhancedSites);
    } catch (err) {
        console.error('Error fetching sites:', err);
        res.status(500).json({ error: 'Failed to fetch sites' });
    }
});

router.post('/api/admin/users/:id/action', checkAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, sitesLimit } = req.body; 
        
        const users = await readJson(USERS_FILE);
        const userIndex = users.findIndex(u => u.id == id);
        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
        
        if (action === 'grant_beta') {
            users[userIndex].plan = 'beta';
        } else if (action === 'revoke_beta') {
            users[userIndex].plan = 'free';
        } else if (action === 'update_limit') {
            if (!sitesLimit || isNaN(sitesLimit) || sitesLimit < 1) {
                return res.status(400).json({ error: 'Invalid limit value' });
            }
            users[userIndex].sitesLimit = parseInt(sitesLimit, 10);
        } else if (action === 'delete') {
            if (users[userIndex].role === 'admin') {
                return res.status(403).json({ error: 'Cannot delete admin' });
            }
            users.splice(userIndex, 1);
        } else {
            return res.status(400).json({ error: 'Unknown action' });
        }
        
        await writeJson(USERS_FILE, users);
        res.json({ success: true, message: 'Action completed' });
    } catch (err) {
        console.error('Error in admin action:', err);
        res.status(500).json({ error: 'Action failed' });
    }
});

router.get('/api/admin/users/:id/details', checkAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const users = await readJson(USERS_FILE);
        const user = users.find(u => u.id == id);
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const { password, ...safeUser } = user;
        
        const settings = await readJsonObj(SITE_SETTINGS_FILE);
        const userSites = (user.sites || []).map(siteId => {
            const siteSettings = settings[siteId] || {};
            return {
                id: siteId,
                domain: siteSettings.domain || null,
                isTemplate: siteSettings.isTemplate || false
            };
        });
        
        let userActivity = [];
        try {
            const history = await readJson(HISTORY_FILE);
            userActivity = history.filter(h => h.userId == id)
                                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                  .slice(0, 20);
        } catch(e) {}
        
        res.json({ user: safeUser, sites: userSites, activity: userActivity });
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ error: 'Failed to fetch details' });
    }
});


router.post('/api/admin/sites/:id/toggle-status', checkAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const settings = await readJsonObj(SITE_SETTINGS_FILE);
        
        if (!settings[id]) {
            settings[id] = {};
        }
        
        // Toggle the active status (default true)
        const currentStatus = settings[id].isActive !== false;
        settings[id].isActive = !currentStatus;
        
        await writeJson(SITE_SETTINGS_FILE, settings);
        res.json({ success: true, isActive: settings[id].isActive });
    } catch (err) {
        console.error('Error toggling site status:', err);
        res.status(500).json({ error: 'Failed to toggle status' });
    }
});

module.exports = router;
