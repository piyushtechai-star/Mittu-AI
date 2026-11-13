import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import type { Category } from '@/api/mittu';

// The question is handed to the reading screen in memory, never in the URL: a shared link like /reading?q=… must
// not spend one of the user's readings by itself.
let pending: { question: string; category: Category } | null = null;

/** Screen 3 → screen 4: remember the question and open the Let's Go screen. */
export function chooseQuestion(question: string, category: Category) {
  pending = { question, category };
  router.push('/letsgo');
}

/** The question waiting on the Let's Go screen (not consumed). */
export const peekPendingReading = () => pending;

/** Screen 4 → the reading scene (5-12). Replaces Let's Go, so "back" from the reading lands on Ask. */
export function startReading() {
  router.replace('/reading');
}

/** The question chooseQuestion() stored, once (the reading screen takes it). */
export function takePendingReading() {
  const p = pending;
  pending = null;
  return p;
}

// "Skip animation" toggle (guide 07, accessibility), remembered on this phone.
export const getSkipAnimation = async () => (await AsyncStorage.getItem('mittuai.skipAnim').catch(() => null)) === '1';
export const setSkipAnimation = (v: boolean) => AsyncStorage.setItem('mittuai.skipAnim', v ? '1' : '0').catch(() => {});
