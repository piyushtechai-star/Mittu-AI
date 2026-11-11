# Puts Mittu AI's secrets into Secret Manager (colorjoy-app) and lets the mittuai-api service account read them.
# Values are generated or read from backend\.env and never printed. Run it yourself (Claude may not write secrets):
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-secrets.ps1"
# 1. MITTUAI_JWT_SECRET: created once from 48 random bytes. Re-running keeps it (rotating it signs everyone out).
# 2. SMS_UKEY: HouseofTech's shared VoicenSMS key, already in Secret Manager: read access only.
# 3. Razorpay (when Ayush shares them): put MITTUAI_RAZORPAY_KEY_ID / _KEY_SECRET / _WEBHOOK_SECRET and RAZORPAY_PLAN_ID
#    in backend\.env, run this again, then mittuai-deploy.ps1 mounts them.
$g = 'C:\Users\Piyush\tools\g.ps1'; $P = 'colorjoy-app'
$SA = 'serviceAccount:mittuai-api@colorjoy-app.iam.gserviceaccount.com'
$envFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\..\backend\.env'

function Put-Secret($name, $value) {
  $tmp = [IO.Path]::GetTempFileName()
  try {
    [IO.File]::WriteAllText($tmp, $value)   # no newline at the end
    $exists = & $g secrets describe $name --project $P 2>$null | Select-String '^name:'
    if ($exists) { & $g secrets versions add $name "--data-file=$tmp" --project $P *> $null }
    else { & $g secrets create $name "--data-file=$tmp" --replication-policy=automatic --labels=app=mittuai --project $P *> $null }
    if ($LASTEXITCODE -ne 0) { throw "Secret Manager failed for $name" }
  } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}
function Grant($name) {
  & $g secrets add-iam-policy-binding $name --member=$SA --role=roles/secretmanager.secretAccessor --project $P --quiet *> $null
  Write-Host "mittuai-api can read $name"
}

$jwt = & $g secrets describe MITTUAI_JWT_SECRET --project $P 2>$null | Select-String '^name:'
if (-not $jwt) {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Put-Secret 'MITTUAI_JWT_SECRET' ([Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('='))
  Write-Host 'created MITTUAI_JWT_SECRET'
} else { Write-Host 'MITTUAI_JWT_SECRET exists, kept' }
Grant 'MITTUAI_JWT_SECRET'
Grant 'SMS_UKEY'

if (Test-Path $envFile) {
  $kv = @{}
  foreach ($line in Get-Content $envFile) { if ($line -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') { $kv[$Matches[1]] = $Matches[2] } }
  foreach ($name in 'MITTUAI_RAZORPAY_KEY_ID', 'MITTUAI_RAZORPAY_KEY_SECRET', 'MITTUAI_RAZORPAY_WEBHOOK_SECRET') {
    if ($kv[$name]) { Put-Secret $name $kv[$name]; Grant $name }
  }
}
Write-Host 'Done. Now run mittuai-deploy.ps1 and tell Claude.'
