const fs = require('fs');
const path = require('path');

function fixColorsAndJS() {
    let filePath = path.join(__dirname, '../public/js/dashboard.js');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace JS assignments of rgba colors
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.08\)'/g, "'var(--bg-active)'");
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.04\)'/g, "'var(--bg-hover)'");
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "'var(--bg-hover)'");
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.02\)'/g, "'var(--bg-hover)'");
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.03\)'/g, "'var(--bg-hover)'");
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.01\)'/g, "'transparent'");
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.1\)'/g, "'var(--border)'");
    content = content.replace(/'rgba\(255,\s*255,\s*255,\s*0\.6\)'/g, "'var(--text-muted)'");
    
    // Replace CSS-like strings that were missed (like inside HTML strings)
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, "var(--bg-active)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.04\)/g, "var(--bg-hover)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, "var(--bg-hover)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.02\)/g, "var(--bg-hover)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, "var(--bg-hover)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.01\)/g, "transparent");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, "var(--border)");
    content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.6\)/g, "var(--text-muted)");
    
    fs.writeFileSync(filePath, content, 'utf8');
}

fixColorsAndJS();
console.log('Fixed missed colors');
