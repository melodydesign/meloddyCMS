$js = Get-Content public\js\dashboard.js -Raw -Encoding UTF8

$appendJs = @"

// --- Templates Logic ---
const uploadTemplateModal = document.getElementById('uploadTemplateModal');
document.getElementById('openUploadTemplateBtn')?.addEventListener('click', () => {
    if(uploadTemplateModal) uploadTemplateModal.style.display = 'flex';
});
document.getElementById('closeUploadTemplateModal')?.addEventListener('click', () => {
    if(uploadTemplateModal) uploadTemplateModal.style.display = 'none';
});

let allTemplates = [];
let currentTagFilter = 'all';

async function loadTemplates() {
    const container = document.getElementById('templatesContainer');
    if (!container) return;
    
    try {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error('Failed to load templates');
        allTemplates = await res.json();
        
        updateTemplateTagsFilter();
        renderTemplates();
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Ошибка загрузки шаблонов</div>';
    }
}

function updateTemplateTagsFilter() {
    const filterContainer = document.getElementById('templateTagsFilter');
    if (!filterContainer) return;
    
    // Get unique tags
    const tags = new Set();
    allTemplates.forEach(t => {
        if(t.tags && Array.isArray(t.tags)) {
            t.tags.forEach(tag => tags.add(tag.trim()));
        }
    });
    
    let html = `<button class="tag-filter-btn \${currentTagFilter === 'all' ? 'active' : ''}" data-tag="all" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; border: 1px solid var(--border); background: \${currentTagFilter === 'all' ? 'var(--primary)' : 'transparent'}; color: \${currentTagFilter === 'all' ? 'white' : 'var(--text-main)'}; cursor: pointer;">Все</button>`;
    
    tags.forEach(tag => {
        if(!tag) return;
        const isActive = currentTagFilter === tag;
        html += `<button class="tag-filter-btn \${isActive ? 'active' : ''}" data-tag="\${tag}" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; border: 1px solid var(--border); background: \${isActive ? 'var(--primary)' : 'transparent'}; color: \${isActive ? 'white' : 'var(--text-main)'}; cursor: pointer;">\${tag}</button>`;
    });
    
    filterContainer.innerHTML = html;
    
    filterContainer.querySelectorAll('.tag-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTagFilter = btn.getAttribute('data-tag');
            updateTemplateTagsFilter();
            renderTemplates();
        });
    });
}

function renderTemplates() {
    const container = document.getElementById('templatesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filtered = currentTagFilter === 'all' 
        ? allTemplates 
        : allTemplates.filter(t => t.tags && t.tags.map(x=>x.trim()).includes(currentTagFilter));
        
    if (filtered.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 2.5rem; text-align: center; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border);">Нет доступных шаблонов</div>';
        return;
    }
    
    filtered.forEach(template => {
        const div = document.createElement('div');
        div.className = 'site-card';
        
        let tagsHtml = '';
        if(template.tags && template.tags.length > 0) {
            tagsHtml = template.tags.map(t => `<span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; color: var(--text-muted);">${t}</span>`).join(' ');
        }
        
        div.innerHTML = `
            <div class="site-card-header">
                <h3>\${template.name}</h3>
                <button class="delete-template-btn" data-id="\${template.id}" style="background:none; border:none; color: #f43f5e; cursor: pointer; padding: 4px; opacity: 0.5; transition: 0.2s;" title="Удалить">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
            <p style="margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-muted); height: 40px; overflow: hidden;">\${template.description || 'Без описания'}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 1rem;">
                \${tagsHtml}
            </div>
            <button class="btn btn-outline apply-template-btn" data-id="\${template.id}" style="width: 100%;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Скачать / Применить
            </button>
        `;
        
        div.querySelector('.delete-template-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if(confirm('Удалить шаблон?')) {
                try {
                    const res = await fetch(\`/api/templates/\${template.id}\`, { 
                        method: 'DELETE',
                        headers: { 'X-CSRF-Token': getCsrfToken() }
                    });
                    if(res.ok) {
                        showToast('Шаблон удален', 'success');
                        loadTemplates();
                    } else {
                        showToast('Ошибка при удалении', 'error');
                    }
                } catch(err) {
                    showToast('Ошибка сети', 'error');
                }
            }
        });
        
        div.querySelector('.apply-template-btn').addEventListener('click', (e) => {
            window.open(\`/api/templates/\${template.id}/download\`, '_blank');
        });
        
        container.appendChild(div);
    });
}

document.getElementById('uploadTemplateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Загрузка...';
    
    const fileInput = document.getElementById('templateFileInput');
    const nameInput = document.getElementById('templateNameInput');
    const descInput = document.getElementById('templateDescInput');
    const tagsInput = document.getElementById('templateTagsInput');
    
    // Parse tags: split by comma, trim, limit to 5
    let tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (tags.length > 5) {
        tags = tags.slice(0, 5);
        showToast('Только первые 5 тегов были сохранены', 'info');
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('name', nameInput.value);
    formData.append('description', descInput.value);
    formData.append('tags', JSON.stringify(tags));
    
    try {
        const res = await fetch('/api/templates/upload', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': getCsrfToken()
            },
            body: formData
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast('Шаблон успешно загружен!', 'success');
            uploadTemplateModal.style.display = 'none';
            e.target.reset();
            loadTemplates();
        } else {
            showToast(data.error || 'Ошибка загрузки шаблона', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Ошибка сети при загрузке', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Загрузить шаблон';
    }
});
"@

$js = $js + $appendJs
[System.IO.File]::WriteAllText("public\js\dashboard.js", $js, [System.Text.Encoding]::UTF8)
Write-Host "Done adding templates JS"
