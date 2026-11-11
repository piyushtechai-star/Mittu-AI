// Web build: Razorpay's checkout.js (used when testing the paywall in a browser).
import { colors } from '@/theme';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay'));
    document.body.appendChild(s);
  });
}

export async function openSubscriptionCheckout(o: { keyId: string; subscriptionId: string; phone: string; description: string }) {
  await loadScript();
  await new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: o.keyId, subscription_id: o.subscriptionId, name: 'Mittu AI', description: o.description,
      prefill: { contact: o.phone }, theme: { color: colors.accent },
      handler: () => resolve(),
      modal: { ondismiss: () => reject(new Error('cancelled')) },
    });
    rzp.open();
  });
}
