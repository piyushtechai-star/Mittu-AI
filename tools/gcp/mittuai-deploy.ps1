# FULL deploy of the Mittu AI backend to Cloud Run (service mittuai-api, colorjoy-app, asia-south1).
# Sets every env var and mounts every secret that exists. Use it the first time and whenever settings change; for
# code-only updates use mittuai-api-redeploy.ps1 (keeps settings). Run it yourself:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-deploy.ps1"
$g = 'C:\Users\Piyush\tools\g.ps1'; $P = 'colorjoy-app'; $R = 'asia-south1'
$backend = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\..\backend'

# Prices, plan and the daily limit live here (served by /config), so they change without a new app build.
$envVars = @(
  'FIRESTORE_DATABASE=mittuai', 'VERTEX_LOCATION=global', 'GEMINI_MODEL=gemini-3.8-flash',
  # Mittu's voice: Gemini TTS acting the parrot (voice Puck); Cloud TTS Chirp 3 HD Puck (same voice family) is the backup.
  'TTS_PROVIDER=gemini', 'TTS_MODEL=gemini-2.5-flash-tts', 'TTS_VOICE=Puck',
  'TTS_CLOUD_VOICE=hi-IN-Chirp3-HD-Puck', 'TTS_PITCH=6.0', 'TTS_RATE=1.1', 'VOICE_BUCKET=mittuai-voice',
  'READINGS_PER_DAY=5', 'PLAN_NAME=mittuai_99', 'TRIAL_PRICE_PAISE=100', 'TRIAL_DAYS=3', 'PRICE_PAISE=9900',
  'INVOICE_APP_CODE=MIT',
  # Cloud Run serves the web app on two URLs; both must be allowed (a value with a comma needs the ^|^ delimiter below).
  'WEB_ORIGINS=https://mittuai-web-319635525745.asia-south1.run.app,https://mittuai-web-rhwkepqcsa-el.a.run.app'
)
$kv = @{}
$envFile = Join-Path $backend '.env'
if (Test-Path $envFile) { foreach ($line in Get-Content $envFile) { if ($line -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') { $kv[$Matches[1]] = $Matches[2] } } }
if ($kv['RAZORPAY_PLAN_ID']) { $envVars += "RAZORPAY_PLAN_ID=$($kv['RAZORPAY_PLAN_ID'])" }

$secrets = @()
foreach ($name in 'MITTUAI_JWT_SECRET', 'SMS_UKEY', 'MITTUAI_RAZORPAY_KEY_ID', 'MITTUAI_RAZORPAY_KEY_SECRET', 'MITTUAI_RAZORPAY_WEBHOOK_SECRET') {
  if (& $g secrets describe $name --project $P 2>$null | Select-String '^name:') { $secrets += "${name}=${name}:latest" }
}
if (-not ($secrets -match '^MITTUAI_JWT_SECRET=')) { throw 'Run mittuai-secrets.ps1 first (MITTUAI_JWT_SECRET missing).' }

& $g run deploy mittuai-api --source $backend --project $P --region $R `
  --service-account "mittuai-api@$P.iam.gserviceaccount.com" `
  --allow-unauthenticated --cpu-throttling --min-instances 0 --max-instances 5 --concurrency 40 --memory 512Mi `
  --labels app=mittuai --set-env-vars ('^|^' + ($envVars -join '|')) --set-secrets ($secrets -join ',') --quiet
Write-Host '== Deployed. URL:'
& $g run services describe mittuai-api --project $P --region $R --format 'value(status.url)'
Write-Host "== Mounted secrets: $(($secrets | ForEach-Object { $_.Split('=')[0] }) -join ', ')"
