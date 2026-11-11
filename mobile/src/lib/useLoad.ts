import { useCallback, useEffect, useState } from 'react';

/**
 * Loads data when `deps` change. State is only set from the promise callbacks, and a result is shown only
 * while it still belongs to the current deps, so changing deps shows the loading state again.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([nonce, ...deps]);
  const [res, setRes] = useState<{ key: string; data?: T; error?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setRes({ key, data }),
      (e) => alive && setRes({ key, error: (e as Error)?.message || 'error' }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = res?.key === key ? res : null;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((data: T) => setRes({ key, data }), [key]);
  return { data: current?.data ?? null, error: current?.error ?? null, loading: !current, reload, setData };
}
