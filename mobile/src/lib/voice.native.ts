// Speak your question (copied from Naksh). Phones: expo-speech-recognition (Android's speech service, iOS Speech
// framework); web version: voice.ts. The native module only exists in builds made after it was added; in an older
// build (or Expo Go) the mic button stays hidden. Only the text is used; no audio is stored or sent to our server.
import type { ExpoSpeechRecognitionModuleType } from 'expo-speech-recognition/build/ExpoSpeechRecognitionModule.types';

let Speech: ExpoSpeechRecognitionModuleType | undefined;
try {
  // A plain import would throw at load time when the native module is missing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {}

export const voiceSupported = !!Speech;

/** Asks for microphone + speech permission (Meet Mittu screen). Resolves true if granted. */
export async function requestMic(): Promise<boolean> {
  if (!Speech) return false;
  return Speech.requestPermissionsAsync().then((p) => p.granted, () => false);
}

/** Listens once; onText gets the transcript so far (live while speaking). Returns a stop function.
 *  onLevel (optional) gets the mic loudness 0-1 about 10x a second, for the waveform rings.
 *  en-IN keeps Hinglish in Roman letters ("kya mujhe naukri milegi"), which is how Mittu's readings are written. */
export function listen(onText: (text: string) => void, onEnd: () => void, onLevel?: (level: number) => void): () => void {
  const S = Speech;
  if (!S) {
    onEnd();
    return () => {};
  }
  let done = false;
  const subs: { remove: () => void }[] = [];
  const finish = () => {
    if (done) return;
    done = true;
    subs.forEach((s) => s.remove());
    onEnd();
  };
  subs.push(S.addListener('result', (e) => onText(e.results[0]?.transcript ?? '')));
  subs.push(S.addListener('end', finish));
  subs.push(S.addListener('error', finish));
  // volumechange: about -2 (silence) to 10 (loud)
  if (onLevel) subs.push(S.addListener('volumechange', (e) => onLevel(Math.max(0, Math.min(1, (e.value + 2) / 12)))));
  S.requestPermissionsAsync().then((p) => {
    if (done) return;
    if (!p.granted) return finish();
    S.start({ lang: 'en-IN', interimResults: true, addsPunctuation: true,
      volumeChangeEventOptions: onLevel ? { enabled: true, intervalMillis: 100 } : undefined });
  }, finish);
  return () => (done ? undefined : S.stop());
}
