$r = Invoke-WebRequest -Uri 'https://meloddy-crm.ru/favicon.svg' -UseBasicParsing -TimeoutSec 10
Write-Host "Favicon: HTTP $($r.StatusCode) | $($r.Content.Length) bytes"
Write-Host "Content: $($r.Content.Substring(0, 80))..."
