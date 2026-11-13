// Web: the browser's speech recognition (Chrome, Edge, Safari). The native version is voice.native.ts.
type Recognition = {
  lang: string; interimResults: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
};

const Ctor = typeof window === 'undefined' ? undefined
  : ((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
    (new () => Recognition) | undefined;

export const voiceSupported = !!Ctor;

/** Listens once; onText gets the transcript so far (live while speaking). Returns a stop function. */
export function listen(onText: (text: string) => void, onEnd: () => void): () => void {
  if (!Ctor) {
    onEnd();
    return () => {};
  }
  const r = new Ctor();
  r.lang = 'en-IN';
  r.interimResults = true;
  r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
  r.onend = onEnd;
  r.onerror = onEnd;
  r.start();
  return () => r.stop();
}
