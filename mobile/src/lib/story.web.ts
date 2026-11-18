// Web version of Share Story: fetch the 9:16 image, share it as a file where the browser supports that (phones),
// otherwise download it. Falls back to copying the text.
import { API_URL } from '@/api/client';
import type { Reading } from '@/api/mittu';
import { tokenStore } from '@/lib/storage';

export async function shareStory(r: Reading): Promise<'shared' | 'copied' | 'text'> {
  const token = await tokenStore.get();
  try {
    const res = await fetch(`${API_URL}/v2/readings/${encodeURIComponent(r.id)}/story.png`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`story ${res.status}`);
    const blob = await res.blob();
    const file = new File([blob], `mittu-${r.card.name.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: 'Mittu AI' });
      return 'shared';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return 'copied';
  } catch {
    const text = `🦜 Mittu ne mere liye ${r.card.name} (${r.card.hindi}) ka card nikaala!\n\n${r.sandesh ?? r.text}\n\n— Mittu AI`;
    await navigator.clipboard?.writeText(text).catch(() => {});
    return 'copied';
  }
}
