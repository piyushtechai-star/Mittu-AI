# Publishes the team web app (Expo web export in web-hosting\dist) as Cloud Run service mittuai-web.
# Claude does the export; run this yourself:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-web-deploy.ps1"
$g = 'C:\Users\Piyush\tools\g.ps1'
$site = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\..\web-hosting'
if (-not (Test-Path (Join-Path $site 'dist\index.html'))) { throw 'Run the web export first (web-hosting\dist\index.html missing).' }
& $g run deploy mittuai-web --source $site --project colorjoy-app --region asia-south1 `
  --allow-unauthenticated --cpu-throttling --min-instances 0 --max-instances 2 --memory 256Mi --labels app=mittuai --quiet
Write-Host '== Web app URL:'
& $g run services describe mittuai-web --project colorjoy-app --region asia-south1 --format 'value(status.url)'
