/// <reference types="node" />
// Adds the Meta SDK only when its ids are set (playbook 08), so builds work before Ayush shares them.
// Paste META_APP_ID and META_CLIENT_TOKEN into mobile/.env.local (git-ignored, uploaded to Cloud Build).
// Environment variables with the same names win over the file.
import fs from 'fs';
import path from 'path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Read here as well as by Expo CLI: some build steps (expo-updates / expo-constants scripts inside gradle)
// evaluate this config without loading .env files, and the embedded config must match the native one.
function fromEnvFile(name: string): string | undefined {
  try {
    const text = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    // Accepts `NAME=value`, `NAME = value` and quoted values; ignores # comment lines.
    const match = text.match(new RegExp(`^[ \\t]*${name}[ \\t]*=[ \\t]*(.*)$`, 'm'));
    const value = match?.[1].trim().replace(/^['"]|['"]$/g, '').trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appID = process.env.META_APP_ID || fromEnvFile('META_APP_ID');
  const clientToken = process.env.META_CLIENT_TOKEN || fromEnvFile('META_CLIENT_TOKEN');
  const meta = appID && clientToken;
  return {
    ...(config as ExpoConfig),
    plugins: [
      ...(config.plugins ?? []),
      ...(meta
        ? [['react-native-fbsdk-next', {
            appID, clientToken, displayName: 'Mittu AI', scheme: `fb${appID}`,
            // Installs/app opens for app-install ads; purchases are logged by hand (new subscriptions only).
            isAutoInitEnabled: true, autoLogAppEventsEnabled: true, advertiserIDCollectionEnabled: true,
          }] as [string, object]]
        : []),
    ],
    extra: { ...config.extra, metaEnabled: !!meta },
  };
};
