const fs = require('fs');
const path = require('path');

const dir = 'public';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // The profile link block looks something like:
    // <a href="/profile.html" class="nav-item">
    //     <svg ...></svg>
    //     <span class="nav-text">Профиль</span>
    // </a>
    const profileRegex = /<a\s+href="\/profile\.html"[\s\S]*?<\/a>/g;
    
    if (profileRegex.test(content)) {
        content = content.replace(profileRegex, '');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Removed profile link from ${file}`);
    }
}
