$files = Get-ChildItem -Path "public" -Filter "*.html"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $content -replace '<a href="/profile.html" class="promo-btn">Подробнее</a>', '<a href="#" onclick="showBetaModal(event)" class="promo-btn">Подробнее</a>'
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated $($file.Name)"
}
