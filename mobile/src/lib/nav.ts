import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { drawCard, speakCard, type Category, type DrawResult, type Reading } from '@/api/mittu';

// The question is handed to the reading screen in memory, never in the URL: a shared link like /reading?q=… must
// not spend one of the user's readings by itself.
//
// Brief 2026-11-17 (zero-latency card pick): the server work starts the moment the user taps "Mittu, Card
// Nikaalo!", before the reading screen even opens. 1) the backend draws the card (instant), 2) as soon as the card
// arrives, Mittu's text + voice are requested. The animation runs in parallel and never waits for the voice.
export type ReadingTicket = {
  question: string;
  category: Category;
  draw: Promise<DrawResult>;
  /** Resolves with the spoken reading (text, voice URL, envelope), or null for crisis / off-topic answers. */
  speak: Promise<({ kind: 'reading' } & Reading) | null>;
};

let pending: ReadingTicket | null = null;

/** Home → reading scene: starts the draw + speak requests right now and opens the scene. */
export function startReading(question: string, category: Category) {
  const draw = drawCard(question, category);
  const speak = draw.then((d) => (d.kind === 'card' ? speakCard(d.id) : null));
  speak.catch(() => {});   // handled by the reading screen; avoid an "unhandled rejection" warning meanwhile
  pending = { question, category, draw, speak };
  router.push('/reading');
}

/** The ticket startReading() made. Kept (not consumed) until the next reading starts: if the reading screen is
 *  mounted again (navigation re-render), it reuses the same in-flight requests instead of bouncing back to Home or
 *  paying for a second card. */
export function currentReading() {
  return pending;
}

// "Quick Draw" toggle (brief; was "Skip animation", guide 07 accessibility), remembered on this phone.
export const getSkipAnimation = async () => (await AsyncStorage.getItem('mittuai.skipAnim').catch(() => null)) === '1';
export const setSkipAnimation = (v: boolean) => AsyncStorage.setItem('mittuai.skipAnim', v ? '1' : '0').catch(() => {});

// First-launch onboarding (brief: the Welcome and Meet Mittu screens are for first-time users only).
const ONBOARDED = 'mittuai.onboarded';
let onboarded = false;   // read once at launch by app/_layout.tsx, before any screen shows
export const getOnboarded = async () => (onboarded = (await AsyncStorage.getItem(ONBOARDED).catch(() => null)) === '1');
export const isOnboarded = () => onboarded;
export const setOnboarded = () => {
  onboarded = true;
  return AsyncStorage.setItem(ONBOARDED, '1').catch(() => {});
};

/** Where a user belongs right now: sign-in, an onboarding step, or Home. */
export function entryFor(signedIn: boolean, next: string | undefined) {
  return !signedIn ? '/auth/phone' : next === 'paywall' ? '/paywall' : next === 'name' ? '/name' : next === 'birth' ? '/birth' : '/home';
}
