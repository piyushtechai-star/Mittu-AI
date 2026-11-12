import { useId, useMemo } from 'react';

/** Gives every id in an SVG string (and its url(#…) references) a suffix. On the web all inline SVGs share one
 *  document, so two copies of the same art (e.g. Home's Mittu kept mounted under the reading scene) would resolve
 *  url(#mh) to the hidden copy and lose their gradients. */
export function scopeIds(xml: string, suffix: string) {
  return xml.replace(/id="([^"]+)"/g, `id="$1-${suffix}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${suffix})`);
}

/** The same strings with ids unique to this component instance. */
export function useScopedSvgs<T extends Record<string, string>>(svgs: T): T {
  const sfx = useId().replace(/[^a-zA-Z0-9]/g, '');
  return useMemo(() => Object.fromEntries(Object.entries(svgs).map(([k, v]) => [k, scopeIds(v, sfx)])) as T, [svgs, sfx]);
}
