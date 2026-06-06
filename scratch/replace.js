const fs = require('fs');
const path = require('path');

function replaceColorsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // JS Logic specific
    content = content.replace(/tab\.style\.color = index === 0 \? '#ffffff' : 'rgba\(255, 255, 255, 0\.6\)';/g, 
        "tab.style.color = index === 0 ? 'var(--text-main)' : 'var(--text-muted)';");
    content = content.replace(/tab\.style\.color = '#ffffff';/g, "tab.style.color = 'var(--text-main)';");
    content = content.replace(/color:\s*(?:#ffffff|#fff|white)/gi, "color: var(--text-main)");
    
    // Background replacements
    content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[2345]\)/g, "background: var(--bg-hover)");
    content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/g, "background: var(--bg-active)");
    content = content.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.15\)/g, "background: var(--bg-card)");
    content = content.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.2\)/g, "background: var(--bg-card)");
    content = content.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.25\)/g, "background: var(--bg-card)");
    
    // Border replacements
    content = content.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)/g, "border: 1px solid var(--border)");
    content = content.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)/g, "border: 1px solid var(--border)");
    content = content.replace(/border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.1\)/g, "border-color: var(--border)");
    content = content.replace(/borderBottom:\s*'1px solid rgba\(255,255,255,0\.02\)'/g, "borderBottom: '1px solid var(--border)'");
    
    fs.writeFileSync(filePath, content, 'utf8');
}

replaceColorsInFile(path.join(__dirname, '../public/dashboard.html'));
replaceColorsInFile(path.join(__dirname, '../public/js/dashboard.js'));
console.log('Colors replaced');
