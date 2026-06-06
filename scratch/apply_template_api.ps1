$js = Get-Content src\routes\sites.js -Raw -Encoding UTF8

$targetStart = "// 2.5 Get Developer Templates"
$targetEnd = "// Save Site as Template"

$startIndex = $js.IndexOf($targetStart)
$endIndex = $js.IndexOf($targetEnd)

if ($startIndex -ne -1 -and $endIndex -ne -1) {
    $before = $js.Substring(0, $startIndex)
    $after = $js.Substring($endIndex)
    
    $replacement = Get-Content scratch\template_api.js -Raw -Encoding UTF8
    
    $newJs = $before + $replacement + "`r`n`r`n" + $after
    [System.IO.File]::WriteAllText("src\routes\sites.js", $newJs, [System.Text.Encoding]::UTF8)
    Write-Host "Done replacing template API"
} else {
    Write-Host "Target strings not found!"
}
