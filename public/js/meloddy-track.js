(function() {
    if (window.__meloddy_tracked) return;
    window.__meloddy_tracked = true;
    
    // Analytics tracking script for meloddyCMS
    const siteId = window.location.pathname.split('/')[2]; // Assuming /real-site/SITE_ID/...
    if (!siteId) return;

    const getDeviceType = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile";
        return "Desktop";
    };

    const getBrowser = () => {
        const ua = navigator.userAgent;
        if (ua.includes("YaBrowser")) return "Yandex Browser";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("SamsungBrowser")) return "Samsung Browser";
        if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
        if (ua.includes("Trident")) return "Internet Explorer";
        if (ua.includes("Edge")) return "Edge";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Safari")) return "Safari";
        return "Unknown";
    };

    const getOS = () => {
        const ua = navigator.userAgent;
        if (ua.includes("Windows")) return "Windows";
        if (ua.includes("Mac OS")) return "Mac OS";
        if (ua.includes("Android")) return "Android";
        if (ua.includes("Linux")) return "Linux";
        if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
        return "Unknown";
    };

    const track = async (type, metadata = {}) => {
        console.log('Tracking event:', type, metadata);
        try {
            const res = await fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteId,
                    type,
                    path: window.location.pathname,
                    metadata: {
                        ...metadata,
                        browser: getBrowser(),
                        os: getOS(),
                        device: getDeviceType()
                    }
                })
            });
            console.log('Track response status:', res.status);
        } catch (e) {
            console.error('Track error:', e);
        }
    };

    // Track Page View
    track('view');

    // Track Clicks
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button, .btn, [data-track]');
        if (target) {
            track('click', {
                text: target.innerText.substring(0, 50).trim(),
                id: target.id,
                class: target.className,
                href: target.href
            });
        }
    }, true);

    document.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Form submit intercepted!');
        const form = e.target;
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            // Don't track passwords or long fields
            if (key.toLowerCase().includes('pass') || value.length > 100) return;
            data[key] = value;
        });
        
        console.log('Collected form data:', data);
        
        track('form', {
            formId: form.id || form.name || 'unnamed_form',
            data: data
        });
    }, true);

    console.log('meloddyCMS tracking active for', siteId);
})();
