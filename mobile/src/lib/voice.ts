// Web: the browser's speech recognition (Chrome, Edge, Safari). The native version is voice.native.ts.
type Recognition = {
  lang: string; interimResults: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
};

const Ctor = typeof window === 'undefined' ? undefined
  : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
    (new () => Recognition) | undefined;

export const voiceSupported = !!Ctor;

/** Asks the browser for the microphone (Meet Mittu screen). Resolves true if granted. */
export async function requestMic(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/** Listens once; onText gets the transcript so far (live while speaking). Returns a stop function. The browser API
 *  has no loudness feed, so onLevel gets a gentle pulse while speech is coming in. */
export function listen(onText: (text: string) => void, onEnd: () => void, onLevel?: (level: number) => void): () => void {
  if (!Ctor) {
    onEnd();
    return () => {};
  }
  const r = new Ctor();
  r.lang = 'en-IN';
  r.interimResults = true;
  r.onresult = (e) => {
    onText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    onLevel?.(0.5 + Math.random() * 0.5);
  };
  r.onend = onEnd;
  r.onerror = onEnd;
  r.start();
  return () => r.stop();
}
