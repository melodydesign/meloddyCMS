const https = require('https');
const http = require('http');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { 
    readJsonObj, 
    writeJson, 
    PLATFORM_CONFIG_FILE, 
    SITE_SETTINGS_FILE, 
    ANALYTICS_FILE 
} = require('../utils/db');

// Proxy auto-rotator
let activeProxy = null;

const getWorkingProxy = (proxyList) => new Promise(resolve => {
    let resolved = false;
    let list = proxyList.sort(() => 0.5 - Math.random()).slice(0, 50);
    let pending = list.length;
    if (pending === 0) return resolve(null);

    list.forEach(proxy => {
        const agent = new HttpsProxyAgent(`http://${proxy}`);
        const req = https.get({ hostname: 'api.telegram.org', port: 443, path: '/', agent: agent, timeout: 3000 }, (res) => {
            if (!resolved) { resolved = true; resolve(proxy); }
            res.resume();
        }).on('error', () => {
            if (!resolved) { pending--; if (pending === 0) resolve(null); }
        }).on('timeout', () => req.destroy());
    });
    setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 3500);
});

const fetchNewProxy = () => new Promise(resolve => {
    https.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=500&country=all&ssl=yes&anonymity=elite', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', async () => {
            const list = d.split('\n').map(p => p.trim()).filter(p => p && /^\d{1,3}(\.\d{1,3}){3}:\d{1,5}$/.test(p));
            resolve(await getWorkingProxy(list));
        });
    }).on('error', () => resolve(null));
});

const getAgent = async () => {
    if (!activeProxy) {
        activeProxy = await fetchNewProxy();
        if (activeProxy) console.log('Telegram API proxy updated:', activeProxy);
    }
    return activeProxy ? new HttpsProxyAgent(`http://${activeProxy}`) : null;
};

const invalidateProxy = () => {
    activeProxy = null;
};

const botPollers = new Map(); // token -> { stop }
let defaultBotToken = '';
let defaultBotUsername = '';

// Временное хранилище кодов для подключения (код -> chatId)
const pendingConnections = new Map();

const getPlatformConfig = async () => {
    try {
        return await readJsonObj(PLATFORM_CONFIG_FILE);
    } catch (e) {
        return { botToken: '8903430408:AAGI-cSwQB724Q00y-LJlp_lhz-4dyOJUOo', platformUrl: 'https://meloddy-crm.ru' };
    }
};

const sendTelegramMessage = async (chatId, text, token, replyMarkup = null) => {
    const postDataObj = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    };
    if (replyMarkup) {
        postDataObj.reply_markup = replyMarkup;
    }
    const postData = JSON.stringify(postDataObj);
    
    const agent = await getAgent();
    const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        },
        agent: agent
    });
    req.on('error', (err) => {
        console.error('Failed to send Telegram message:', err.message);
        invalidateProxy();
    });
    req.setTimeout(10000, () => { req.destroy(); invalidateProxy(); });
    req.write(postData);
    req.end();
};

const sendTelegramAction = async (callbackQueryId, text, token) => {
    const postData = JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
    });
    const agent = await getAgent();
    const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/answerCallbackQuery`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        },
        agent: agent
    });
    req.on('error', () => invalidateProxy());
    req.setTimeout(10000, () => { req.destroy(); invalidateProxy(); });
    req.write(postData);
    req.end();
};

const linkChatToSite = async (botCode, chatId, token) => {
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    let foundSiteId = null;
    
    for (const [siteId, settings] of Object.entries(siteSettingsAll)) {
        if (settings.botCode === botCode) {
            foundSiteId = siteId;
            break;
        }
    }
    
    if (foundSiteId) {
        siteSettingsAll[foundSiteId].telegramChatId = chatId;
        await writeJson(SITE_SETTINGS_FILE, siteSettingsAll);
        
        sendTelegramMessage(
            chatId, 
            `✅ Бот успешно подключен к сайту *${siteSettingsAll[foundSiteId].displayName || foundSiteId}*!\n\nТеперь сюда будут приходить заявки с этого сайта.`, 
            token
        );
        console.log(`Linked chat ${chatId} to site ${foundSiteId} via bot`);
    }
};

const sendStatsToChat = async (chatId, token) => {
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const analyticsAll = await readJsonObj(ANALYTICS_FILE);
    
    let targetSiteId = null;
    let targetSiteName = '';
    
    for (const [siteId, settings] of Object.entries(siteSettingsAll)) {
        const siteToken = settings.telegramToken || defaultBotToken;
        if (settings.telegramChatId === chatId && siteToken === token) {
            targetSiteId = siteId;
            targetSiteName = settings.displayName || siteId;
            break;
        }
    }
    
    if (!targetSiteId) {
        return sendTelegramMessage(chatId, "❌ Бот не привязан к сайту. Используйте кнопку «➕ Подключить сайт».", token);
    }
    
    const stats = analyticsAll[targetSiteId] || { views: [], clicks: [], forms: [] };
    const platformConfig = await getPlatformConfig();
    const text = `📊 *Статистика для ${targetSiteName}*\n\n` +
                 `👁 Просмотры: ${stats.views.length}\n` +
                 `🖱 Клики: ${stats.clicks.length}\n` +
                 `📩 Заявки: ${stats.forms.length}\n\n` +
                 `🌐 [Открыть панель](${platformConfig.platformUrl})`;
                 
    sendTelegramMessage(chatId, text, token);
};

// Генерация кода подключения
const generateConnectionCode = (chatId, token) => {
    const code = Math.random().toString(36).substring(2, 8);
    pendingConnections.set(code, chatId);
    
    setTimeout(() => {
        if (pendingConnections.get(code) === chatId) {
            pendingConnections.delete(code);
        }
    }, 15 * 60 * 1000);
    
    const text = `Ваш код для подключения сайта:\n\n\`${code}\`\n\nСкопируйте его и вставьте в настройках вашего сайта (вкладка Настройки -> Уведомления в Telegram).`;
    const replyMarkup = {
        inline_keyboard: [[{ text: "⬅️ Назад", callback_data: "main_menu" }]]
    };
    sendTelegramMessage(chatId, text, token, replyMarkup);
};

// Список сайтов
const showSitesList = async (chatId, token) => {
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const connectedSites = [];
    
    for (const [siteId, settings] of Object.entries(siteSettingsAll)) {
        if (settings.telegramChatId === chatId) {
            connectedSites.push({ id: siteId, name: settings.displayName || siteId });
        }
    }
    
    if (connectedSites.length === 0) {
        const replyMarkup = {
            inline_keyboard: [[{ text: "⬅️ Назад", callback_data: "main_menu" }]]
        };
        return sendTelegramMessage(chatId, "У вас пока нет подключенных сайтов. Нажмите «➕ Подключить сайт», чтобы начать.", token, replyMarkup);
    }
    
    const inlineKeyboard = connectedSites.map(site => {
        return [{ text: site.name, callback_data: `site_${site.id}` }];
    });
    inlineKeyboard.push([{ text: "⬅️ Назад", callback_data: "main_menu" }]);
    
    sendTelegramMessage(chatId, "Ваши подключенные сайты:", token, { inline_keyboard: inlineKeyboard });
};

const showSiteMenu = async (chatId, siteId, token) => {
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const site = siteSettingsAll[siteId];
    if (!site || site.telegramChatId !== chatId) {
        return sendTelegramMessage(chatId, "Сайт не найден или отключен.", token);
    }
    
    const text = `Управление сайтом *${site.displayName || siteId}*`;
    const inlineKeyboard = [
        [{ text: "📊 Посмотреть статистику сайта", callback_data: `stats_${siteId}` }],
        [{ text: "📩 Посмотреть последние заявки", callback_data: `leads_${siteId}` }],
        [{ text: "❌ Отключить сайт", callback_data: `unlink_${siteId}` }],
        [{ text: "⬅️ Назад в список", callback_data: "back_to_sites" }]
    ];
    
    sendTelegramMessage(chatId, text, token, { inline_keyboard: inlineKeyboard });
};

const unlinkSite = async (chatId, siteId, token, callbackQueryId) => {
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    if (siteSettingsAll[siteId] && siteSettingsAll[siteId].telegramChatId === chatId) {
        siteSettingsAll[siteId].telegramChatId = null;
        await writeJson(SITE_SETTINGS_FILE, siteSettingsAll);
        
        sendTelegramMessage(chatId, `❌ Сайт *${siteSettingsAll[siteId].displayName || siteId}* успешно отключен.`, token);
    } else {
        sendTelegramMessage(chatId, "Сайт уже отключен или не найден.", token);
    }
    if (callbackQueryId) sendTelegramAction(callbackQueryId, "Сайт отключен", token);
};

const showLeads = async (chatId, siteId, token, callbackQueryId, offset = 0) => {
    const analyticsAll = await readJsonObj(ANALYTICS_FILE);
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const siteName = siteSettingsAll[siteId]?.displayName || siteId;
    
    const siteStats = analyticsAll[siteId] || { forms: [] };
    const leads = siteStats.forms || [];
    
    if (leads.length === 0) {
        const replyMarkup = {
            inline_keyboard: [[{ text: "⬅️ Назад в меню сайта", callback_data: `site_${siteId}` }]]
        };
        sendTelegramMessage(chatId, `На сайте *${siteName}* пока нет заявок.`, token, replyMarkup);
    } else {
        const sortedLeads = [...leads].reverse(); // новые сверху
        const currentLeads = sortedLeads.slice(offset, offset + 10);
        let text = `📩 *Заявки сайта ${siteName}* (показаны ${offset + 1}-${Math.min(offset + 10, sortedLeads.length)} из ${sortedLeads.length})\n\n`;
        
        currentLeads.forEach((lead, i) => {
            text += `*Заявка ${offset + i + 1}* (${new Date(lead.timestamp).toLocaleString('ru-RU')})\n`;
            if (lead.metadata && lead.metadata.data) {
                for (const [k, v] of Object.entries(lead.metadata.data)) {
                    text += `${k}: ${v}\n`;
                }
            }
            text += `\n`;
        });
        
        const replyMarkup = { inline_keyboard: [] };
        if (offset + 10 < sortedLeads.length) {
            replyMarkup.inline_keyboard.push([{ text: "⬇️ Показать еще", callback_data: `leads_${siteId}_${offset + 10}` }]);
        }
        replyMarkup.inline_keyboard.push([{ text: "⬅️ Назад в меню сайта", callback_data: `site_${siteId}` }]);
        
        sendTelegramMessage(chatId, text, token, replyMarkup);
    }
    
    if (callbackQueryId) sendTelegramAction(callbackQueryId, "Заявки загружены", token);
};

const showSiteStats = async (chatId, siteId, token, callbackQueryId) => {
    const fs = require('fs');
    const path = require('path');
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    const analyticsAll = await readJsonObj(ANALYTICS_FILE);
    
    const site = siteSettingsAll[siteId];
    if (!site || site.telegramChatId !== chatId) {
        return sendTelegramMessage(chatId, "Сайт не найден или отключен.", token);
    }
    
    const stats = analyticsAll[siteId] || { views: [], clicks: [], forms: [] };
    
    let orders = [];
    const ordersFilePath = path.join(__dirname, '..', '..', 'data', 'orders', `${siteId}.json`);
    try {
        if (fs.existsSync(ordersFilePath)) {
            orders = JSON.parse(fs.readFileSync(ordersFilePath, 'utf-8'));
        }
    } catch (e) {
        console.error('Failed to read orders for stats', e);
    }
    
    const totalOrdersCount = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed');
    const revenue = completedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    
    const platformConfig = await getPlatformConfig();
    const text = `📊 *Аналитика сайта: ${site.displayName || siteId}*\n\n` +
                 `👁 Посещения (просмотры): ${stats.views.length}\n` +
                 `🖱 Клики по элементам: ${stats.clicks.length}\n` +
                 `📩 Заявки с форм: ${stats.forms.length}\n\n` +
                 `🛒 *Заказы магазина:*\n` +
                 `• Всего заказов: ${totalOrdersCount}\n` +
                 `• Выполнено заказов: ${completedOrders.length}\n` +
                 `• Выручка (выполненные): ${revenue.toLocaleString('ru-RU')} ₽\n\n` +
                 `🌐 [Открыть панель управления](${platformConfig.platformUrl})`;
                 
    const inlineKeyboard = [
        [{ text: "⬅️ Назад в меню сайта", callback_data: `site_${siteId}` }]
    ];
    
    sendTelegramMessage(chatId, text, token, { inline_keyboard: inlineKeyboard });
    if (callbackQueryId) sendTelegramAction(callbackQueryId, "", token);
};

const handleCallbackQuery = (query, token) => {
    const data = query.data;
    const chatId = query.message.chat.id;
    const queryId = query.id;
    
    if (data === 'main_menu') {
        const replyMarkup = {
            keyboard: [
                [{ text: '➕ Подключить сайт' }],
                [{ text: '📋 Список сайтов' }]
            ],
            resize_keyboard: true
        };
        sendTelegramMessage(chatId, "Выберите действие в меню:", token, replyMarkup);
        sendTelegramAction(queryId, "", token);
    } else if (data === 'back_to_sites') {
        showSitesList(chatId, token);
        sendTelegramAction(queryId, "", token);
    } else if (data.startsWith('stats_')) {
        const siteId = data.substring(6);
        showSiteStats(chatId, siteId, token, queryId);
    } else if (data.startsWith('site_')) {
        const siteId = data.substring(5);
        showSiteMenu(chatId, siteId, token);
        sendTelegramAction(queryId, "", token);
    } else if (data.startsWith('unlink_')) {
        const siteId = data.substring(7);
        unlinkSite(chatId, siteId, token, queryId);
    } else if (data.startsWith('leads_')) {
        const payload = data.substring(6);
        const lastUnderscore = payload.lastIndexOf('_');
        let siteId = payload;
        let offset = 0;
        
        if (lastUnderscore !== -1 && !isNaN(payload.substring(lastUnderscore + 1))) {
            siteId = payload.substring(0, lastUnderscore);
            offset = parseInt(payload.substring(lastUnderscore + 1));
        }
        showLeads(chatId, siteId, token, queryId, offset);
    }
};

const processTextMessage = (text, chatId, token) => {
    const replyMarkup = {
        keyboard: [
            [{ text: '➕ Подключить сайт' }],
            [{ text: '📋 Список сайтов' }]
        ],
        resize_keyboard: true
    };
    
    if (text === '/start' || text === 'Главное меню') {
        sendTelegramMessage(chatId, "Добро пожаловать в бота meloddyCMS! Выберите действие:", token, replyMarkup);
    } else if (text === '➕ Подключить сайт') {
        generateConnectionCode(chatId, token);
    } else if (text === '📋 Список сайтов') {
        showSitesList(chatId, token);
    } else if (text.startsWith('/start ')) {
        const botCode = text.split(' ')[1];
        if (botCode) {
            linkChatToSite(botCode, chatId, token);
            sendTelegramMessage(chatId, "Вы можете управлять сайтами через меню.", token, replyMarkup);
        }
    } else if (text === '/stats') {
        sendStatsToChat(chatId, token);
    } else {
        sendTelegramMessage(chatId, "Используйте меню для управления.", token, replyMarkup);
    }
};

const startPollingForBot = async (token) => {
    if (!token || botPollers.has(token)) return;
    
    let offset = 0;
    let isPolling = true;
    
    const getBotInfo = async () => {
        const agent = await getAgent();
        const req = https.get({
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${token}/getMe`,
            agent: agent
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.ok) {
                        if (token === defaultBotToken) {
                            defaultBotUsername = json.result.username;
                        }
                        console.log(`Telegram Bot initialized: @${json.result.username}`);
                    }
                } catch (e) {}
            });
        }).on('error', (err) => {
            console.error('Failed to get bot info:', err.message);
            invalidateProxy();
        });
        req.setTimeout(10000, () => { req.destroy(); invalidateProxy(); });
    };
    
    await getBotInfo();

    const poll = async () => {
        if (!isPolling || !botPollers.has(token)) return;
        const agent = await getAgent();
        const req = https.get({
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${token}/getUpdates?offset=${offset}&timeout=5`,
            agent: agent
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let isValid = false;
                try {
                    const json = JSON.parse(data);
                    if (json.ok) {
                        isValid = true;
                        if (json.result.length > 0) {
                            for (const update of json.result) {
                                offset = update.update_id + 1;
                                
                                if (update.message && update.message.text) {
                                    processTextMessage(update.message.text, update.message.chat.id, token);
                                } else if (update.callback_query) {
                                    handleCallbackQuery(update.callback_query, token);
                                }
                            }
                        }
                    }
                } catch (e) {}
                
                if (!isValid) invalidateProxy();
                setTimeout(poll, 1000);
            });
        }).on('error', (err) => {
            invalidateProxy();
            setTimeout(poll, 3000);
        });
        req.setTimeout(15000, () => { req.destroy(); invalidateProxy(); });
    };
    
    botPollers.set(token, { stop: () => { isPolling = false; } });
    poll();
};

const stopPollingForBot = (token) => {
    if (botPollers.has(token)) {
        const poller = botPollers.get(token);
        if (poller.stop) poller.stop();
        else clearInterval(poller.interval);
        botPollers.delete(token);
        console.log(`Stopped polling for bot: ${token.substring(0, 10)}...`);
    }
};

const initAllBotPollers = async () => {
    const config = await getPlatformConfig();
    defaultBotToken = config.botToken;
    
    startPollingForBot(defaultBotToken);
    
    const siteSettingsAll = await readJsonObj(SITE_SETTINGS_FILE);
    for (const settings of Object.values(siteSettingsAll)) {
        if (settings.telegramToken) {
            startPollingForBot(settings.telegramToken);
        }
    }
};

module.exports = {
    initAllBotPollers,
    startPollingForBot,
    stopPollingForBot,
    sendTelegramMessage,
    pendingConnections,
    getDefaultBotUsername: () => defaultBotUsername,
    updateDefaultToken: (newToken) => {
        if (newToken && newToken !== defaultBotToken) {
            stopPollingForBot(defaultBotToken);
            defaultBotToken = newToken;
            startPollingForBot(defaultBotToken);
        }
    }
};
