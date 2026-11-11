import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import type { Category } from '@/api/mittu';

// The question is handed to the reading screen in memory, never in the URL: a shared link like /reading?q=… must
// not spend one of the user's readings by itself.
let pending: { question: string; category: Category } | null = null;

export function startReading(question: string, category: Category) {
  pending = { question, category };
  router.push('/reading');
}

/** The question startReading() was called with, once. */
export function takePendingReading() {
  const p = pending;
  pending = null;
  return p;
}

// "Skip animation" toggle (guide 07, accessibility), remembered on this phone.
export const getSkipAnimation = async () => (await AsyncStorage.getItem('mittuai.skipAnim').catch(() => null)) === '1';
export const setSkipAnimation = (v: boolean) => AsyncStorage.setItem('mittuai.skipAnim', v ? '1' : '0').catch(() => {});
