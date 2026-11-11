import { tokenStore } from '@/lib/storage';

// Cloud Run URL of mittuai-api (asia-south1). Set EXPO_PUBLIC_API_URL in .env / EAS env; local backend by default.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
let onPaymentRequired: (() => void) | null = null;
export function setApiHandlers(h: { unauthorized: () => void; paymentRequired: () => void }) {
  onUnauthorized = h.unauthorized;
  onPaymentRequired = h.paymentRequired;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; raw?: boolean } = {}): Promise<T> {
  const token = await tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Check your internet connection and try again.');
  }
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const data = await res.json();
      if (typeof data?.detail === 'string') message = data.detail;
    } catch {}
    if (res.status === 401) onUnauthorized?.();
    if (res.status === 402) onPaymentRequired?.();
    throw new ApiError(res.status, message);
  }
  return (options.raw ? await res.text() : await res.json()) as T;
}
