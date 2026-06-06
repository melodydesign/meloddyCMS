$html = Get-Content public\dashboard.html -Raw -Encoding UTF8

$targetHtml = @"
                        <button id="openUploadSiteBtn" class="btn" style="padding: 10px 18px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
"@

$replaceHtml = @"
                        <button id="openUploadTemplateBtn" class="btn btn-outline developer-only-action" style="padding: 10px 18px; border-radius: 8px; display: none; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            Загрузить шаблон
                        </button>
                        <button id="openUploadSiteBtn" class="btn" style="padding: 10px 18px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
"@

if ($html.Contains($targetHtml)) {
    $html = $html.Replace($targetHtml, $replaceHtml)
    [System.IO.File]::WriteAllText("public\dashboard.html", $html, [System.Text.Encoding]::UTF8)
    Write-Host "Button injected successfully."
} else {
    Write-Host "Target HTML not found."
}
