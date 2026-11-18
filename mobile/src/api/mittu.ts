import { api } from './client';

export type Me = {
  uid: string; phone: string; name: string | null;
  subscription: { active: boolean; status: string | null; currentEnd: number | null; trialEnd: number | null; newSubscription: boolean };
  readingsLeftToday: number;
  birth: Birth | null;
  next: 'paywall' | 'name' | 'birth' | 'home';
};
/** Birth details (Naksh-style form). `sign`/`rashi` are worked out by the server from the date. */
export type Birth = {
  birthDate: string; birthTime: string | null; birthPlace: string | null; gender: 'female' | 'male' | 'other' | null;
  sign: string; rashi: string;
};
export type BirthInput = Pick<Birth, 'birthDate' | 'birthTime' | 'birthPlace' | 'gender'>;
export type Config = {
  plan: { name: string; trialPricePaise: number; trialDays: number; pricePaise: number; interval: string; currency: string };
  razorpayKeyId: string; billingMode: 'razorpay' | 'fake'; readingsPerDay: number;
  followupsPerReading?: number; followupsPerDay?: number;
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
  // v2 readings (brief 2026-11-17): result-scroll fields, loudness envelope for the beak, follow-ups so far.
  sandesh?: string; salah?: string; lucky_color?: string; lucky_number?: string;
  /** One digit 0-9 per 1/20 s of the clip: how loud Mittu is at that moment. */
  envelope?: string | null;
  followups?: { question: string; text: string }[];
};
export type ReadingResult =
  | ({ kind: 'reading' } & Reading)
  | { kind: 'support'; text: string; helplines: { name: string; phone: string }[] }
  | { kind: 'offtopic'; text: string };
export type HistoryItem = Omit<Reading, 'audio_url' | 'word_times' | 'envelope'> & { has_audio: boolean };
/** v2 step 1: the backend draws the card instantly (or answers a crisis / off-topic question for free). */
export type DrawResult =
  | { kind: 'card'; id: string; card: CardInfo; orientation: 'upright' | 'reversed' }
  | { kind: 'support'; text: string; helplines: { name: string; phone: string }[] }
  | { kind: 'offtopic'; text: string };
export type FollowupResult =
  | { kind: 'followup'; text: string; audio_url: string | null; word_times: number[] | null; envelope: string | null; left: number }
  | { kind: 'support'; text: string; helplines: { name: string; phone: string }[] }
  | { kind: 'offtopic'; text: string };
/** paidAt is Razorpay's Unix time in SECONDS. */
export type Invoice = { id: string; number: string; amountPaise: number; paidAt: number; description: string };

export const getMe = () => api<Me>('/me');
export const getConfig = () => api<Config>('/config');
export const setName = (name: string) => api<Me>('/me/name', { body: { name } });
export const setBirth = (b: BirthInput) => api<Me>('/me/birth', { body: b });
export const ackPurchaseEvent = () => api('/me/purchase-event-ack', { body: {} });

export const createSubscription = () => api<{ subscriptionId: string; keyId: string; phone: string }>('/billing/subscription', { body: {} });
export const completeTestPayment = () => api<Me>('/billing/test-complete', { body: {} });

export const askMittu = (question: string, category: Category) => api<ReadingResult>('/reading', { body: { question, category } });
export const drawCard = (question: string, category: Category) => api<DrawResult>('/v2/reading', { body: { question, category }, timeoutMs: 15_000 });
export const speakCard = (id: string) => api<{ kind: 'reading' } & Reading>(`/v2/reading/${encodeURIComponent(id)}/speak`, { body: {}, timeoutMs: 40_000 });
export const askFollowup = (id: string, question: string) =>
  api<FollowupResult>(`/v2/reading/${encodeURIComponent(id)}/followup`, { body: { question }, timeoutMs: 30_000 });
export const getReadings = () => api<HistoryItem[]>('/readings');
export const getReading = (id: string) => api<Reading>(`/readings/${encodeURIComponent(id)}`);
export const reportReading = (readingId: string, reason: string) => api('/report', { body: { readingId, reason } });

export const getInvoices = () => api<Invoice[]>('/invoices');
export const getInvoiceHtml = (id: string) => api<string>(`/invoices/${encodeURIComponent(id)}/html`, { raw: true });
