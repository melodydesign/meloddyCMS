const fs = require('fs');
const path = require('path');

const publicDir = 'public';
const cssFile = path.join(publicDir, 'css', 'style.css');

// 1. Fix mobile logo alignment
let css = fs.readFileSync(cssFile, 'utf8');
css = css.replace(
    /\.sidebar\.open \.sidebar-logo\s*{\s*width:\s*100%;\s*}/,
    '.sidebar.open .sidebar-logo {\n        width: 100%;\n        justify-content: center;\n    }'
);
fs.writeFileSync(cssFile, css, 'utf8');

// 2. Fix min-width in docs.html and logo meloddy CMS
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
    const filePath = path.join(publicDir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    
    // Fix padding issue in cards
    html = html.replace(/min-width:\s*300px;/g, 'min-width: 0; flex-basis: 300px;');
    
    // Fix meloddy CMS spacing
    html = html.replace(/meloddy\s+CMS/g, 'meloddyCMS');
    html = html.replace(/<span>meloddy<\/span>\s*<span/g, '<span>meloddy<span');
    
    // Ensure logo doesn't have an empty gap where there should be none
    html = html.replace(/>meloddy\s*<span/g, '>meloddy<span');

    fs.writeFileSync(filePath, html, 'utf8');
}

