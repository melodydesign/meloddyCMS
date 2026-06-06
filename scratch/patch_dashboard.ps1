$html = Get-Content public\dashboard.html -Raw -Encoding UTF8

$target1 = @"
                        <button id="openUploadSiteBtn" class="btn" style="padding: 10px 18px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            Загрузить сайт
                        </button>
"@

$replace1 = @"
                        <button id="openUploadSiteBtn" class="btn" style="padding: 10px 18px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            Загрузить сайт
                        </button>
                        <button id="openUploadTemplateBtn" class="btn developer-only-action" style="padding: 10px 18px; border-radius: 8px; display: none; align-items: center; gap: 8px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border);">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            Загрузить шаблон
                        </button>
"@

$target2 = @"
                <!-- Шаблоны разработчика -->
                <div id="templatesSection" style="display: none;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.1rem;">Мои шаблоны</h3>
                    <div id="templatesContainer" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                        <!-- Templates will be populated here -->
                    </div>
                </div>
"@

$replace2 = @"
                <!-- Шаблоны разработчика -->
                <div id="templatesSection" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0; font-size: 1.1rem;">Мои шаблоны</h3>
                    </div>
                    
                    <!-- Tags Filter -->
                    <div id="templateTagsFilter" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.5rem;">
                        <button class="tag-filter-btn active" data-tag="all" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; border: 1px solid var(--border); background: var(--primary); color: white; cursor: pointer;">Все</button>
                    </div>

                    <div id="templatesContainer" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                        <!-- Templates will be populated here -->
                    </div>
                </div>
"@

$html = $html.Replace($target1, $replace1)
$html = $html.Replace($target2, $replace2)

[System.IO.File]::WriteAllText("public\dashboard.html", $html, [System.Text.Encoding]::UTF8)
Write-Host "Done patching dashboard.html"
