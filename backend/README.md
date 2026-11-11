# mittuai-api

FastAPI on Cloud Run, project `colorjoy-app`, region `asia-south1`. Only touch Mittu's own resources.

## One-time setup (gcloud: `C:\Users\Piyush\tools\g.ps1`, log in first with `gcloud-login.ps1`)
```powershell
$P="colorjoy-app"; $R="asia-south1"; $SA="mittuai-api@$P.iam.gserviceaccount.com"
# APIs (ask Ayush before enabling anything new on the shared project)
gcloud services enable aiplatform.googleapis.com texttospeech.googleapis.com --project $P
# Firestore named database + the history index (uid + created_at desc)
gcloud firestore databases create --database=mittuai --location=$R --project $P
gcloud firestore indexes composite create --database=mittuai --collection-group=readings --field-config=field-path=uid,order=ascending --field-config=field-path=created_at,order=descending --project $P
# Private voice bucket: no public access, clips deleted after 7 days
gcloud storage buckets create gs://mittuai-voice --location=$R --uniform-bucket-level-access --public-access-prevention --project $P
gcloud storage buckets update gs://mittuai-voice --lifecycle-file=voice-bucket-lifecycle.json
# Service account with only what Mittu needs
gcloud iam service-accounts create mittuai-api --project $P
gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=roles/datastore.user --condition-from-file=mittuai-db-condition.json
gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=roles/aiplatform.user
gcloud storage buckets add-iam-policy-binding gs://mittuai-voice --member="serviceAccount:$SA" --role=roles/storage.objectAdmin
gcloud iam service-accounts add-iam-policy-binding $SA --member="serviceAccount:$SA" --role=roles/iam.serviceAccountTokenCreator   # signed URLs without a key file
# Secrets (values never in code or chat); grant the SA secretAccessor on each
#   MITTUAI_JWT_SECRET (32+ random chars), SMS_UKEY, MITTUAI_RAZORPAY_KEY_ID, MITTUAI_RAZORPAY_KEY_SECRET, MITTUAI_RAZORPAY_WEBHOOK_SECRET
```
`mittuai-db-condition.json` (Datastore User only on Mittu's database; on PowerShell 5.1 conditions must come from a file):
```json
{ "title": "mittuai-db-only", "expression": "resource.name.startsWith(\"projects/colorjoy-app/databases/mittuai\")" }
```

## Deploy (CPU only during requests, no always-on instances)
```powershell
gcloud run deploy mittuai-api --source . --region $R --project $P --service-account $SA --allow-unauthenticated `
  --max-instances 5 --concurrency 40 --memory 512Mi `
  --set-env-vars "STORE=firestore,OTP_MODE=sms,BILLING_MODE=razorpay,AI_PROVIDER=vertex,TTS_PROVIDER=google,READINGS_PER_DAY=5,TRIAL_PRICE_PAISE=100,TRIAL_DAYS=3,PRICE_PAISE=9900,PLAN_NAME=mittuai_99,RAZORPAY_PLAN_ID=plan_xxx" `
  --set-secrets "MITTUAI_JWT_SECRET=MITTUAI_JWT_SECRET:latest,SMS_UKEY=SMS_UKEY:latest,MITTUAI_RAZORPAY_KEY_ID=MITTUAI_RAZORPAY_KEY_ID:latest,MITTUAI_RAZORPAY_KEY_SECRET=MITTUAI_RAZORPAY_KEY_SECRET:latest,MITTUAI_RAZORPAY_WEBHOOK_SECRET=MITTUAI_RAZORPAY_WEBHOOK_SECRET:latest"
```
For code-only redeploys, don't pass `--set-env-vars` / `--set-secrets`, so the existing values are kept.
After **every** deploy: log in with the reviewer number 9999988888 / 123456 (guide 03: if this fails, Google rejects the app).
Razorpay webhook URL: `https://mittuai-api-319635525745.asia-south1.run.app/billing/razorpay-webhook` (events: subscription.authenticated/activated/charged/cancelled/halted/completed, payment.captured).

## Picking Mittu's voice (guide 07)
Try 3-4 hi-IN voices (Neural2 A-D, Wavenet A-F) at pitch +5 to +7, keep the clearest, and set `TTS_VOICE` / `TTS_PITCH`. No code change is needed.

## Spend controls
`READINGS_PER_DAY` per user (enforced here), crisis and off-topic questions answered for free, output token cap, and the reading refunded if Gemini fails. `--max-instances` caps the worst case. Watch Gemini + TTS spend for the first days after each release (guide 15).
