$htmlFiles = Get-ChildItem -Path "public\*.html"

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Replace anything that looks like <a ... class="promo-btn">Подробнее</a> with the button
    $pattern = '(?i)<a[^>]*class="promo-btn"[^>]*>Подробнее</a>'
    $replacement = '<button onclick="showBetaModal(event)" class="promo-btn" style="width:100%; border:none; cursor:pointer; font-family:inherit; text-align:center;">Подробнее</button>'
    
    if ($content -match $pattern) {
        $content = $content -replace $pattern, $replacement
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated $($file.Name)"
    }
}
Write-Host "Done updating all promo buttons!"
