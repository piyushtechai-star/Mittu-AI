"""Reset today's reading count for the reviewer test account only (production Firestore db 'mittuai').
Run with the backend venv (it has google-cloud-firestore) and the gcloud ADC:
  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\Users\\Piyush\\tools\\gcloud-config\\application_default_credentials.json"
  $env:GOOGLE_CLOUD_QUOTA_PROJECT="colorjoy-app"
  & "backend\\.venv\\Scripts\\python.exe" "tools\\gcp\\reset-reviewer.py"
"""
import datetime
import hashlib

from google.cloud import firestore

db = firestore.Client(project="colorjoy-app", database="mittuai")
today = (datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d")
for phone in ("9999988888", "+919999988888", "919999988888"):
    uid = "p_" + hashlib.sha256(f"mittuai:{phone}".encode()).hexdigest()[:24]
    ref = db.document(f"users/{uid}/daily/{today}")
    snap = ref.get()
    if snap.exists:
        print(phone, uid, today, "before:", snap.to_dict())
        ref.update({"reading": 0})
        print("after:", ref.get().to_dict())
