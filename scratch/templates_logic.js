
// Developer Templates Logic
document.addEventListener('DOMContentLoaded', () => {
    const tabProjects = document.getElementById('tabProjects');
    const tabTemplates = document.getElementById('tabTemplates');
    const projectsSection = document.getElementById('projectsSection');
    const templatesSection = document.getElementById('templatesSection');

    if (tabProjects && tabTemplates) {
        tabProjects.addEventListener('click', () => {
            tabProjects.classList.add('active');
            tabProjects.style.borderBottomColor = 'var(--primary)';
            tabProjects.style.color = 'var(--text-main)';
            
            tabTemplates.classList.remove('active');
            tabTemplates.style.borderBottomColor = 'transparent';
            tabTemplates.style.color = 'var(--text-muted)';
            
            projectsSection.style.display = 'block';
            templatesSection.style.display = 'none';
        });

        tabTemplates.addEventListener('click', () => {
            tabTemplates.classList.add('active');
            tabTemplates.style.borderBottomColor = 'var(--primary)';
            tabTemplates.style.color = 'var(--text-main)';
            
            tabProjects.classList.remove('active');
            tabProjects.style.borderBottomColor = 'transparent';
            tabProjects.style.color = 'var(--text-muted)';
            
            projectsSection.style.display = 'none';
            templatesSection.style.display = 'block';
            
            loadTemplates();
        });
    }

    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', async () => {
            const siteId = localStorage.getItem('activeSite');
            const templateName = document.getElementById('saveTemplateName').value.trim();
            if (!siteId || !templateName) return alert('Введите имя шаблона');
            
            saveTemplateBtn.disabled = true;
            saveTemplateBtn.textContent = 'Сохранение...';
            
            try {
                const res = await fetch(`/api/sites/${siteId}/save-template`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': getCsrfToken()
                    },
                    body: JSON.stringify({ templateName })
                });
                const data = await res.json();
                if (res.ok) {
                    if (typeof showToast === 'function') showToast('Шаблон успешно сохранен!');
                    document.getElementById('saveTemplateName').value = '';
                    loadTemplates();
                } else {
                    alert(data.error || 'Ошибка при сохранении шаблона');
                }
            } catch (err) {
                alert('Сетевая ошибка при сохранении');
            } finally {
                saveTemplateBtn.disabled = false;
                saveTemplateBtn.textContent = 'Сохранить';
            }
        });
    }
});

async function loadTemplates() {
    const container = document.getElementById('templatesContainer');
    const templateSelect = document.getElementById('uploadSiteTemplate');
    if (!container) return;
    
    try {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error('Failed to fetch templates');
        const templates = await res.json();
        
        container.innerHTML = '';
        if (templateSelect) {
            templateSelect.innerHTML = '<option value="">-- Загрузить ZIP-архив --</option>';
        }
        
        if (templates.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; grid-column: 1/-1;">У вас пока нет сохраненных шаблонов</div>';
            return;
        }
        
        templates.forEach(t => {
            // Add to dropdown
            if (templateSelect) {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                templateSelect.appendChild(opt);
            }
            
            // Add to container
            const div = document.createElement('div');
            div.className = 'hero-card';
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1.25rem;">
                    <div style="width: 48px; height: 48px; background: rgba(108, 92, 231, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--text-main);">${t.name}</h3>
                        <p style="margin: 4px 0 0; color: var(--text-muted); font-size: 0.85rem;">Файл: ${t.id}</p>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="color: #f43f5e; font-size: 0.85rem;">Ошибка загрузки шаблонов</div>';
    }
}
