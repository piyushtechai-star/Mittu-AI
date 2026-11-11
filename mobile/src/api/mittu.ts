import { api } from './client';

export type Me = {
  uid: string; phone: string; name: string | null;
  subscription: { active: boolean; status: string | null; currentEnd: number | null; trialEnd: number | null; newSubscription: boolean };
  readingsLeftToday: number;
  next: 'paywall' | 'name' | 'home';
};
export type Config = {
  plan: { name: string; trialPricePaise: number; trialDays: number; pricePaise: number; interval: string; currency: string };
  razorpayKeyId: string; billingMode: 'razorpay' | 'fake'; readingsPerDay: number;
  legal: { privacy: string; terms: string; 'payment-cancellation': string; 'delete-account': string };
  supportEmail: string;
};
export type Category = 'love' | 'career' | 'paisa' | 'health' | 'general';
export type CardInfo = { id: number; name: string; hindi: string; hindiScript: string };
export type Reading = {
  id: string; card: CardInfo; orientation: 'upright' | 'reversed'; category: Category; question: string; text: string;
  /** Signed URL, valid 1 hour (private bucket). null if the voice failed: the app reads it with the phone's voice. */
  audio_url: string | null;
  /** Start time (seconds) of every word in `text`, from Cloud TTS marks; null = estimate from the clip length. */
  word_times: number[] | null;
  created_at: number;
};
export type ReadingResult =
  | ({ kind: 'reading' } & Reading)
  | { kind: 'support'; text: string; helplines: { name: string; phone: string }[] }
  | { kind: 'offtopic'; text: string };
export type HistoryItem = Omit<Reading, 'audio_url' | 'word_times'> & { has_audio: boolean };
/** paidAt is Razorpay's Unix time in SECONDS. */
export type Invoice = { id: string; number: string; amountPaise: number; paidAt: number; description: string };

export const getMe = () => api<Me>('/me');
export const getConfig = () => api<Config>('/config');
export const setName = (name: string) => api<Me>('/me/name', { body: { name } });
export const ackPurchaseEvent = () => api('/me/purchase-event-ack', { body: {} });

export const createSubscription = () => api<{ subscriptionId: string; keyId: string; phone: string }>('/billing/subscription', { body: {} });
export const completeTestPayment = () => api<Me>('/billing/test-complete', { body: {} });

export const askMittu = (question: string, category: Category) => api<ReadingResult>('/reading', { body: { question, category } });
export const getReadings = () => api<HistoryItem[]>('/readings');
export const getReading = (id: string) => api<Reading>(`/readings/${encodeURIComponent(id)}`);
export const reportReading = (readingId: string, reason: string) => api('/report', { body: { readingId, reason } });

export const getInvoices = () => api<Invoice[]>('/invoices');
export const getInvoiceHtml = (id: string) => api<string>(`/invoices/${encodeURIComponent(id)}/html`, { raw: true });
