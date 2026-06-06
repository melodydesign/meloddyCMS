$files = @(
    "public/dashboard.html",
    "public/js/dashboard.js",
    "public/js/dashboard_v2.js",
    "src/routes/sites.js",
    "src/services/telegram.js",
    "public/css/style.css",
    "public/settings.html",
    "public/docs.html",
    "public/index.html",
    "public/kb.html",
    "public/register.html",
    "public/css/landing.css",
    "public/css/auth.css",
    "public/login.html",
    "public/favicon.svg"
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
