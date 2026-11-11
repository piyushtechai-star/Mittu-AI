import Constants from 'expo-constants';
import { AppEventsLogger } from 'react-native-fbsdk-next';

// Only when the build was made with META_APP_ID / META_CLIENT_TOKEN (see app.config.ts).
const enabled = Constants.expoConfig?.extra?.metaEnabled === true;

/** fb_mobile_purchase */
export function logMetaPurchase(amountRupees: number) {
  if (!enabled) return;
  try {
    AppEventsLogger.logPurchase(amountRupees, 'INR');
  } catch {}
}
