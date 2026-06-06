$js = Get-Content public\js\dashboard.js -Raw -Encoding UTF8

$targetJs = @"
const siteMenuModal = document.getElementById('siteMenuModal');
"@

$replaceJs = @"
const siteMenuModal = document.getElementById('siteMenuModal');

// --- Developer Tabs Logic ---
function updateActionVisibility(tab) {
    document.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('projectsSection').style.display = 'none';
    document.getElementById('templatesSection').style.display = 'none';
    document.getElementById('requestsSection').style.display = 'none';
    
    document.getElementById('openUploadSiteBtn').style.display = 'none';
    document.getElementById('openUploadTemplateBtn').style.display = 'none';
    
    if (tab === 'projects') {
        document.getElementById('tabProjects').classList.add('active');
        document.getElementById('projectsSection').style.display = 'block';
        document.getElementById('openUploadSiteBtn').style.display = 'flex';
    } else if (tab === 'templates') {
        document.getElementById('tabTemplates').classList.add('active');
        document.getElementById('templatesSection').style.display = 'block';
        document.getElementById('openUploadTemplateBtn').style.display = 'flex';
        loadTemplates();
    } else if (tab === 'requests') {
        document.getElementById('tabRequests').classList.add('active');
        document.getElementById('requestsSection').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tabProjects')?.addEventListener('click', () => updateActionVisibility('projects'));
    document.getElementById('tabTemplates')?.addEventListener('click', () => updateActionVisibility('templates'));
    document.getElementById('tabRequests')?.addEventListener('click', () => updateActionVisibility('requests'));
    
    // Initial state
    if (document.getElementById('openUploadSiteBtn')) {
        document.getElementById('openUploadSiteBtn').style.display = 'flex';
    }
});
"@

$js = $js.Replace($targetJs, $replaceJs)

[System.IO.File]::WriteAllText("public\js\dashboard.js", $js, [System.Text.Encoding]::UTF8)
Write-Host "Done patching dashboard.js for tabs"
