let currentPath = '';
let currentFilePath = '';

const fileListEl = document.getElementById('fileList');
const fileEditorEl = document.getElementById('fileEditor');
const currentFileNameEl = document.getElementById('currentFileName');
const saveFileBtn = document.getElementById('saveFileBtn');
const breadcrumbEl = document.getElementById('breadcrumb');

const imagePreviewEl = document.getElementById('imagePreview');
const previewImgEl = document.getElementById('previewImg');
const unsupportedPreviewEl = document.getElementById('unsupportedPreview');

const ICONS = {
    folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`,
    image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`
};

// Initialize CodeMirror
let cmEditor = CodeMirror.fromTextArea(fileEditorEl, {
    lineNumbers: true,
    mode: "htmlmixed",
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'material-darker' : 'default',
    indentUnit: 2,
    tabSize: 2,
    extraKeys: {
        "Ctrl-S": function(cm) { saveFileBtn.click(); },
        "Cmd-S": function(cm) { saveFileBtn.click(); },
        "Tab": function(cm) {
            if (cm.somethingSelected()) {
                cm.indentSelection("add");
            } else {
                cm.replaceSelection("  ", "end", "+input");
            }
        }
    }
});

// Update CodeMirror theme on system theme change
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            cmEditor.setOption('theme', isDark ? 'material-darker' : 'default');
        }
    });
});
observer.observe(document.documentElement, { attributes: true });

async function loadFiles(path = '') {
    currentPath = path;
    const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
    if (!res.ok) return showToast('Ошибка загрузки файлов', 'error');
    
    const files = await res.json();
    renderFileList(files);
    updateBreadcrumb();
}

function renderFileList(files) {
    fileListEl.innerHTML = '';
    
    if (currentPath !== '') {
        const upItem = document.createElement('div');
        upItem.className = 'file-item';
        upItem.innerHTML = `${ICONS.folder} .. (Назад)`;
        upItem.onclick = () => {
            const parts = currentPath.split('/');
            parts.pop();
            loadFiles(parts.join('/'));
        };
        fileListEl.appendChild(upItem);
    }
    
    files.forEach(f => {
        const el = document.createElement('div');
        el.className = 'file-item';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '8px';
        
        const ext = f.name.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
        const icon = f.isDirectory ? ICONS.folder : (isImage ? ICONS.image : ICONS.file);
        
        el.innerHTML = `${icon} <span style="flex: 1;">${f.name}</span>`;
        
        el.onclick = () => {
            document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
            
            if (f.isDirectory) {
                loadFiles(f.path);
            } else {
                loadFileContent(f.path, f.name);
            }
        };
        
        // Add delete button for files only
        if (!f.isDirectory) {
            const deleteBtn = document.createElement('span');
            deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.color = 'var(--text-muted)';
            deleteBtn.style.padding = '4px';
            deleteBtn.style.borderRadius = '4px';
            deleteBtn.style.display = 'none'; // Show on hover
            deleteBtn.title = 'Удалить';
            
            el.onmouseenter = () => deleteBtn.style.display = 'block';
            el.onmouseleave = () => deleteBtn.style.display = 'none';
            
            deleteBtn.onclick = async (e) => {
                e.stopPropagation(); // Prevent opening file
                if (confirm(`Вы уверены, что хотите удалить ${f.name}?`)) {
                    const res = await fetch(`/api/delete-file`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                        },
                        body: JSON.stringify({ path: f.path })
                    });
                    
                    if (res.ok) {
                        showToast('Файл удален', 'success');
                        loadFiles(currentPath);
                    } else {
                        const data = await res.json();
                        showToast('Ошибка: ' + (data.error || 'Не удалось удалить'), 'error');
                    }
                }
            };
            
            el.appendChild(deleteBtn);
        }
        
        fileListEl.appendChild(el);
    });
}

function updateBreadcrumb() {
    if (!currentPath) {
        breadcrumbEl.innerHTML = '<span>/site</span>';
        return;
    }
    
    const parts = currentPath.split('/');
    let html = '<span onclick="loadFiles(\'\')">/site</span>';
    let accum = '';
    
    parts.forEach(p => {
        accum += (accum ? '/' : '') + p;
        html += ` / <span onclick="loadFiles('${accum}')">${p}</span>`;
    });
    
    breadcrumbEl.innerHTML = html;
}

function getMode(ext) {
    if (ext === 'js') return 'javascript';
    if (ext === 'css') return 'css';
    if (ext === 'json') return 'application/json';
    return 'htmlmixed';
}

async function loadFileContent(path, name) {
    const ext = name.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
    const textExts = ['html', 'css', 'js', 'json', 'txt', 'md'];
    
    currentFileNameEl.textContent = name;
    currentFilePath = path;
    
    // Hide all
    cmEditor.getWrapperElement().style.display = 'none';
    imagePreviewEl.style.display = 'none';
    unsupportedPreviewEl.style.display = 'none';
    saveFileBtn.disabled = true;

    if (isImage) {
        previewImgEl.src = '/real-site/' + path.split('\\').join('/').split('/').map(encodeURIComponent).join('/');
        imagePreviewEl.style.display = 'flex';
        return;
    }
    
    if (!textExts.includes(ext)) {
        unsupportedPreviewEl.style.display = 'flex';
        return;
    }

    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) return showToast('Ошибка чтения файла', 'error');
    
    const data = await res.json();
    
    cmEditor.setValue(data.content);
    cmEditor.setOption("mode", getMode(ext));
    cmEditor.getWrapperElement().style.display = 'block';
    cmEditor.refresh();
    
    saveFileBtn.disabled = false;
}

saveFileBtn.addEventListener('click', async () => {
    if (!currentFilePath) return;
    
    saveFileBtn.textContent = 'Сохранение...';
    saveFileBtn.disabled = true;
    
    const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
        },
        body: JSON.stringify({
            path: currentFilePath,
            content: cmEditor.getValue()
        })
    });
    
    saveFileBtn.textContent = 'Сохранить';
    saveFileBtn.disabled = false;
    
    if (res.ok) {
        showToast('Файл сохранен (Ctrl+S)', 'success');
    } else {
        showToast('Ошибка при сохранении', 'error');
    }
});

// Capture Ctrl+S globally to prevent browser save dialog if focus is outside editor
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saveFileBtn.disabled) saveFileBtn.click();
    }
});

if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { 
            method: 'POST',
            headers: {
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            }
        });
        window.location.href = '/login.html';
    });
}

// Init
cmEditor.getWrapperElement().style.display = 'none';

const activeSite = localStorage.getItem('activeSite');
if (activeSite) {
    loadFiles(activeSite);
} else {
    loadFiles();
}

const uploadFileBtn = document.getElementById('uploadFileBtn');
const fileUploadInput = document.getElementById('fileUploadInput');

if (uploadFileBtn && fileUploadInput) {
    uploadFileBtn.addEventListener('click', () => fileUploadInput.click());
    
    fileUploadInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        
        const formData = new FormData();
        for(let i=0; i<files.length; i++) {
            formData.append('files', files[i]);
        }
        formData.append('path', currentPath);
        
        uploadFileBtn.disabled = true;
        uploadFileBtn.innerHTML = 'Загрузка...';
        
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: formData
            });
            
            if (res.ok) {
                showToast('Файлы успешно загружены', 'success');
                loadFiles(currentPath);
            } else {
                showToast('Ошибка при загрузке файлов', 'error');
            }
        } catch (err) {
            showToast('Ошибка сети при загрузке', 'error');
        } finally {
            uploadFileBtn.disabled = false;
            uploadFileBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Загрузить';
            fileUploadInput.value = '';
        }
    });
}
