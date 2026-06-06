$files = @(
    "admin.html",
    "docs.html",
    "file-manager.html",
    "index.html",
    "login.html",
    "offer.html",
    "privacy.html",
    "register.html",
    "settings.html",
    "terms.html",
    "visual-editor.html"
)

$injectString = "    <div class=`"grid-bg`"></div>`n    <div class=`"ambient-glow`"></div>"

foreach ($file in $files) {
    $path = "public\$file"
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        
        if ($content -notmatch "grid-bg") {
            if ($content -match '<main class="main-content">') {
                $content = $content -replace '<main class="main-content">', "<main class=`"main-content`">`n$injectString"
            } elseif ($content -match '<main>') {
                $content = $content -replace '<main>', "<main>`n$injectString"
            } elseif ($content -match '<body[^>]*>') {
                $content = $content -replace '(<body[^>]*>)', "`$1`n$injectString"
            }
            Set-Content -Path $path -Value $content -NoNewline
            Write-Host "Updated $file"
        } else {
            Write-Host "Skipped $file (already has grid-bg)"
        }
    }
}
