# One-time setup for building Mittu's Play AAB on Google Cloud Build (replaces EAS cloud builds).
# Run it yourself after downloading the keystore from EAS:
#   cd "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\mobile"; npx eas-cli credentials
#     -> Android -> production -> Keystore -> Download   (note the keystore password, key alias and key password)
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-build-setup.ps1" -Keystore "<path to the downloaded .jks>"
# Creates ONLY Mittu's own things in colorjoy-app: bucket gs://mittuai-builds, secrets mittuai-store-pass / mittuai-key-pass.
# Never touches ColorJoy's bucket, Firestore or secrets. The build service accounts get read access to these two
# secrets only (not to every secret in the project).
param([Parameter(Mandatory = $true)][string]$Keystore)
$ErrorActionPreference = 'Stop'
$g = 'C:\Users\Piyush\tools\g.ps1'
$project = 'colorjoy-app'
$bucket = 'gs://mittuai-builds'
$yaml = Join-Path $PSScriptRoot '..\..\mobile\cloudbuild-release.yaml'
$sas = @('319635525745@cloudbuild.gserviceaccount.com', '319635525745-compute@developer.gserviceaccount.com')

if (-not (Test-Path $Keystore)) { throw "Keystore not found: $Keystore" }

Write-Host '1/5 Enabling Cloud Build and Secret Manager...'
& $g services enable cloudbuild.googleapis.com secretmanager.googleapis.com --project=$project

Write-Host '2/5 Bucket gs://mittuai-builds (private) + keystore...'
$exists = & $g storage buckets describe $bucket --project=$project 2>&1 | Select-String 'name:'
if (-not $exists) {
  & $g storage buckets create $bucket --project=$project --location=asia-south1 --uniform-bucket-level-access --public-access-prevention
}
& $g storage cp $Keystore "$bucket/keys/upload.jks"

Write-Host '3/5 Passwords (typed here, stored only in Secret Manager)...'
function Read-Plain($prompt) {
  $s = Read-Host -AsSecureString $prompt
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}
$alias = Read-Host 'Key alias (shown by eas credentials)'
foreach ($pair in @(@('mittuai-store-pass', 'Keystore password'), @('mittuai-key-pass', 'Key password'))) {
  $name = $pair[0]
  $tmp = [IO.Path]::GetTempFileName()
  try {
    [IO.File]::WriteAllText($tmp, (Read-Plain $pair[1]))   # no trailing newline
    $has = & $g secrets describe $name --project=$project 2>&1 | Select-String 'name:'
    if ($has) { & $g secrets versions add $name --project=$project --data-file=$tmp }
    else { & $g secrets create $name --project=$project --replication-policy=automatic --data-file=$tmp }
  } finally { Remove-Item $tmp -Force }
}

Write-Host '4/5 Access for the build service accounts (Mittu secrets + bucket only)...'
foreach ($sa in $sas) {
  foreach ($name in @('mittuai-store-pass', 'mittuai-key-pass')) {
    & $g secrets add-iam-policy-binding $name --project=$project --member="serviceAccount:$sa" --role=roles/secretmanager.secretAccessor | Out-Null
  }
  & $g storage buckets add-iam-policy-binding $bucket --member="serviceAccount:$sa" --role=roles/storage.objectAdmin | Out-Null
}

Write-Host '5/5 Key alias into cloudbuild-release.yaml...'
$text = Get-Content $yaml -Raw
if ($text -match 'MY_KEY_ALIAS') {
  [IO.File]::WriteAllText((Resolve-Path $yaml), ($text -replace 'MY_KEY_ALIAS', $alias))
}
Write-Host 'Done. Next: tools\gcp\mittuai-build-aab.ps1 (Claude can run it).'
