# Checks the live mittuai-api after a deploy (guide 03 + 12). Uses the Play reviewer login.
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\smoke-test.ps1" [-Reading]
# -Reading also makes ONE real reading (1 Gemini call + 1 TTS call, uses 1 of the reviewer's daily readings).
param([switch]$Reading)
$ErrorActionPreference = 'Stop'
$B = 'https://mittuai-api-319635525745.asia-south1.run.app'
function Check($name, $ok) { if ($ok) { Write-Host "OK    $name" -ForegroundColor Green } else { Write-Host "FAIL  $name" -ForegroundColor Red; $script:failed = $true } }
$failed = $false

Check 'health' ((Invoke-RestMethod "$B/health").ok)
$cfg = Invoke-RestMethod "$B/config"
Check "config (plan $($cfg.plan.name), $($cfg.readingsPerDay)/day, billing $($cfg.billingMode))" ($cfg.billingMode -eq 'razorpay')
try { Invoke-WebRequest "$B/docs" -UseBasicParsing | Out-Null; Check 'no /docs in production' $false } catch { Check 'no /docs in production' $true }

$json = @{ phone = '9999988888'; code = '123456' } | ConvertTo-Json
$tok = (Invoke-RestMethod "$B/auth/otp/verify" -Method Post -ContentType 'application/json' -Body $json).token
Check 'reviewer login 9999988888 / 123456' ([bool]$tok)
$H = @{ Authorization = "Bearer $tok" }
$me = Invoke-RestMethod "$B/me" -Headers $H
Check "me: active=$($me.subscription.active) next=$($me.next) readings left=$($me.readingsLeftToday)" ($me.subscription.active)
if ($me.next -eq 'name') { $me = Invoke-RestMethod "$B/me/name" -Method Post -Headers $H -ContentType 'application/json' -Body '{"name":"Play Reviewer"}'; Check 'reviewer name set' ($me.next -in 'home','birth') }

$off = Invoke-RestMethod "$B/reading" -Method Post -Headers $H -ContentType 'application/json' -Body '{"question":"1 + 1","category":"general"}'
Check 'off-topic "1 + 1" answered for free' ($off.kind -eq 'offtopic')
$sup = Invoke-RestMethod "$B/reading" -Method Post -Headers $H -ContentType 'application/json' -Body '{"question":"I want to die","category":"general"}'
Check 'self-harm question gets helplines' ($sup.kind -eq 'support')

if ($Reading) {
  $t = Get-Date
  $r = Invoke-RestMethod "$B/reading" -Method Post -Headers $H -ContentType 'application/json' -Body '{"question":"Kya is saal nayi job milegi?","category":"career"}' -TimeoutSec 90
  $secs = [math]::Round(((Get-Date) - $t).TotalSeconds, 1)
  Check "real reading in ${secs}s: $($r.card.name) ($($r.orientation)), $(($r.text -split '\s+').Count) words" ($r.kind -eq 'reading')
  Write-Host "      $($r.text)"
  Check "voice clip + $(@($r.word_times).Count) word times" ([bool]$r.audio_url)
  if ($r.audio_url) {
    $a = Invoke-WebRequest $r.audio_url -UseBasicParsing
    Check "signed voice URL plays ($([math]::Round($a.RawContentLength / 1KB)) KB, $($a.Headers['Content-Type']))" ($a.StatusCode -eq 200)
    try { Invoke-WebRequest ($r.audio_url -replace 'X-Goog-Signature=[0-9a-f]{8}', 'X-Goog-Signature=00000000') -UseBasicParsing | Out-Null; Check 'tampered voice URL refused' $false }
    catch { Check 'tampered voice URL refused' $true }
  }
  Check 'history shows it' (@(Invoke-RestMethod "$B/readings" -Headers $H).Count -ge 1)
}
if ($failed) { exit 1 } else { Write-Host 'All checks passed.' -ForegroundColor Green }
