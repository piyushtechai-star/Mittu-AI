# Code-only redeploy of mittuai-api: keeps every env var and secret already on the service.
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-api-redeploy.ps1"
# After EVERY backend deploy: check the Play reviewer login 9999988888 / 123456 still works (guide 03).
$g = 'C:\Users\Piyush\tools\g.ps1'
$backend = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\..\backend'
& $g run deploy mittuai-api --source $backend --project colorjoy-app --region asia-south1 --quiet
Write-Host '== mittuai-api settings now (names only):'
& $g run services describe mittuai-api --project colorjoy-app --region asia-south1 --format 'value(spec.template.spec.containers[0].env[].name)'
