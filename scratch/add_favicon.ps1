$faviconLink = '    <link rel="icon" type="image/svg+xml" href="/favicon.svg">'
$files = Get-ChildItem -Path "public" -Filter "*.html"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    if ($content -match '<link rel="icon"') {
        Write-Host "SKIP $($file.Name) - already has favicon" -ForegroundColor Yellow
        continue
    }
    
    $content = $content -replace '(<meta charset="UTF-8">)', "`$1`n$faviconLink"
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "OK   $($file.Name)" -ForegroundColor Green
}

Write-Host "`nDone!" -ForegroundColor Cyan
