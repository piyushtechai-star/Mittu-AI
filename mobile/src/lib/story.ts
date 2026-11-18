// Share Story (meeting brief 2026-11-17): the backend draws a clean 9:16 image of the reading
// (GET /v2/readings/{id}/story.png); phones download it and open the share sheet (Instagram, WhatsApp…), the web
// version shares the file where the browser can, otherwise saves it. Text-only share is the fallback.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { API_URL } from '@/api/client';
import type { Reading } from '@/api/mittu';
import { tokenStore } from '@/lib/storage';

const textOf = (r: Reading) =>
  `🦜 Mittu ne mere liye ${r.card.name} (${r.card.hindi}) ka card nikaala!\n\n${r.sandesh ?? r.text}\n\n— Mittu AI · Sirf manoranjan ke liye`;

export async function shareStory(r: Reading): Promise<'shared' | 'copied' | 'text'> {
  const token = await tokenStore.get();
  const url = `${API_URL}/v2/readings/${encodeURIComponent(r.id)}/story.png`;
  try {
    const path = `${FileSystem.cacheDirectory}mittu-story-${r.id}.png`;
    const res = await FileSystem.downloadAsync(url, path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.status !== 200) throw new Error(`story ${res.status}`);
    if (!(await Sharing.isAvailableAsync())) throw new Error('no share sheet');
    await Sharing.shareAsync(res.uri, { mimeType: 'image/png', dialogTitle: 'Mittu AI story', UTI: 'public.png' });
    return 'shared';
  } catch {
    await Share.share({ message: textOf(r) }).catch(() => {});
    return 'text';
  }
}
