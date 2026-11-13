# Builds Mittu's signed Play AAB on Google Cloud Build (about 20 minutes) and downloads it to builds\.
# Needs the one-time mittuai-build-setup.ps1 first. Raise android.versionCode in mobile\app.json before every Play upload.
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-build-aab.ps1"
# gcloud prints progress on stderr, which Windows PowerShell 5.1 treats as errors under ErrorActionPreference Stop,
# so this script checks exit codes instead.
$g = 'C:\Users\Piyush\tools\g.ps1'
$mobile = (Resolve-Path (Join-Path $PSScriptRoot '..\..\mobile')).Path
$out = Join-Path $PSScriptRoot '..\..\builds'
if ([IO.File]::ReadAllText((Join-Path $mobile 'cloudbuild-release.yaml')).Contains('MY_KEY_ALIAS')) {
  Write-Host 'Run tools\gcp\mittuai-build-setup.ps1 first (the key alias is not filled in).' -ForegroundColor Red; exit 1
}
$vc = (Get-Content (Join-Path $mobile 'app.json') -Raw | ConvertFrom-Json).expo.android.versionCode
Write-Host "Building versionCode $vc on Cloud Build (about 20 minutes)..."
Push-Location $mobile
& $g builds submit --config cloudbuild-release.yaml --project=colorjoy-app --region=asia-south1 .
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Write-Host 'Cloud Build failed (see the log above / the console link).' -ForegroundColor Red; exit 1 }
New-Item -ItemType Directory -Force $out | Out-Null
$dest = Join-Path (Resolve-Path $out).Path "mittuai-$vc.aab"
& $g storage cp gs://mittuai-builds/app-release.aab $dest
if ($LASTEXITCODE -ne 0) { Write-Host 'Download failed.' -ForegroundColor Red; exit 1 }
Write-Host "AAB: $dest" -ForegroundColor Green
