# Mittu AI web app (mittuai-web)

Public test link for the team: https://mittuai-web-319635525745.asia-south1.run.app
It is the Expo web build of `mobile/`, served by nginx on Cloud Run (`mittuai-web`, colorjoy-app, asia-south1), and
it calls the live backend `mittuai-api`. Login: reviewer number 9999988888, code 123456.

```
Dockerfile              nginx image that serves dist/
nginx.conf              single-page-app routing (every path falls back to index.html) and caching
security-headers.conf   CSP (only the app, mittuai-api, signed voice clips on storage.googleapis.com, Razorpay), no framing, HSTS
dist/                   the exported web build (generated, not committed)
```

## Rebuild and publish (PowerShell)
```powershell
cd "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\mobile"
$env:EXPO_PUBLIC_API_URL="https://mittuai-api-319635525745.asia-south1.run.app"
npx expo export --platform web --output-dir ..\web-hosting\dist --clear
powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-web-deploy.ps1"
```
Re-export after **every** app change. If the API URL or Razorpay hosts change, update the CSP in `security-headers.conf`.
Payments don't work on the web (Razorpay Checkout is native); the reviewer account already has access.
