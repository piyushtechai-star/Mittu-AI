# One-time setup for building Mittu's Play AAB on Google Cloud Build (replaces EAS cloud builds).
# Run it yourself after downloading the keystore from EAS:
#   cd "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\mobile"; npx eas-cli credentials
#     -> Android -> production -> Keystore -> Download existing keystore   (note the keystore password, key alias and key password)
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-build-setup.ps1" -Keystore "<path to the downloaded .jks>"
# Creates ONLY Mittu's own things in colorjoy-app: bucket gs://mittuai-builds, secrets mittuai-store-pass / mittuai-key-pass.
# Never touches ColorJoy's bucket, Firestore or secrets. The build service accounts get read access to these two
# secrets only (not to every secret in the project). Safe to run again: existing things are reused.
#
# Note: gcloud prints progress on stderr. Windows PowerShell 5.1 turns that into errors when ErrorActionPreference is
# Stop, so this script keeps the default and checks each command's exit code instead.
param([Parameter(Mandatory = $true)][string]$Keystore)
$g = 'C:\Users\Piyush\tools\g.ps1'
$project = 'colorjoy-app'
$bucket = 'gs://mittuai-builds'
$yaml = Join-Path $PSScriptRoot '..\..\mobile\cloudbuild-release.yaml'
$sas = @('319635525745@cloudbuild.gserviceaccount.com', '319635525745-compute@developer.gserviceaccount.com')

function Run([string]$what) {
  # Runs gcloud with the remaining arguments; stops the script with a clear message if it fails.
  $out = & $g @args
  if ($LASTEXITCODE -ne 0) {
    $out | ForEach-Object { Write-Host "  $_" }
    Write-Host "FAILED: $what" -ForegroundColor Red
    exit 1
  }
  Write-Host "  ok: $what"
}
function Exists { & $g @args *> $null; return ($LASTEXITCODE -eq 0) }

if (-not (Test-Path $Keystore)) { Write-Host "Keystore not found: $Keystore" -ForegroundColor Red; exit 1 }

Write-Host '1/5 Enabling Cloud Build and Secret Manager...'
Run 'enable APIs' services enable cloudbuild.googleapis.com secretmanager.googleapis.com --project=$project

Write-Host '2/5 Private bucket gs://mittuai-builds + keystore...'
if (-not (Exists storage buckets describe $bucket --project=$project)) {
  Run 'create bucket' storage buckets create $bucket --project=$project --location=asia-south1 --uniform-bucket-level-access --public-access-prevention
}
Run 'upload keystore' storage cp $Keystore "$bucket/keys/upload.jks"

Write-Host '3/5 Key alias and passwords (stored only in Secret Manager)...'
function Read-Plain($prompt) {
  $s = Read-Host -AsSecureString $prompt
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}
$alias = (Read-Host 'Key alias (shown by eas credentials)').Trim()
if (-not $alias) { Write-Host 'No alias given.' -ForegroundColor Red; exit 1 }
foreach ($pair in @(@('mittuai-store-pass', 'Keystore password'), @('mittuai-key-pass', 'Key password'))) {
  $name = $pair[0]
  $pw = Read-Plain $pair[1]
  if (-not $pw) { Write-Host "No $($pair[1]) given." -ForegroundColor Red; exit 1 }
  $tmp = [IO.Path]::GetTempFileName()
  try {
    [IO.File]::WriteAllText($tmp, $pw)   # no trailing newline
    if (Exists secrets describe $name --project=$project) {
      Run "new version of $name" secrets versions add $name --project=$project --data-file=$tmp
    } else {
      Run "create $name" secrets create $name --project=$project --replication-policy=automatic --data-file=$tmp
    }
  } finally { Remove-Item $tmp -Force }
}

Write-Host '4/5 Access for the build service accounts (Mittu secrets + bucket only)...'
foreach ($sa in $sas) {
  foreach ($name in @('mittuai-store-pass', 'mittuai-key-pass')) {
    Run "$name -> $sa" secrets add-iam-policy-binding $name --project=$project --member="serviceAccount:$sa" --role=roles/secretmanager.secretAccessor
  }
  Run "bucket -> $sa" storage buckets add-iam-policy-binding $bucket --member="serviceAccount:$sa" --role=roles/storage.objectAdmin
}

Write-Host '5/5 Key alias into cloudbuild-release.yaml...'
$path = (Resolve-Path $yaml).Path
$text = [IO.File]::ReadAllText($path)
if ($text.Contains('MY_KEY_ALIAS')) {
  [IO.File]::WriteAllText($path, $text.Replace('MY_KEY_ALIAS', $alias))
  Write-Host '  ok: alias written'
} else { Write-Host '  alias was already filled in' }
Write-Host 'Done. Tell Claude "done": it runs tools\gcp\mittuai-build-aab.ps1 next.' -ForegroundColor Green
