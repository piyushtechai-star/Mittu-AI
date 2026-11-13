// Sound (guide 07): squawk, chime, wing flap, card shuffle and the ambient santoor loop are small files bundled in the
// app (assets/sounds, made by tools/render-sounds.mjs). The santoor is the app's background music on every screen
// (Home > Background music turns it off); it ducks while Mittu speaks and pauses while the mic listens or the app is
// in the background. Mute and the music setting are remembered.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

const FILES = {
  whoosh: require('../../assets/sounds/whoosh.wav'),
  flap: require('../../assets/sounds/flap.wav'),
  shuffle: require('../../assets/sounds/shuffle.wav'),
  chime: require('../../assets/sounds/chime.wav'),
  squawk: require('../../assets/sounds/squawk.wav'),
  ambient: require('../../assets/sounds/ambient.wav'),
};
export type SoundName = Exclude<keyof typeof FILES, 'ambient'>;

const AMBIENT = 0.35;
const DUCKED = 0.08;
let muted = false;
let ducked = false;
let music = true;        // background music setting
let paused = false;      // app in background, or the mic is listening
let ready: Promise<void> | null = null;
const players: Partial<Record<keyof typeof FILES, AudioPlayer>> = {};
let voice: AudioPlayer | null = null;
const listeners = new Set<(m: boolean) => void>();

function player(name: keyof typeof FILES) {
  return (players[name] ??= createAudioPlayer(FILES[name]));
}

export function initSound() {
  ready ??= (async () => {
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    muted = (await AsyncStorage.getItem('mittuai.muted').catch(() => null)) === '1';
    music = (await AsyncStorage.getItem('mittuai.music').catch(() => null)) !== '0';
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
  if (players.ambient) players.ambient.volume = m ? 0 : ducked ? DUCKED : AMBIENT;
  if (voice) voice.volume = m ? 0 : 1;
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

export function startAmbient() {
  try {
    const p = player('ambient');
    p.loop = true;
    p.volume = muted ? 0 : AMBIENT;
    p.play();
  } catch {}
}

export const isMusicOn = () => music;

/** Background music on every screen: starts the santoor loop if the setting is on. */
export function startMusic() {
  if (music && !paused) startAmbient();
}

export function setMusic(on: boolean) {
  music = on;
  AsyncStorage.setItem('mittuai.music', on ? '1' : '0').catch(() => {});
  if (on) startMusic();
  else stopAmbient();
}

/** Pauses the music without forgetting it (app in the background, mic listening); `false` resumes. */
export function pauseMusic(on: boolean) {
  paused = on;
  if (on) {
    try { players.ambient?.pause(); } catch {}
  } else startMusic();
}

/** The reading scene always has the santoor; when it closes, keep it only if background music is on. */
export function leaveScene() {
  if (!music) stopAmbient();
}

export function stopAmbient() {
  try {
    players.ambient?.pause();
    players.ambient?.seekTo(0).catch(() => {});
  } catch {}
}

/** Lowers the ambient while Mittu speaks. */
export function duck(on: boolean) {
  ducked = on;
  if (players.ambient) players.ambient.volume = muted ? 0 : on ? DUCKED : AMBIENT;
}

/** Plays Mittu's voice clip (signed URL). onTime gets the playback position (seconds) ~15x a second. */
export async function playVoice(url: string, onTime: (t: number, duration: number) => void, onEnd: () => void): Promise<() => void> {
  stopVoice();
  const p = createAudioPlayer({ uri: url });
  voice = p;
  p.volume = muted ? 0 : 1;
  let done = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    sub.remove();
    if (voice === p) voice = null;
    try { p.remove(); } catch {}
    duck(false);
    onEnd();
  };
  const sub = p.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) finish();
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('voice timeout')), 20_000);
    const check = setInterval(() => {
      if (p.isLoaded) { clearTimeout(t); clearInterval(check); resolve(); }
    }, 50);
  }).catch((e) => { finish(); throw e; });
  duck(true);
  p.play();
  timer = setInterval(() => onTime(p.currentTime, p.duration), 66);
  return finish;
}

export function stopVoice() {
  if (voice) {
    try { voice.pause(); voice.remove(); } catch {}
    voice = null;
  }
  Speech.stop();
  duck(false);
}

/** No clip (voice service failed): the phone's own Hindi voice, pitched up, so Mittu still speaks. */
export function speakOnDevice(text: string, onStart: () => void, onEnd: () => void) {
  if (muted) {
    onEnd();
    return;
  }
  duck(true);
  Speech.speak(text, {
    language: 'hi-IN', pitch: 1.6, rate: 1.05, onStart,
    onDone: () => { duck(false); onEnd(); }, onStopped: () => { duck(false); onEnd(); }, onError: () => { duck(false); onEnd(); },
  });
}
