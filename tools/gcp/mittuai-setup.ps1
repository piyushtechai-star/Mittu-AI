# One-time Google Cloud setup for Mittu AI in colorjoy-app (asia-south1). ALREADY DONE on 2026-11-12; kept so it can
# be repeated or audited. Safe to re-run: "already exists" errors are harmless.
#   powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-setup.ps1"
$g = 'C:\Users\Piyush\tools\g.ps1'; $P = 'colorjoy-app'; $R = 'asia-south1'
$SA = "mittuai-api@$P.iam.gserviceaccount.com"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $here '..\..\backend'

& $g services enable texttospeech.googleapis.com aiplatform.googleapis.com --project $P
# Firestore: Mittu's own named database + the History index (uid asc, created_at desc)
& $g firestore databases create --database=mittuai --location=$R --type=firestore-native --project $P
& $g firestore indexes composite create --database=mittuai --collection-group=readings --query-scope=collection `
  '--field-config=field-path=uid,order=ascending' '--field-config=field-path=created_at,order=descending' --project $P --async
# Private voice bucket: no public access, clips deleted after 7 days
& $g storage buckets create gs://mittuai-voice --location=$R --uniform-bucket-level-access --public-access-prevention --project $P
& $g storage buckets update gs://mittuai-voice "--lifecycle-file=$backend\voice-bucket-lifecycle.json" '--update-labels=app=mittuai'
# Service account with only what Mittu needs
& $g iam service-accounts create mittuai-api --display-name 'Mittu AI API (Cloud Run)' --project $P
& $g projects add-iam-policy-binding $P --member "serviceAccount:$SA" --role roles/datastore.user `
  --condition-from-file (Join-Path $here 'mittuai-db-condition.json')
& $g projects add-iam-policy-binding $P --member "serviceAccount:$SA" --role roles/aiplatform.user --condition=None
& $g storage buckets add-iam-policy-binding gs://mittuai-voice --member "serviceAccount:$SA" --role roles/storage.objectAdmin
& $g iam service-accounts add-iam-policy-binding $SA --member "serviceAccount:$SA" --role roles/iam.serviceAccountTokenCreator --project $P
Write-Host '== mittuai-api bindings:'
& $g projects get-iam-policy $P --flatten 'bindings[].members' --filter 'bindings.members:mittuai-api' --format 'table(bindings.role,bindings.condition.title)'
