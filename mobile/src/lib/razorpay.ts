// Razorpay Checkout on the phone (native module; needs a development/EAS build, not Expo Go).
import RazorpayCheckout from 'react-native-razorpay';

import { colors } from '@/theme';

export async function openSubscriptionCheckout(o: { keyId: string; subscriptionId: string; phone: string; description: string }) {
  // Resolves when the user completes the UPI Autopay mandate; access is granted by the webhook, not by this result.
  await RazorpayCheckout.open({
    key: o.keyId,
    subscription_id: o.subscriptionId,
    name: 'Mittu AI',
    description: o.description,
    prefill: { contact: o.phone },
    theme: { color: colors.accent },
  });
}
