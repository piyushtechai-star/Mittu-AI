// Sound (meeting brief 2026-11-17: clean audio policy). No background music or ambient loops any more: only Mittu's
// voice and three tiny bundled effects: the "Mittu Mittu!" chirp (made with Mittu's own voice), a wing flutter and a
// soft card flip. Mute is remembered on this phone.
//
// Mittu's voice clip is LOADED while the card animation runs (loadVoice) and only PLAYED at the reveal, so the voice
// starts right away. Fixes "picks the card but doesn't speak": every failure is reported to the caller (which retries
// with a fresh link, then shows a "suniye" button), and the phone's own voice is used only if it really has Hindi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

const FILES = {
  chirp: require('../../assets/sounds/chirp.mp3'),
  flap: require('../../assets/sounds/flap.wav'),
  flip: require('../../assets/sounds/flip.wav'),
};
export type SoundName = keyof typeof FILES;

let muted = false;
let ready: Promise<void> | null = null;
const players: Partial<Record<SoundName, AudioPlayer>> = {};
let current: VoiceClip | null = null;
const listeners = new Set<(m: boolean) => void>();

function player(name: SoundName) {
  return (players[name] ??= createAudioPlayer(FILES[name]));
}

export function initSound() {
  ready ??= (async () => {
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    muted = (await AsyncStorage.getItem('mittuai.muted').catch(() => null)) === '1';
    (Object.keys(FILES) as SoundName[]).forEach(player);   // load the effects now, so the first one isn't late
  })();
  return ready;
}

export const isMuted = () => muted;
export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function setMuted(m: boolean) {
  muted = m;
  AsyncStorage.setItem('mittuai.muted', m ? '1' : '0').catch(() => {});
  current?.setVolume(m ? 0 : 1);
  if (m) Speech.stop();
  listeners.forEach((fn) => fn(m));
}

export function play(name: SoundName, volume = 1) {
  if (muted) return;
  try {
    const p = player(name);
    p.volume = volume;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {}
}

/** Plays the "Mittu Mittu!" chirp; resolves when it has (about) finished, so the voice can follow it. */
export function chirp(): Promise<void> {
  play('chirp', 1);
  return new Promise((r) => setTimeout(r, muted ? 0 : 680));
}

export type VoiceClip = {
  duration: () => number;
  /** Starts playback. onTime gets the position (s) ~15x a second; onEnd fires once (end, stop or error). */
  play: (onTime: (t: number) => void, onEnd: () => void) => void;
  pause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
};

/** Loads a voice clip (signed URL) without playing it. Rejects if it can't load within `timeoutMs`. */
export async function loadVoice(url: string, timeoutMs = 12_000): Promise<VoiceClip> {
  const p = createAudioPlayer({ uri: url });
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { p.pause(); p.remove(); } catch {}
  };
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => { clearInterval(check); reject(new Error('voice timeout')); }, timeoutMs);
      const check = setInterval(() => {
        if (p.isLoaded) { clearTimeout(t); clearInterval(check); resolve(); }
      }, 50);
    });
  } catch (e) {
    release();
    throw e;
  }
  let timer: ReturnType<typeof setInterval> | undefined;
  let sub: { remove: () => void } | undefined;
  let ended = false;
  let endFn: (() => void) | null = null;
  const end = () => {
    clearInterval(timer);
    sub?.remove();
    if (ended) return;
    ended = true;
    if (current === clip) current = null;
    endFn?.();
  };
  const clip: VoiceClip = {
    duration: () => p.duration || 0,
    play: (onTime, onEnd) => {
      if (released) return onEnd();
      current?.stop();
      current = clip;
      ended = false;
      endFn = onEnd;
      p.volume = muted ? 0 : 1;
      sub = p.addListener('playbackStatusUpdate', (s) => { if (s.didJustFinish) end(); });
      p.seekTo(0).catch(() => {});
      p.play();
      timer = setInterval(() => onTime(p.currentTime), 66);
    },
    pause: () => { try { p.pause(); } catch {} end(); },
    stop: () => { end(); release(); },
    setVolume: (v) => { try { p.volume = v; } catch {} },
  };
  return clip;
}

/** Stops whatever Mittu is saying (voice clip or phone voice). */
export function stopVoice() {
  current?.pause();
  Speech.stop();
}

let hindiVoice: Promise<boolean> | null = null;
/** True if this phone has a Hindi text-to-speech voice (many Android phones don't: speaking would be silent). */
export function phoneHasHindi() {
  hindiVoice ??= Speech.getAvailableVoicesAsync()
    .then((v) => v.some((x) => /^hi([-_]|$)/i.test(x.language)))
    .catch(() => false);
  return hindiVoice;
}

/** Last resort when no clip could be played: the phone's own Hindi voice, pitched up. */
export function speakOnDevice(text: string, onStart: () => void, onEnd: () => void) {
  if (muted) {
    onEnd();
    return;
  }
  Speech.speak(text, {
    language: 'hi-IN', pitch: 1.6, rate: 1.05, onStart,
    onDone: onEnd, onStopped: onEnd, onError: onEnd,
  });
}
