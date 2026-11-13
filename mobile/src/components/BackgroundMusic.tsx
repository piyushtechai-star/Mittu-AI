// The santoor loop as background music on every screen (user request 2026-11-13). Phones start it at launch; a browser
// only allows sound after the first tap or key press, so the web version waits for that. It pauses while the app is in
// the background and comes back when the app returns.
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { initSound, pauseMusic, startMusic } from '@/lib/sound';

export function BackgroundMusic() {
  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      void initSound().then(startMusic);
    };
    let off = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const opts = { once: true, capture: true } as const;
      document.addEventListener('pointerdown', start, opts);
      document.addEventListener('keydown', start, opts);
      off = () => {
        document.removeEventListener('pointerdown', start, opts);
        document.removeEventListener('keydown', start, opts);
      };
    } else start();
    const sub = AppState.addEventListener('change', (s) => {
      if (!started) return;
      pauseMusic(s !== 'active');
    });
    return () => { off(); sub.remove(); };
  }, []);
  return null;
}
