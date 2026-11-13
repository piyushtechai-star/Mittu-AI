# Builds Mittu's signed Play AAB on Google Cloud Build (about 20 minutes) and downloads it to builds\.
# Needs the one-time mittuai-build-setup.ps1 first. Raise android.versionCode in mobile\app.json before every Play upload.
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-build-aab.ps1"
$ErrorActionPreference = 'Stop'
$g = 'C:\Users\Piyush\tools\g.ps1'
$mobile = Resolve-Path (Join-Path $PSScriptRoot '..\..\mobile')
$out = Join-Path $PSScriptRoot '..\..\builds'
if ((Get-Content (Join-Path $mobile 'cloudbuild-release.yaml') -Raw) -match 'MY_KEY_ALIAS') {
  throw 'Run tools\gcp\mittuai-build-setup.ps1 first (the key alias is not filled in).'
}
$vc = (Get-Content (Join-Path $mobile 'app.json') -Raw | ConvertFrom-Json).expo.android.versionCode
Write-Host "Building versionCode $vc on Cloud Build..."
Push-Location $mobile
try {
  & $g builds submit --config cloudbuild-release.yaml --project=colorjoy-app --region=asia-south1 .
  if ($LASTEXITCODE -ne 0) { throw 'Cloud Build failed (see the log link above).' }
} finally { Pop-Location }
New-Item -ItemType Directory -Force $out | Out-Null
$dest = Join-Path $out "mittuai-$vc.aab"
& $g storage cp gs://mittuai-builds/app-release.aab $dest
Write-Host "AAB: $dest"
