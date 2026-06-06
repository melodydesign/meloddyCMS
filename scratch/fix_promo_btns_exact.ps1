$htmlFiles = Get-ChildItem -Path "public\*.html"
$count = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    $target1 = '<a href="/profile.html" class="promo-btn">Подробнее</a>'
    $target2 = '<a href="#" class="promo-btn">Подробнее</a>'
    $replacement = '<button onclick="showBetaModal(event)" class="promo-btn" style="width:100%; border:none; cursor:pointer; font-family:inherit; text-align:center;">Подробнее</button>'
    
    $changed = $false
    if ($content.Contains($target1)) {
        $content = $content.Replace($target1, $replacement)
        $changed = $true
    }
    if ($content.Contains($target2)) {
        $content = $content.Replace($target2, $replacement)
        $changed = $true
    }
    
    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated $($file.Name)"
        $count++
    }
}
Write-Host "Done updating $count files!"
