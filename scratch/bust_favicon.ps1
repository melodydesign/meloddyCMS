$files = Get-ChildItem "public\*.html"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'href="/favicon.svg"') {
        $content = $content -replace 'href="/favicon.svg"', 'href="/favicon.svg?v=2"'
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
