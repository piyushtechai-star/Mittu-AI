// Meta (Facebook) SDK and Pulse analytics.
//
// META (playbook 08) — SDK is wired (src/lib/meta*.ts). When Ayush gives the App ID and Client Token:
//   1. Set META_APP_ID and META_CLIENT_TOKEN for the EAS build (app.config.ts adds the plugin), then rebuild.
//   2. Add the Android key hashes (upload key + Play app-signing key, base64 SHA-1) in the Meta app.
//   3. Play Console › App content › Advertising ID › Yes (Analytics, Advertising), and match Data safety.
// PULSE (playbook 09): ask Ayush for the Pulse SDK + app_event_log snippet and wire it into `track`.
import { logMetaPurchase } from './meta';

/** fb_mobile_purchase: ONLY when a new subscription starts (mandate authenticated). Never on renewals. */
export function logNewSubscription(amountRupees: number) {
  track('new_subscription', { amount: amountRupees });
  logMetaPurchase(amountRupees);
}

export function track(event: string, props: Record<string, unknown> = {}) {
  if (__DEV__) console.log('[event]', event, props);
  // TODO(pulse): Pulse.track(event, props) and app_event_log
}
