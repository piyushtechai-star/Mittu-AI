import os, sys, time
sys.path.insert(0, ".")
os.environ.update(STORE="memory", TTS_PROVIDER="google", OTP_MODE="console", BILLING_MODE="fake", AI_PROVIDER="fake",
                  GOOGLE_CLOUD_QUOTA_PROJECT="colorjoy-app",
                  GOOGLE_APPLICATION_CREDENTIALS=r"C:\Users\Piyush\tools\gcloud-config\application_default_credentials.json")
from app import settings, tts
text = ("Kuurr! Suno suno, Riya ji... Mittu ne aapke liye Taara ka card nikaala hai! Yeh card nayi roshni aur umeed ka "
        "sanket deta hai. Career mein nayi job milne ki poori sambhavna dikh rahi hai. Apne resume ko update karo aur "
        "confidence ke saath interview do. Lucky color, chamkila peela... lucky number, satrah!")
for voice in ["hi-IN-Neural2-A", "hi-IN-Neural2-D", "hi-IN-Wavenet-A", "hi-IN-Wavenet-D"]:
    settings.TTS_VOICE = voice
    t = time.time()
    try:
        audio, times, ext = tts.synthesise(text)
        open(f"../store/voice-samples/{voice}-pitch6.{ext}", "wb").write(audio)
        print(f"OK {voice}: {len(audio)//1024} KB, {time.time()-t:.1f}s, word times: {'yes, last word at %.1fs' % times[-1] if times else 'NONE'}")
    except Exception as e:
        print(f"FAIL {voice}: {str(e)[:200]}")
