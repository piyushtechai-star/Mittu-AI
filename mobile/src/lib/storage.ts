// Session token on the phone's secure storage (Keychain / Android Keystore). Web build: see storage.web.ts.
import * as SecureStore from 'expo-secure-store';

export const tokenStore = {
  get: () => SecureStore.getItemAsync('mittuai.token'),
  set: (v: string) => SecureStore.setItemAsync('mittuai.token', v),
  clear: () => SecureStore.deleteItemAsync('mittuai.token'),
};
