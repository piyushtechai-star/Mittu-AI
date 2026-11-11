// Adds the Meta SDK only when its ids are set (playbook 08), so builds work before Ayush shares them.
// Set META_APP_ID and META_CLIENT_TOKEN in eas.json (build profile `env`) or as EAS environment variables.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const appID = process.env.META_APP_ID;
  const clientToken = process.env.META_CLIENT_TOKEN;
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
