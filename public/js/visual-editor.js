const urlParams = new URLSearchParams(window.location.search);
let activeSite = urlParams.get('site') || localStorage.getItem('activeSite');

if (!activeSite) {
    window.location.href = '/dashboard.html';
} else {
    localStorage.setItem('activeSite', activeSite);
}

const iframe = document.getElementById('preview');
iframe.src = `/real-site/${activeSite}/index.html?preview=true`;

const saveBtn = document.getElementById('saveBtn');
const saveIndicator = document.getElementById('saveIndicator');

let updates = {};
let imgUpdates = {};
let altUpdates = {};
let hrefUpdates = {};
let styleUpdates = {};
let classUpdates = {};
let tagNameUpdates = {};
let blockOrder = [];
let hasUnsavedChanges = false;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const linkEditorPopup = document.getElementById('linkEditorPopup');
const linkText = document.getElementById('linkText');
const linkHref = document.getElementById('linkHref');
const closeLinkBtn = document.getElementById('closeLinkBtn');
const saveLinkBtn = document.getElementById('saveLinkBtn');

let currentEditingLinkEl = null;
let currentEditingImgEl = null;

let seoUpdates = {};

const seoBtn = document.getElementById('seoBtn');
const seoModal = document.getElementById('seoModal');
const seoTitleInput = document.getElementById('seoTitleInput');
const seoDescInput = document.getElementById('seoDescInput');
const seoKeywordsInput = document.getElementById('seoKeywordsInput');
const ogTitleInput = document.getElementById('ogTitleInput');
const ogDescInput = document.getElementById('ogDescInput');
const ogImageInput = document.getElementById('ogImageInput');
const startAuditBtn = document.getElementById('startAuditBtn');
const auditResults = document.getElementById('auditResults');
const closeSeoModal = document.getElementById('closeSeoModal');
const saveSeoModal = document.getElementById('saveSeoModal');


// Resolution Controls
const resBtns = document.querySelectorAll('.res-btn');
const resSlider = document.getElementById('resSlider');
const resValue = document.getElementById('resValue');
const previewWrapper = document.getElementById('previewWrapper');

if (resBtns.length > 0 && resSlider && resValue && previewWrapper) {
    resBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const width = btn.getAttribute('data-width');
            previewWrapper.style.width = width;
            resValue.textContent = width === '100%' ? '100%' : width;
            if (width !== '100%') {
                resSlider.value = parseInt(width);
            } else {
                resSlider.value = 1440; // Max
            }
            resBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    resSlider.addEventListener('input', () => {
        const width = resSlider.value;
        previewWrapper.style.width = width + 'px';
        resValue.textContent = width + 'px';
        resBtns.forEach(b => b.classList.remove('active'));
    });
}

const pageSelector = document.getElementById('pageSelector');

let currentSelectedEl = null;
let undoStack = [];

function saveState() {
    if (!iframe.contentDocument) return;
    undoStack.push(iframe.contentDocument.documentElement.innerHTML);
    if (undoStack.length > 20) undoStack.shift(); // Limit size
}

function undo() {
    if (undoStack.length > 0) {
        const prevState = undoStack.pop();
        iframe.contentDocument.documentElement.innerHTML = prevState;
        initIframeEditing(iframe.contentDocument);
        markUnsaved();
    } else {
        showToast('Нет действий для отмены', 'info');
    }
}

function handleKeydown(e) {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) saveBtn.click();
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) publishBtn.click();
    }
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        iframe.contentDocument.execCommand('bold', false, null);
    }
    if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        iframe.contentDocument.execCommand('italic', false, null);
    }
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        iframe.contentDocument.execCommand('createLink', false, '#');
    }
}

window.addEventListener('keydown', handleKeydown);

// Close link popup when clicking outside in main document
document.addEventListener('click', (e) => {
    if (linkEditorPopup && linkEditorPopup.style.display === 'flex') {
        if (!linkEditorPopup.contains(e.target)) {
            linkEditorPopup.style.display = 'none';
        }
    }
});

function updateStyle(el, property, value) {
    el.style[property] = value;
    const id = el.getAttribute('data-editable') || el.getAttribute('data-img-editable');
    if (id) styleUpdates[id] = el.getAttribute('style');
    markUnsaved();
}

function updateStylesPanel(el) {
    currentSelectedEl = el;
    const stylesContainer = document.getElementById('stylesContainer');
    if (!stylesContainer) return;
    
    stylesContainer.innerHTML = ''; // Clear
    
    if (!el) {
        stylesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.875rem;">Выберите элемент для редактирования</div>';
        return;
    }
    
    const tagName = el.tagName.toLowerCase();
    const isButton = el.classList.contains('btn') || tagName === 'button';
    const isLink = tagName === 'a';
    const isImage = tagName === 'img';
    const isHeading = /^h[1-6]$/.test(tagName);
    const isText = !isButton && !isLink && !isImage;
    
    const style = el.ownerDocument.defaultView.getComputedStyle(el);
    
    let html = ``;
    
    // Section: Typography
    if (isText || isLink || isButton || isHeading) {
        const color = rgbToHex(style.color);
        const fontSize = parseInt(style.fontSize) || 16;
        const fontWeight = style.fontWeight;
        const lineHeight = style.lineHeight !== 'normal' ? parseInt(style.lineHeight) : '';
        const letterSpacing = style.letterSpacing !== 'normal' ? parseInt(style.letterSpacing) : 0;
        const textAlign = style.textAlign;
        const textTransform = style.textTransform;
        const isItalic = style.fontStyle === 'italic';
        const isUnderline = style.textDecorationLine.includes('underline');
        
        html += `
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px;">Типографика</div>
        `;
        
        if (isHeading) {
            html += `
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Тег заголовка</label>
                    <select id="styleHeadingTag" style="width: 100%; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                        <option value="h1" ${tagName === 'h1' ? 'selected' : ''}>H1</option>
                        <option value="h2" ${tagName === 'h2' ? 'selected' : ''}>H2</option>
                        <option value="h3" ${tagName === 'h3' ? 'selected' : ''}>H3</option>
                        <option value="h4" ${tagName === 'h4' ? 'selected' : ''}>H4</option>
                        <option value="h5" ${tagName === 'h5' ? 'selected' : ''}>H5</option>
                        <option value="h6" ${tagName === 'h6' ? 'selected' : ''}>H6</option>
                    </select>
                </div>
            `;
        }
        
        html += `
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Цвет текста</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="color" id="styleColor" value="${color}" style="width: 32px; height: 32px; padding: 0; border: none; cursor: pointer; background: none;">
                    <input type="text" id="styleColorText" value="${color}" style="flex: 1; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div>
                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Размер (px)</label>
                    <input type="number" id="styleFontSize" value="${fontSize}" style="width: 100%; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                </div>
                <div>
                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Жирность</label>
                    <select id="styleFontWeight" style="width: 100%; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                        <option value="normal" ${fontWeight === '400' || fontWeight === 'normal' ? 'selected' : ''}>Обычный</option>
                        <option value="bold" ${fontWeight === '700' || fontWeight === 'bold' ? 'selected' : ''}>Жирный</option>
                        <option value="300" ${fontWeight === '300' ? 'selected' : ''}>Тонкий</option>
                        <option value="500" ${fontWeight === '500' ? 'selected' : ''}>Средний</option>
                        <option value="900" ${fontWeight === '900' ? 'selected' : ''}>Black</option>
                    </select>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div>
                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Высота строки</label>
                    <input type="number" id="styleLineHeight" value="${lineHeight}" placeholder="Норма" style="width: 100%; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                </div>
                <div>
                    <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Межбуквенное</label>
                    <input type="number" id="styleLetterSpacing" value="${letterSpacing}" style="width: 100%; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                </div>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Выравнивание</label>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-outline style-align-btn" data-align="left" style="flex: 1; padding: 0.3rem; ${textAlign === 'left' ? 'background: var(--bg-active);' : ''}">⬅</button>
                    <button class="btn btn-outline style-align-btn" data-align="center" style="flex: 1; padding: 0.3rem; ${textAlign === 'center' ? 'background: var(--bg-active);' : ''}">⬅➡</button>
                    <button class="btn btn-outline style-align-btn" data-align="right" style="flex: 1; padding: 0.3rem; ${textAlign === 'right' ? 'background: var(--bg-active);' : ''}">➡</button>
                </div>
            </div>

            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Оформление</label>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-outline" id="styleBtnItalic" style="flex: 1; padding: 0.3rem; font-style: italic; ${isItalic ? 'background: var(--bg-active);' : ''}">I</button>
                    <button class="btn btn-outline" id="styleBtnUnderline" style="flex: 1; padding: 0.3rem; text-decoration: underline; ${isUnderline ? 'background: var(--bg-active);' : ''}">U</button>
                    <select id="styleTextTransform" style="flex: 2; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                        <option value="none" ${textTransform === 'none' ? 'selected' : ''}>Без регистров</option>
                        <option value="uppercase" ${textTransform === 'uppercase' ? 'selected' : ''}>ABC</option>
                        <option value="lowercase" ${textTransform === 'lowercase' ? 'selected' : ''}>abc</option>
                        <option value="capitalize" ${textTransform === 'capitalize' ? 'selected' : ''}>Abc</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    // Section: Background & Visibility
    const bgColor = rgbToHex(style.backgroundColor);
    const opacity = parseFloat(style.opacity) || 1;
    
    html += `
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-top: 15px; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px;">Фон и Видимость</div>
    `;
    
    if (isButton || isLink || isText || isHeading) {
        html += `
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Цвет фона</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="color" id="styleBgColor" value="${bgColor}" style="width: 32px; height: 32px; padding: 0; border: none; cursor: pointer; background: none;">
                    <input type="text" id="styleBgColorText" value="${bgColor}" style="flex: 1; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                </div>
            </div>
        `;
    }
    
    html += `
        <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;" id="styleOpacityLabel">Прозрачность (${Math.round(opacity * 100)}%)</label>
            <input type="range" id="styleOpacity" min="0" max="1" step="0.1" value="${opacity}" style="width: 100%; cursor: pointer;">
        </div>
    `;
    
    // Section: Dimensions (for Images)
    if (isImage) {
        const width = parseInt(style.width) || el.naturalWidth;
        const borderRadius = parseInt(style.borderRadius) || 0;
        
        html += `
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-top: 15px; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px;">Размеры</div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Ширина (px)</label>
                <input type="number" id="styleWidth" value="${width}" style="width: 100%; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Скругление углов (px)</label>
                <input type="number" id="styleBorderRadius" value="${borderRadius}" style="width: 100%; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
            </div>
        `;
    }
    
    // Section: Advanced (Class & Custom CSS)
    const currentClass = el.getAttribute('class') || '';
    const formattedClass = currentClass.split(' ').filter(c => c).map(c => '.' + c).join(' ');
    const currentInlineStyle = el.getAttribute('style') || '';
    
    html += `
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-top: 15px; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px;">Продвинутые</div>
        
        <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Класс элемента</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="styleClassName" value="${formattedClass}" style="flex: 1; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main);">
                <button id="copyClassBtn" style="padding: 0.4rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-main); display: flex; align-items: center; justify-content: center;" title="Копировать класс">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
        </div>
        
        <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">Кастомный CSS (inline)</label>
            <textarea id="styleCustomCSS" style="width: 100%; height: 80px; padding: 0.4rem; background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-main); resize: vertical; font-family: monospace;">${currentInlineStyle}</textarea>
        </div>
    `;
    
    stylesContainer.innerHTML = html;
    stylesContainer.querySelectorAll('select').forEach(sel => initCustomSelect(sel));
    
    // Event Listeners
    const styleColor = document.getElementById('styleColor');
    const styleColorText = document.getElementById('styleColorText');
    const styleFontSize = document.getElementById('styleFontSize');
    const styleFontWeight = document.getElementById('styleFontWeight');
    const styleLineHeight = document.getElementById('styleLineHeight');
    const styleLetterSpacing = document.getElementById('styleLetterSpacing');
    const styleTextTransform = document.getElementById('styleTextTransform');
    const styleBgColor = document.getElementById('styleBgColor');
    const styleBgColorText = document.getElementById('styleBgColorText');
    const styleOpacity = document.getElementById('styleOpacity');
    const styleWidth = document.getElementById('styleWidth');
    const styleBorderRadius = document.getElementById('styleBorderRadius');
    const styleHeadingTag = document.getElementById('styleHeadingTag');
    const styleClassName = document.getElementById('styleClassName');
    const styleCustomCSS = document.getElementById('styleCustomCSS');
    
    if (styleColor) {
        styleColor.addEventListener('focus', () => saveState());
        styleColor.addEventListener('input', () => {
            styleColorText.value = styleColor.value;
            updateStyle(el, 'color', styleColor.value);
        });
        styleColorText.addEventListener('focus', () => saveState());
        styleColorText.addEventListener('input', () => {
            styleColor.value = styleColorText.value;
            updateStyle(el, 'color', styleColorText.value);
        });
    }
    
    if (styleFontSize) {
        styleFontSize.addEventListener('focus', () => saveState());
        styleFontSize.addEventListener('input', () => {
            updateStyle(el, 'fontSize', styleFontSize.value + 'px');
        });
    }
    
    if (styleFontWeight) {
        styleFontWeight.addEventListener('focus', () => saveState());
        styleFontWeight.addEventListener('change', () => {
            updateStyle(el, 'fontWeight', styleFontWeight.value);
        });
    }
    
    if (styleLineHeight) {
        styleLineHeight.addEventListener('focus', () => saveState());
        styleLineHeight.addEventListener('input', () => {
            updateStyle(el, 'lineHeight', styleLineHeight.value + 'px');
        });
    }
    
    if (styleLetterSpacing) {
        styleLetterSpacing.addEventListener('focus', () => saveState());
        styleLetterSpacing.addEventListener('input', () => {
            updateStyle(el, 'letterSpacing', styleLetterSpacing.value + 'px');
        });
    }
    
    document.querySelectorAll('.style-align-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            saveState();
            const align = btn.getAttribute('data-align');
            el.style.textAlign = align;
            const id = el.getAttribute('data-editable') || el.getAttribute('data-img-editable');
            if (id) styleUpdates[id] = el.getAttribute('style');
            document.querySelectorAll('.style-align-btn').forEach(b => b.style.background = 'none');
            btn.style.background = 'var(--bg-active)';
            markUnsaved();
        });
    });
    
    const styleBtnItalic = document.getElementById('styleBtnItalic');
    if (styleBtnItalic) {
        styleBtnItalic.addEventListener('click', () => {
            saveState();
            const isItalic = el.style.fontStyle === 'italic';
            el.style.fontStyle = isItalic ? 'normal' : 'italic';
            const id = el.getAttribute('data-editable') || el.getAttribute('data-img-editable');
            if (id) styleUpdates[id] = el.getAttribute('style');
            styleBtnItalic.style.background = isItalic ? 'none' : 'var(--bg-active)';
            markUnsaved();
        });
    }
    
    const styleBtnUnderline = document.getElementById('styleBtnUnderline');
    if (styleBtnUnderline) {
        styleBtnUnderline.addEventListener('click', () => {
            saveState();
            const isUnderline = el.style.textDecorationLine.includes('underline');
            el.style.textDecorationLine = isUnderline ? 'none' : 'underline';
            const id = el.getAttribute('data-editable') || el.getAttribute('data-img-editable');
            if (id) styleUpdates[id] = el.getAttribute('style');
            styleBtnUnderline.style.background = isUnderline ? 'none' : 'var(--bg-active)';
            markUnsaved();
        });
    }
    
    if (styleTextTransform) {
        styleTextTransform.addEventListener('focus', () => saveState());
        styleTextTransform.addEventListener('change', () => {
            updateStyle(el, 'textTransform', styleTextTransform.value);
        });
    }
    
    if (styleBgColor) {
        styleBgColor.addEventListener('focus', () => saveState());
        styleBgColor.addEventListener('input', () => {
            styleBgColorText.value = styleBgColor.value;
            updateStyle(el, 'backgroundColor', styleBgColor.value);
        });
        styleBgColorText.addEventListener('focus', () => saveState());
        styleBgColorText.addEventListener('input', () => {
            styleBgColor.value = styleBgColorText.value;
            updateStyle(el, 'backgroundColor', styleBgColorText.value);
        });
    }
    
    if (styleOpacity) {
        styleOpacity.addEventListener('focus', () => saveState());
        styleOpacity.addEventListener('input', () => {
            el.style.opacity = styleOpacity.value;
            const id = el.getAttribute('data-editable') || el.getAttribute('data-img-editable');
            if (id) styleUpdates[id] = el.getAttribute('style');
            const label = document.getElementById('styleOpacityLabel');
            if (label) label.textContent = `Прозрачность (${Math.round(styleOpacity.value * 100)}%)`;
            markUnsaved();
        });
    }
    
    if (styleWidth) {
        styleWidth.addEventListener('focus', () => saveState());
        styleWidth.addEventListener('input', () => {
            updateStyle(el, 'width', styleWidth.value + 'px');
        });
    }
    
    if (styleBorderRadius) {
        styleBorderRadius.addEventListener('focus', () => saveState());
        styleBorderRadius.addEventListener('input', () => {
            updateStyle(el, 'borderRadius', styleBorderRadius.value + 'px');
        });
    }
    
    if (styleHeadingTag) {
        styleHeadingTag.addEventListener('focus', () => saveState());
        styleHeadingTag.addEventListener('change', () => {
            const newTag = styleHeadingTag.value;
            const newEl = changeTagName(el, newTag);
            updateStylesPanel(newEl);
            markUnsaved();
        });
    }
    
    if (styleClassName) {
        styleClassName.addEventListener('focus', () => saveState());
        styleClassName.addEventListener('input', () => {
            const rawClass = styleClassName.value.split(' ').filter(c => c).map(c => c.startsWith('.') ? c.substring(1) : c).join(' ');
            el.setAttribute('class', rawClass);
            const id = el.getAttribute('data-editable') || el.getAttribute('data-img-editable');
            if (id) classUpdates[id] = rawClass;
            markUnsaved();
        });
    }

    const copyClassBtn = document.getElementById('copyClassBtn');
    if (copyClassBtn) {
        copyClassBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(styleClassName.value).then(() => {
                showToast('Класс скопирован!', 'success');
            }).catch(err => {
                showToast('Не удалось скопировать', 'error');
            });
        });
    }
    
    if (styleCustomCSS) {
        styleCustomCSS.addEventListener('focus', () => saveState());
        styleCustomCSS.addEventListener('input', () => {
            el.setAttribute('style', styleCustomCSS.value);
            const id = el.getAttribute('data-editable') || el.getAttribute('data-img-editable');
            if (id) styleUpdates[id] = styleCustomCSS.value;
            markUnsaved();
        });
    }
}

function changeTagName(el, newTagName) {
    const newEl = el.ownerDocument.createElement(newTagName);
    for (let attr of el.attributes) {
        newEl.setAttribute(attr.name, attr.value);
    }
    while (el.firstChild) {
        newEl.appendChild(el.firstChild);
    }
    el.parentNode.replaceChild(newEl, el);
    
    const id = el.getAttribute('data-editable');
    if (id) tagNameUpdates[id] = newTagName;
    
    // Re-bind click listener
    if (el.hasAttribute('data-editable')) {
        newEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            newEl.setAttribute('contenteditable', 'true');
            newEl.focus();
            updateStylesPanel(newEl);
        });
    }
    return newEl;
}

function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    return "#" + ("0" + parseInt(match[1],10).toString(16)).slice(-2) +
           ("0" + parseInt(match[2],10).toString(16)).slice(-2) +
           ("0" + parseInt(match[3],10).toString(16)).slice(-2);
}

function initCustomSelect(selectEl) {
    if (!selectEl) return;
    
    const existingWrapper = selectEl.parentNode.querySelector('.custom-select-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }

    selectEl.style.display = 'none';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.style.width = selectEl.style.width || 'auto';
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `<span>${selectEl.options[selectEl.selectedIndex]?.text || ''}</span>`;
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-select-options';
    
    Array.from(selectEl.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        if (opt.value === selectEl.value) item.classList.add('selected');
        item.textContent = opt.text;
        item.setAttribute('data-value', opt.value);
        
        item.addEventListener('click', () => {
            selectEl.value = opt.value;
            trigger.querySelector('span').textContent = opt.text;
            optionsContainer.classList.remove('show');
            
            optionsContainer.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            
            selectEl.dispatchEvent(new Event('change'));
        });
        
        optionsContainer.appendChild(item);
    });
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsContainer.classList.toggle('show');
        document.querySelectorAll('.custom-select-options').forEach(el => {
            if (el !== optionsContainer) el.classList.remove('show');
        });
    });
    
    document.addEventListener('click', () => {
        optionsContainer.classList.remove('show');
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    selectEl.parentNode.insertBefore(wrapper, selectEl);
}

async function loadPages() {
    try {
        const res = await fetch(`/api/pages?site=${activeSite}`);
        if (res.status === 401 || res.status === 403) {
            window.location.href = '/login.html';
            return;
        }
        const pages = await res.json();
        if (pageSelector && Array.isArray(pages)) {
            pageSelector.innerHTML = '';
            pages.forEach(p => {
                const option = document.createElement('option');
                option.value = p;
                option.textContent = p;
                pageSelector.appendChild(option);
            });
            const currentSrc = iframe.src.split('/').pop().split('?')[0];
            pageSelector.value = currentSrc || 'index.html';
            initCustomSelect(pageSelector);
        } else if (pages.error) {
            showToast('Ошибка загрузки страниц: ' + pages.error, 'error');
        }
    } catch (err) {
        console.error('Failed to load pages:', err);
        showToast('Ошибка сети при загрузке страниц', 'error');
    }
}

if (pageSelector) {
    pageSelector.addEventListener('change', () => {
        const page = pageSelector.value;
        iframe.src = `/real-site/${activeSite}/${page}?preview=true`;
        markSaved();
    });
}

loadPages();

function markUnsaved() {
    hasUnsavedChanges = true;
    saveIndicator.textContent = 'Есть несохраненные изменения';
    saveIndicator.style.color = '#E00';
}

function markSaved() {
    hasUnsavedChanges = false;
    updates = {};
    imgUpdates = {};
    hrefUpdates = {};
    seoUpdates = {};
    blockOrder = [];
    saveIndicator.textContent = 'Все изменения сохранены';
    saveIndicator.style.color = 'var(--text-muted)';
}

function getBlockOrderArray(doc) {
    const order = [];
    doc.querySelectorAll('[data-block-id]').forEach(el => {
        order.push(el.getAttribute('data-block-id'));
    });
    return order;
}

function populateLayers(doc) {
    const layersContainer = document.getElementById('layersContainer');
    if (!layersContainer) return;
    
    layersContainer.innerHTML = '';
    
    const blocks = doc.querySelectorAll('[data-block-id]');
    if (blocks.length === 0) {
        layersContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem;">Нет блоков на странице</div>';
        return;
    }
    
    blocks.forEach(block => {
        const blockId = block.getAttribute('data-block-id');
        const blockName = block.tagName.toLowerCase() + '#' + blockId;
        
        const blockItem = document.createElement('div');
        blockItem.style.marginBottom = '10px';
        blockItem.style.padding = '5px';
        blockItem.style.borderRadius = '4px';
        blockItem.style.cursor = 'move';
        blockItem.setAttribute('draggable', 'true');
        
        blockItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', blockId);
            blockItem.style.opacity = '0.5';
        });
        
        blockItem.addEventListener('dragend', () => {
            blockItem.style.opacity = '1';
            blockItem.style.borderTop = 'none';
        });
        
        blockItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            blockItem.style.borderTop = '2px solid #0070F3';
        });
        
        blockItem.addEventListener('dragleave', () => {
            blockItem.style.borderTop = 'none';
        });
        
        blockItem.addEventListener('drop', (e) => {
            e.preventDefault();
            blockItem.style.borderTop = 'none';
            const draggedBlockId = e.dataTransfer.getData('text/plain');
            if (draggedBlockId !== blockId) {
                const draggedBlock = doc.querySelector(`[data-block-id="${draggedBlockId}"]`);
                const targetBlock = doc.querySelector(`[data-block-id="${blockId}"]`);
                if (draggedBlock && targetBlock) {
                    targetBlock.parentNode.insertBefore(draggedBlock, targetBlock);
                    blockOrder = getBlockOrderArray(doc);
                    markUnsaved();
                    populateLayers(doc);
                }
            }
        });
        
        const blockTitle = document.createElement('div');
        blockTitle.style.fontWeight = '600';
        blockTitle.style.fontSize = '0.85rem';
        blockTitle.style.cursor = 'pointer';
        blockTitle.style.display = 'flex';
        blockTitle.style.alignItems = 'center';
        blockTitle.style.gap = '5px';
        blockTitle.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
            ${blockName}
        `;
        
        blockTitle.addEventListener('click', () => {
            block.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight in preview
            block.style.outline = '2px solid var(--primary)';
            block.style.outlineOffset = '2px';
            setTimeout(() => { block.style.outline = 'none'; }, 2000);
        });
        
        const blockActions = document.createElement('div');
        blockActions.style.display = 'flex';
        blockActions.style.gap = '5px';
        
        // Duplicate button
        const dupBtn = document.createElement('button');
        dupBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        dupBtn.className = 'btn btn-outline';
        dupBtn.style.padding = '4px';
        dupBtn.title = 'Дублировать';
        dupBtn.onclick = (e) => {
            e.stopPropagation();
            saveState();
            const clone = block.cloneNode(true);
            const suffix = '-' + Math.random().toString(36).substring(2, 7);
            
            // Update IDs to be unique
            if (clone.hasAttribute('data-block-id')) {
                clone.setAttribute('data-block-id', clone.getAttribute('data-block-id') + suffix);
            }
            
            clone.querySelectorAll('[data-editable], [data-img-editable], [data-block-id]').forEach(el => {
                if (el.hasAttribute('data-block-id')) el.setAttribute('data-block-id', el.getAttribute('data-block-id') + suffix);
                if (el.hasAttribute('data-editable')) el.setAttribute('data-editable', el.getAttribute('data-editable') + suffix);
                if (el.hasAttribute('data-img-editable')) el.setAttribute('data-img-editable', el.getAttribute('data-img-editable') + suffix);
            });
            
            block.parentNode.insertBefore(clone, block.nextSibling);
            initIframeEditing(doc);
            markUnsaved();
            showToast('Блок продублирован', 'success');
        };
        
        // Delete button
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>';
        delBtn.className = 'btn btn-outline';
        delBtn.style.padding = '4px';
        delBtn.style.color = '#ff3333';
        delBtn.title = 'Удалить';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Вы уверены, что хотите удалить этот блок?')) {
                saveState();
                block.remove();
                initIframeEditing(doc);
                markUnsaved();
                showToast('Блок удален', 'success');
            }
        };
        
        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.alignItems = 'center';
        titleRow.appendChild(blockTitle);
        titleRow.appendChild(blockActions);
        
        blockActions.appendChild(dupBtn);
        blockActions.appendChild(delBtn);
        
        blockItem.appendChild(titleRow);
        
        const childrenContainer = document.createElement('div');
        childrenContainer.style.paddingLeft = '15px';
        childrenContainer.style.marginTop = '5px';
        childrenContainer.style.fontSize = '0.8rem';
        childrenContainer.style.color = 'var(--text-muted)';
        
        const editables = block.querySelectorAll('[data-editable]');
        editables.forEach(editable => {
            const elItem = document.createElement('div');
            elItem.style.padding = '3px 0';
            elItem.style.cursor = 'pointer';
            elItem.style.whiteSpace = 'nowrap';
            elItem.style.overflow = 'hidden';
            elItem.style.textOverflow = 'ellipsis';
            
            const tagName = editable.tagName.toLowerCase();
            let icon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
            
            if (tagName.startsWith('h')) {
                icon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16M18 4v16M6 12h12"></path></svg>';
            }
            
            elItem.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 3px;">
                    ${icon}
                    <span style="color: var(--text-main);">${tagName}</span>: ${editable.innerText.substring(0, 15)}...
                </span>
            `;
            
            elItem.addEventListener('click', (e) => {
                e.stopPropagation();
                editable.scrollIntoView({ behavior: 'smooth', block: 'center' });
                editable.click();
            });
            
            childrenContainer.appendChild(elItem);
        });
        
        blockItem.appendChild(childrenContainer);
        layersContainer.appendChild(blockItem);
    });
}

function initIframeEditing(doc) {
    populateLayers(doc);

    // Inject styles for editable elements and block toolbar
    const style = doc.createElement('style');
    style.textContent = `
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.5); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.7); }
        [data-editable] {
            outline: 2px dashed transparent;
            outline-offset: 4px;
            cursor: text !important;
            transition: all 0.2s;
        }
        [data-editable]:hover {
            outline-color: #0070F3 !important;
            background-color: rgba(0, 112, 243, 0.05) !important;
        }
        [data-editable][contenteditable="true"] {
            outline: 2px solid #0070F3 !important;
            background-color: rgba(255, 255, 255, 0.9) !important;
            color: #000 !important; 
        }
        [data-img-editable] {
            outline: 2px dashed transparent;
            cursor: pointer;
            transition: outline 0.2s;
        }
        [data-img-editable]:hover {
            outline-color: #0070F3 !important;
            opacity: 0.9;
        }
        .cms-global-block-toolbar {
            position: absolute;
            z-index: 10000;
            display: none;
            background: #000;
            padding: 4px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            gap: 4px;
        }
        .cms-global-block-toolbar button {
            background: #222;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cms-global-block-toolbar button:hover {
            background: #0070F3;
        }
    `;
    doc.head.appendChild(style);

    // Initial Block Order
    blockOrder = getBlockOrderArray(doc);

    // Make text editable
    doc.querySelectorAll('[data-editable]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.setAttribute('contenteditable', 'true');
            el.focus();
            updateStylesPanel(el);
        });

        el.addEventListener('blur', () => {
            el.removeAttribute('contenteditable');
            const id = el.getAttribute('data-editable');
            updates[id] = el.innerHTML;
            markUnsaved();
        });

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                el.blur();
            }
        });
    });

    // Make images editable
    doc.querySelectorAll('[data-img-editable]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            currentEditingImgEl = el;
            const imgSrcInput = document.getElementById('imgSrcInput');
            if (imgSrcInput) imgSrcInput.value = el.getAttribute('src') || '';
            
            const fileListContainer = document.getElementById('fileListContainer');
            if (fileListContainer) fileListContainer.style.display = 'none';
            
            const imageEditorModal = document.getElementById('imageEditorModal');
            if (imageEditorModal) imageEditorModal.style.display = 'flex';
            
            updateStylesPanel(el);
        });
    });

    // Make links editable
    doc.querySelectorAll('a[data-editable]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            currentEditingLinkEl = el;
            
            const rect = el.getBoundingClientRect();
            const iframeRect = iframe.getBoundingClientRect();
            
            linkEditorPopup.style.top = (iframeRect.top + rect.bottom + doc.defaultView.scrollY + 5) + 'px';
            linkEditorPopup.style.left = (iframeRect.left + rect.left + doc.defaultView.scrollX) + 'px';
            linkEditorPopup.style.display = 'flex';
            
            linkText.value = el.innerText;
            linkHref.value = el.getAttribute('href') || '';
            
            updateStylesPanel(el);
        });
    });

    // Clear selection when clicking on non-editable elements
    doc.addEventListener('click', (e) => {
        if (!e.target.closest('[data-editable], [data-img-editable]')) {
            updateStylesPanel(null);
        }
    });

    // Close link popup when clicking outside in iframe
    doc.addEventListener('click', (e) => {
        if (linkEditorPopup && linkEditorPopup.style.display === 'flex') {
            if (!e.target.closest('a[data-editable]')) {
                linkEditorPopup.style.display = 'none';
            }
        }
    });

    doc.addEventListener('keydown', handleKeydown);

    // Block Toolbar Setup
    let currentHoveredBlock = null;
    const blockToolbar = doc.createElement('div');
    blockToolbar.className = 'cms-global-block-toolbar';
    blockToolbar.innerHTML = `<button class="cms-up" title="Вверх">▲</button><button class="cms-down" title="Вниз">▼</button>`;
    doc.body.appendChild(blockToolbar);

    doc.querySelectorAll('[data-block-id]').forEach(block => {
        block.addEventListener('mouseenter', (e) => {
            currentHoveredBlock = block;
            const rect = block.getBoundingClientRect();
            blockToolbar.style.top = (rect.top + doc.defaultView.scrollY + 10) + 'px';
            blockToolbar.style.left = (rect.left + doc.defaultView.scrollX + rect.width - 80) + 'px';
            blockToolbar.style.display = 'flex';
        });
    });

    // Hide toolbar when leaving the block or the toolbar itself
    doc.addEventListener('mousemove', (e) => {
        if (currentHoveredBlock) {
            const rect = currentHoveredBlock.getBoundingClientRect();
            const tbRect = blockToolbar.getBoundingClientRect();
            
            // Check if mouse is outside both the block and the toolbar
            const outBlock = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
            const outTb = e.clientX < tbRect.left || e.clientX > tbRect.right || e.clientY < tbRect.top || e.clientY > tbRect.bottom;
            
            if (outBlock && outTb) {
                blockToolbar.style.display = 'none';
                currentHoveredBlock = null;
            }
        }
    });

    blockToolbar.querySelector('.cms-up').onclick = () => {
        if (currentHoveredBlock && currentHoveredBlock.previousElementSibling) {
            // Check if previous sibling is a block
            if (currentHoveredBlock.previousElementSibling.hasAttribute('data-block-id')) {
                currentHoveredBlock.parentNode.insertBefore(currentHoveredBlock, currentHoveredBlock.previousElementSibling);
                markUnsaved();
                blockOrder = getBlockOrderArray(doc);
                
                // Update toolbar position
                const rect = currentHoveredBlock.getBoundingClientRect();
                blockToolbar.style.top = (rect.top + doc.defaultView.scrollY + 10) + 'px';
            }
        }
    };

    blockToolbar.querySelector('.cms-down').onclick = () => {
        if (currentHoveredBlock && currentHoveredBlock.nextElementSibling) {
            // Check if next sibling is a block
            if (currentHoveredBlock.nextElementSibling.hasAttribute('data-block-id')) {
                currentHoveredBlock.parentNode.insertBefore(currentHoveredBlock.nextElementSibling, currentHoveredBlock);
                markUnsaved();
                blockOrder = getBlockOrderArray(doc);
                
                // Update toolbar position
                const rect = currentHoveredBlock.getBoundingClientRect();
                blockToolbar.style.top = (rect.top + doc.defaultView.scrollY + 10) + 'px';
            }
        }
    };
};

if (closeLinkBtn) {
    closeLinkBtn.addEventListener('click', () => {
        linkEditorPopup.style.display = 'none';
    });
}

if (saveLinkBtn) {
    saveLinkBtn.addEventListener('click', () => {
        if (currentEditingLinkEl) {
            // Update only the text node to preserve icons and other elements
            let textNode = null;
            for (let node of currentEditingLinkEl.childNodes) {
                if (node.nodeType === 3 && node.nodeValue.trim() !== '') { // 3 is Node.TEXT_NODE
                    textNode = node;
                    break;
                }
            }
            
            if (textNode) {
                textNode.nodeValue = linkText.value;
            } else {
                currentEditingLinkEl.appendChild(currentEditingLinkEl.ownerDocument.createTextNode(linkText.value));
            }
            
            currentEditingLinkEl.setAttribute('href', linkHref.value);
            
            const id = currentEditingLinkEl.getAttribute('data-editable');
            if (id) {
                updates[id] = currentEditingLinkEl.innerHTML; // Use innerHTML to preserve SVG in update
                hrefUpdates[id] = linkHref.value;
            }
            
            markUnsaved();
            linkEditorPopup.style.display = 'none';
        }
    });
}

if (seoBtn) {
    seoBtn.addEventListener('click', () => {
        const doc = iframe.contentDocument;
        seoTitleInput.value = doc.title || '';
        
        const metaDesc = doc.querySelector('meta[name="description"]');
        seoDescInput.value = metaDesc ? metaDesc.getAttribute('content') : '';
        
        const metaKeys = doc.querySelector('meta[name="keywords"]');
        seoKeywordsInput.value = metaKeys ? metaKeys.getAttribute('content') : '';
        
        seoModal.style.display = 'flex';
    });
}

if (closeSeoModal) {
    closeSeoModal.addEventListener('click', () => {
        seoModal.style.display = 'none';
    });
}


saveBtn.addEventListener('click', async () => {
    if (Object.keys(updates).length === 0 && 
        Object.keys(imgUpdates).length === 0 && 
        Object.keys(altUpdates).length === 0 &&
        Object.keys(hrefUpdates).length === 0 && 
        Object.keys(seoUpdates).length === 0 && 
        !hasUnsavedChanges) {
        return showToast('Нет изменений для сохранения', 'default');
    }
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';
    const currentSrc = iframe.src.split('/').pop().split('?')[0] || 'index.html';
    const fullPagePath = `${activeSite}/${currentSrc}`;

    try {
        const res = await fetch('/api/save-visual', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
            },
            body: JSON.stringify({ 
                page: fullPagePath, 
                updates, 
                imgUpdates,
                altUpdates,
                hrefUpdates, 
                styleUpdates, 
                classUpdates,
                tagNameUpdates,
                seoUpdates,
                blockOrder
            })
        });
        
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            updates = {};
            imgUpdates = {};
            altUpdates = {};
            hrefUpdates = {};
            styleUpdates = {};
            classUpdates = {};
            tagNameUpdates = {};
            seoUpdates = {};
            hasUnsavedChanges = false;
            saveIndicator.textContent = 'Сохранено';
            saveIndicator.style.color = 'var(--text-muted)';
        } else {
            showToast('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
        }
    } catch (err) {
        showToast('Ошибка сети при сохранении', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить';
    }
});

const publishBtn = document.getElementById('publishBtn');
if (publishBtn) {
    publishBtn.addEventListener('click', async () => {
        const currentSrc = iframe.src.split('/').pop().split('?')[0] || 'index.html';
        const fullPagePath = `${activeSite}/${currentSrc}`;
        
        publishBtn.disabled = true;
        publishBtn.textContent = 'Публикация...';
        
        try {
            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: JSON.stringify({ page: fullPagePath })
            });
            
            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'success');
            } else {
                showToast('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (err) {
            showToast('Ошибка сети при публикации', 'error');
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = 'Опубликовать';
        }
    });
}

// Image Editor Modal Listeners
const imageEditorModal = document.getElementById('imageEditorModal');
const uploadImgBtn = document.getElementById('uploadImgBtn');
const selectImgBtn = document.getElementById('selectImgBtn');
const closeImageModal = document.getElementById('closeImageModal');
const saveImageModal = document.getElementById('saveImageModal');
const imgSrcInput = document.getElementById('imgSrcInput');
const fileListContainer = document.getElementById('fileListContainer');

if (closeImageModal) {
    closeImageModal.addEventListener('click', () => {
        imageEditorModal.style.display = 'none';
    });
}

if (saveImageModal) {
    saveImageModal.addEventListener('click', () => {
        if (currentEditingImgEl && imgSrcInput) {
            const id = currentEditingImgEl.getAttribute('data-img-editable');
            const newSrc = imgSrcInput.value;
            const newAlt = imageAltInput ? imageAltInput.value : '';
            
            currentEditingImgEl.src = newSrc;
            currentEditingImgEl.alt = newAlt;
            
            imgUpdates[id] = newSrc;
            altUpdates[id] = newAlt;
            
            markUnsaved();
            imageEditorModal.style.display = 'none';
            showToast('Изменения применены. Сохраните проект.', 'success');
        }
    });
}

if (uploadImgBtn) {
    uploadImgBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = async () => {
            if (fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append('files', fileInput.files[0]);
                formData.append('path', 'img'); 
                
                showToast('Загрузка изображения...', 'default');
                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                        },
                        body: formData
                    });
                    const data = await res.json();
                    if (data.success) {
                        imgSrcInput.value = data.files[0].url;
                        showToast('Файл загружен. Нажмите "Применить".', 'success');
                    } else {
                        showToast('Ошибка загрузки: ' + data.error, 'error');
                    }
                } catch (err) {
                    showToast('Ошибка сети при загрузке', 'error');
                }
            }
        };
        fileInput.click();
    });
}

if (selectImgBtn) {
    selectImgBtn.addEventListener('click', async () => {
        fileListContainer.innerHTML = 'Загрузка...';
        fileListContainer.style.display = 'grid';
        fileListContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
        fileListContainer.style.gap = '10px';
        fileListContainer.style.padding = '10px';
        
        try {
            const res = await fetch('/api/all-images');
            const files = await res.json();
            
            fileListContainer.innerHTML = '';
            if (!Array.isArray(files) || files.length === 0) {
                fileListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; grid-column: 1/-1;">Нет изображений в проекте</div>';
                return;
            }
            
            files.forEach(file => {
                const item = document.createElement('div');
                item.style.width = '100%';
                item.style.height = '60px';
                item.style.border = '1px solid var(--border)';
                item.style.borderRadius = 'var(--radius-sm)';
                item.style.cursor = 'pointer';
                item.style.backgroundImage = `url('${file.url}')`;
                item.style.backgroundSize = 'cover';
                item.style.backgroundPosition = 'center';
                item.style.transition = 'transform 0.1s, border-color 0.1s';
                item.title = file.name;
                
                item.addEventListener('mouseover', () => {
                    item.style.transform = 'scale(1.05)';
                    item.style.borderColor = 'var(--primary)';
                });
                item.addEventListener('mouseout', () => {
                    item.style.transform = 'scale(1)';
                    const currentSrc = imgSrcInput ? imgSrcInput.value : '';
                    if (currentSrc !== file.url) {
                        item.style.borderColor = 'var(--border)';
                    }
                });
                
                item.addEventListener('click', () => {
                    if (imgSrcInput) imgSrcInput.value = file.url;
                    // Reset all borders
                    fileListContainer.querySelectorAll('div').forEach(div => {
                        if (div.style.backgroundImage) div.style.borderColor = 'var(--border)';
                    });
                    // Highlight selected
                    item.style.borderColor = 'var(--primary)';
                });
                fileListContainer.appendChild(item);
            });
            if (fileListContainer.childNodes.length === 0) {
                fileListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; grid-column: 1/-1;">Нет изображений в проекте</div>';
            }
        } catch (err) {
            fileListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; grid-column: 1/-1;">Ошибка загрузки файлов</div>';
        }
    });
}

function addIframeHotkeys(doc) {
    doc.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtn) saveBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            document.getElementById('publishBtn')?.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            doc.execCommand('bold', false, null);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            doc.execCommand('italic', false, null);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const url = prompt('Введите ссылку:');
            if (url) {
                doc.execCommand('createLink', false, url);
            }
        }
    });
}

iframe.onload = () => {
    initIframeEditing(iframe.contentDocument);
    addIframeHotkeys(iframe.contentDocument);
};

// Hotkeys for main document
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) saveBtn.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        document.getElementById('publishBtn')?.click();
    }
});

// Prompt before leaving if unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// QR Preview Logic
const qrBtn = document.getElementById('qrBtn');
const qrModal = document.getElementById('qrModal');
const closeQrModal = document.getElementById('closeQrModal');
const qrCanvas = document.getElementById('qrCanvas');
const qrUrlDisplay = document.getElementById('qrUrlDisplay');

if (qrBtn) {
    qrBtn.onclick = async () => {
        try {
            const res = await fetch('/api/preview-url');
            const data = await res.json();
            
            const activeSite = localStorage.getItem('activeSite') || 'site1';
            const currentPage = pageSelector.value || 'index.html';
            const fullUrl = `${data.url}/real-site/${activeSite}/${currentPage}?preview=true`;
            
            qrUrlDisplay.value = fullUrl;
            qrModal.style.display = 'flex';
            
            QRCode.toCanvas(qrCanvas, fullUrl, {
                width: 200,
                margin: 0,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, function (error) {
                if (error) console.error(error);
            });
            
        } catch (err) {
            console.error(err);
            showToast('Ошибка при генерации QR-кода', 'error');
        }
    };
}

if (closeQrModal) {
    closeQrModal.onclick = () => {
        qrModal.style.display = 'none';
    };
}

window.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.style.display = 'none';
});

// SEO Modal Tabs
document.querySelectorAll('.seo-tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.seo-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.seo-tab-content').forEach(c => c.style.display = 'none');
        const targetId = 'seoTab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
        document.getElementById(targetId).style.display = 'block';
    };
});

// SEO Audit Logic
if (startAuditBtn) {
    startAuditBtn.onclick = () => {
        const doc = iframe.contentDocument;
        const results = [];
        
        // 1. Title
        const title = doc.querySelector('title');
        if (!title || !title.innerText.trim()) results.push({ type: 'error', text: 'Отсутствует заголовок <title>' });
        else if (title.innerText.length > 70) results.push({ type: 'warning', text: 'Заголовок <title> слишком длинный (>70 симв.)' });
        else results.push({ type: 'success', text: 'Заголовок <title> в порядке' });

        // 2. Description
        const desc = doc.querySelector('meta[name="description"]');
        if (!desc || !desc.content.trim()) results.push({ type: 'error', text: 'Отсутствует мета-тег description' });
        else if (desc.content.length > 160) results.push({ type: 'warning', text: 'Description слишком длинный (>160 симв.)' });
        else results.push({ type: 'success', text: 'Description в порядке' });

        // 3. Headings
        const h1s = doc.querySelectorAll('h1');
        if (h1s.length === 0) results.push({ type: 'error', text: 'На странице нет заголовка H1' });
        else if (h1s.length > 1) results.push({ type: 'warning', text: 'На странице больше одного H1 (' + h1s.length + ')' });
        else results.push({ type: 'success', text: 'H1 найден' });

        // 4. Images Alt
        const imgs = doc.querySelectorAll('img');
        let missingAlt = 0;
        imgs.forEach(img => { if (!img.alt.trim()) missingAlt++; });
        if (missingAlt > 0) results.push({ type: 'warning', text: 'У ' + missingAlt + ' изображений отсутствует атрибут ALT' });
        else results.push({ type: 'success', text: 'Все изображения имеют ALT' });

        // Render Results
        auditResults.innerHTML = results.map(r => `
            <div style="padding: 8px; margin-bottom: 5px; border-radius: 4px; background: ${r.type === 'error' ? 'rgba(255,0,0,0.1)' : r.type === 'warning' ? 'rgba(255,165,0,0.1)' : 'rgba(0,128,0,0.1)'}; border: 1px solid ${r.type === 'error' ? '#ff4d4d' : r.type === 'warning' ? '#ffa500' : '#2ecc71'}; font-size: 0.85rem;">
                <span style="margin-right: 5px;">${r.type === 'error' ? '❌' : r.type === 'warning' ? '⚠️' : '✅'}</span>
                ${r.text}
            </div>
        `).join('');
    };
}

// SEO Open / Save
if (seoBtn) {
    seoBtn.onclick = () => {
        const doc = iframe.contentDocument;
        seoTitleInput.value = doc.querySelector('title')?.innerText || '';
        seoDescInput.value = doc.querySelector('meta[name="description"]')?.content || '';
        seoKeywordsInput.value = doc.querySelector('meta[name="keywords"]')?.content || '';
        
        ogTitleInput.value = doc.querySelector('meta[property="og:title"]')?.content || '';
        ogDescInput.value = doc.querySelector('meta[property="og:description"]')?.content || '';
        ogImageInput.value = doc.querySelector('meta[property="og:image"]')?.content || '';
        
        seoModal.style.display = 'flex';
    };
}

if (closeSeoModal) closeSeoModal.onclick = () => seoModal.style.display = 'none';

if (saveSeoModal) {
    saveSeoModal.onclick = () => {
        seoUpdates.title = seoTitleInput.value;
        seoUpdates.description = seoDescInput.value;
        seoUpdates.keywords = seoKeywordsInput.value;
        
        seoUpdates.ogTitle = ogTitleInput.value;
        seoUpdates.ogDescription = ogDescInput.value;
        seoUpdates.ogImage = ogImageInput.value;
        
        markUnsaved();
        seoModal.style.display = 'none';
        showToast('SEO настройки применены. Не забудьте сохранить.', 'success');
    };
}

// --- Project Settings Logic ---
const projectSettingsBtn = document.getElementById('projectSettingsBtn');
const projectSettingsModal = document.getElementById('projectSettingsModal');
const closeProjModal = document.getElementById('closeProjModal');
const saveProjModal = document.getElementById('saveProjModal');
const projTabs = document.querySelectorAll('.proj-tab');
const projTabContents = document.querySelectorAll('.proj-tab-content');

if (projectSettingsBtn) {
    projectSettingsBtn.onclick = async () => {
        projectSettingsModal.style.display = 'flex';
        // Load CSS
        try {
            const cssRes = await fetch(`/api/site-css/${activeSite}`);
            const cssText = await cssRes.text();
            document.getElementById('globalCssEditor').value = cssText;
        } catch(e) {}
        
        // Load Palette/Fonts
        try {
            const settRes = await fetch(`/api/site-settings/${activeSite}`);
            const settings = await settRes.json();
            
            if (settings.palette) {
                Object.entries(settings.palette).forEach(([key, val]) => {
                    const input = document.querySelector(`.palette-input[data-var="${key}"]`);
                    if (input) input.value = val;
                });
            }
            if (settings.fonts) {
                document.getElementById('headerFontSelect').value = settings.fonts.header || 'Inter';
                document.getElementById('bodyFontSelect').value = settings.fonts.body || 'Inter';
            }
        } catch(e) {}
    };
}

projTabs.forEach(tab => {
    tab.onclick = () => {
        projTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        projTabContents.forEach(c => c.style.display = 'none');
        if (target === 'css') document.getElementById('projTabCss').style.display = 'flex';
        if (target === 'palette') document.getElementById('projTabPalette').style.display = 'block';
        if (target === 'fonts') document.getElementById('projTabFonts').style.display = 'block';
    };
});

if (closeProjModal) {
    closeProjModal.onclick = () => projectSettingsModal.style.display = 'none';
}

if (saveProjModal) {
    saveProjModal.onclick = async () => {
        const css = document.getElementById('globalCssEditor').value;
        const palette = {};
        document.querySelectorAll('.palette-input').forEach(input => {
            palette[input.getAttribute('data-var')] = input.value;
        });
        const fonts = {
            header: document.getElementById('headerFontSelect').value,
            body: document.getElementById('bodyFontSelect').value
        };

        const saveBtn = document.getElementById('saveProjModal');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';

        try {
            // Save CSS
            await fetch(`/api/site-css/${activeSite}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: JSON.stringify({ css })
            });

            // Save Palette/Fonts in Settings
            const settRes = await fetch(`/api/site-settings/${activeSite}`);
            const settings = await settRes.json();
            settings.palette = palette;
            settings.fonts = fonts;

            await fetch(`/api/site-settings/${activeSite}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1]
                },
                body: JSON.stringify(settings)
            });

            showToast('Настройки проекта сохранены!', 'success');
            projectSettingsModal.style.display = 'none';
            
            // Refresh preview to show changes
            iframe.src = iframe.src;
        } catch (err) {
            showToast('Ошибка при сохранении', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Применить ко всему проекту';
        }
    };
}
