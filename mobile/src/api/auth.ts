// Phone OTP login. PLAYBOOK: replace this file with Statusly's src/api/auth.ts (keep these two functions' shapes).
import { api, API_URL } from './client';

export const requestOtp = (phone: string) => api<{ ok: boolean }>('/auth/otp/request', { body: { phone } });
export const verifyOtp = (phone: string, code: string) =>
  api<{ token: string; uid: string }>('/auth/otp/verify', { body: { phone, code } });

/** Ends every session of this account on the server. Plain fetch (not api()): a 401 here must not re-trigger sign-out. */
export async function logoutEverywhere(token: string) {
  await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
