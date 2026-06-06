$html = Get-Content public\dashboard.html -Raw -Encoding UTF8

$targetModal = @"
    <!-- Delete Client Modal -->
"@

$replaceModal = @"
    <!-- Upload Template Modal -->
    <div id="uploadTemplateModal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Загрузить шаблон</h3>
                <button id="closeUploadTemplateModal" class="promo-close">&times;</button>
            </div>
            <form id="uploadTemplateForm">
                <div class="form-field">
                    <label class="form-label">Название шаблона</label>
                    <input type="text" id="templateNameInput" placeholder="Например: Корпоративный сайт" required>
                </div>
                <div class="form-field">
                    <label class="form-label">Описание</label>
                    <textarea id="templateDescInput" rows="2" placeholder="Краткое описание..."></textarea>
                </div>
                <div class="form-field">
                    <label class="form-label">Теги (до 5 шт., через запятую)</label>
                    <input type="text" id="templateTagsInput" placeholder="Landing, Shop, Blog...">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Напишите тег и сохраните его. Можно добавить до 5 тегов.</div>
                </div>
                <div class="form-field">
                    <label class="form-label">Архив шаблона (.zip)</label>
                    <div class="file-upload-wrapper" style="position: relative;">
                        <input type="file" id="templateFileInput" accept=".zip" required style="padding: 10px; border: 1px dashed var(--border); background: var(--bg-hover); color: var(--text-main); cursor: pointer; width: 100%;">
                    </div>
                </div>
                <button type="submit" class="btn" style="width: 100%; margin-top: 10px;">Загрузить шаблон</button>
            </form>
        </div>
    </div>

    <!-- Delete Client Modal -->
"@

$html = $html.Replace($targetModal, $replaceModal)

[System.IO.File]::WriteAllText("public\dashboard.html", $html, [System.Text.Encoding]::UTF8)
Write-Host "Done adding template modal to dashboard.html"
