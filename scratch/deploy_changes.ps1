$files = @(
    "public/css/style.css",
    "public/js/theme.js",
    "public/profile.html",
    "public/js/utils.js",
    "public/login.html",
    "public/register.html",
    "public/dashboard.html",
    "public/js/dashboard.js",
    "public/js/dashboard_v2.js",
    "src/routes/sites.js",
    "src/utils/db.js",
    "public/admin.html",
    "public/docs.html",
    "public/file-manager.html",
    "public/index.html",
    "public/css/landing.css",
    "public/offer.html",
    "public/terms.html",
    "public/privacy.html",
    "public/settings.html",
    "public/visual-editor.html"
)

foreach ($file in $files) {
    Write-Host "Uploading $file..."
    $fileWin = $file -replace "/", "\"
    $cmd = ".\pscp.exe -batch -pw 82euCWba18UM -hostkey `"ssh-ed25519 255 SHA256:UrcF0NVcmCcbLYK+tuDYdqoZbP/QKdCPJn5syZNA7yw`" .\$fileWin ubuntuuser@195.209.214.15:/home/ubuntuuser/meloddy-cms/$file"
    Invoke-Expression $cmd
}

Write-Host "Restarting PM2..."
$pm2Cmd = ".\plink.exe -batch -pw 82euCWba18UM -hostkey `"ssh-ed25519 255 SHA256:UrcF0NVcmCcbLYK+tuDYdqoZbP/QKdCPJn5syZNA7yw`" ubuntuuser@195.209.214.15 `"pm2 restart meloddy-cms`""
Invoke-Expression $pm2Cmd

Write-Host "Deploy completed."

