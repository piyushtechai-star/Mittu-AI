export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function prettyDate(iso: string | number, hi = false, withDay = true) {
  const d = typeof iso === 'number' ? new Date(iso) : new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(hi ? 'hi-IN' : 'en-IN', { day: withDay ? 'numeric' : undefined, month: 'short', year: 'numeric' });
}

export const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
