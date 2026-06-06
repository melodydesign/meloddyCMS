$SERVER = "195.209.214.15"
$USER = "ubuntuuser"
$PASSWORD = "82euCWba18UM"
$HOSTKEY = "ssh-ed25519 255 SHA256:UrcF0NVcmCcbLYK+tuDYdqoZbP/QKdCPJn5syZNA7yw"
$REMOTE_DIR = "meloddy-cms"
$PSCP = ".\pscp.exe"

$htmlFiles = @(
    "public/index.html",
    "public/login.html",
    "public/register.html",
    "public/dashboard.html",
    "public/admin.html",
    "public/docs.html",
    "public/settings.html",
    "public/profile.html",
    "public/file-manager.html",
    "public/visual-editor.html"
)

foreach ($file in $htmlFiles) {
    $remotePath = "/home/$USER/$REMOTE_DIR/" + $file.Replace("\", "/")
    Write-Host "  > $file" -ForegroundColor Gray -NoNewline
    & $PSCP -batch -pw $PASSWORD -hostkey $HOSTKEY $file ${USER}@${SERVER}:$remotePath 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAIL" -ForegroundColor Red
    }
}

Write-Host "Done!" -ForegroundColor Cyan
