import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Download } from 'lucide-react-native';
import * as React from 'react';
import { Image, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { configApi, DEFAULT_APP_CONFIG, type AppConfig } from '@/lib/api/config';
import { colors } from '@/lib/theme';
import { updateStatus, type UpdateStatus } from './version';

const LOGO = require('@/assets/images/hstu.png');

/**
 * The installed app's version. Android builds take it from the release tag (versionName, read
 * with expo-application); app.json's version (expo-constants) is the fallback and the web's.
 */
export function appVersion(): string {
  const native = Platform.OS !== 'web' ? Application.nativeApplicationVersion : null;
  return native || Constants.expoConfig?.version || '1.0.0';
}

/** Only the installed apps check their version: the web app (and the desktop app) update themselves. */
const CHECKS_VERSION = Platform.OS !== 'web';

export type AppUpdate = {
  status: UpdateStatus;
  installed: string;
  config: AppConfig;
};

/** GET /config/app/ (once per app start, shared) compared with this app's version. Native only. */
export function useAppUpdate(): AppUpdate {
  const [config, setConfig] = React.useState<AppConfig | null>(null);
  React.useEffect(() => {
    if (!CHECKS_VERSION) return;
    let active = true;
    configApi.appCached().then((value) => {
      if (active) setConfig(value);
    });
    return () => {
      active = false;
    };
  }, []);
  const installed = appVersion();
  const status = config ? updateStatus(installed, config.min_app_version, config.latest_app_version) : 'current';
  return { status, installed, config: config ?? DEFAULT_APP_CONFIG };
}

function useOpenDownload(url: string) {
  const message = useMessage();
  return React.useCallback(() => {
    Linking.openURL(url).catch(() => message.error(`Could not open the download page. Open ${url} in a browser.`));
  }, [message, url]);
}

// "Not now" lasts until the app is closed, for that latest version.
let dismissedVersion: string | null = null;

/** A notice that a newer app version is ready (Account and About pages). Native only. */
export function UpdateNotice() {
  const { status, installed, config } = useAppUpdate();
  const [dismissed, setDismissed] = React.useState(dismissedVersion);
  if (status !== 'available' || dismissed === config.latest_app_version) return null;
  return (
    <UpdateAvailableNotice
      installed={installed}
      latest={config.latest_app_version}
      downloadUrl={config.download_url}
      onDismiss={() => {
        dismissedVersion = config.latest_app_version;
        setDismissed(dismissedVersion);
      }}
    />
  );
}

export function UpdateAvailableNotice({
  installed,
  latest,
  downloadUrl,
  onDismiss,
}: {
  installed: string;
  latest: string;
  downloadUrl: string;
  onDismiss: () => void;
}) {
  const openDownload = useOpenDownload(downloadUrl);
  return (
    <Notice tone="info" title="A new version is ready" message={`Version ${latest} is available. You have ${installed}.`}>
      <Button label="Download" variant="primary" icon={Download} compact onPress={openDownload} />
      <Button label="Not now" variant="quiet" compact onPress={onDismiss} />
    </Notice>
  );
}

/** The blocking "Please update" screen, shown over everything when the app is too old. */
export function UpdateRequiredScreen({ installed, minimum, downloadUrl }: { installed: string; minimum: string; downloadUrl: string }) {
  const insets = useSafeAreaInsets();
  const openDownload = useOpenDownload(downloadUrl);
  return (
    // zIndex only: elevation would draw a shadow on Android.
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, zIndex: 100 }]} role="alert">
      <ScrollView
        overScrollMode="never"
        bounces={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        }}
      >
        <View className="w-full max-w-[420px] gap-6 self-center">
          <View className="items-center gap-3">
            <Image
              source={LOGO}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
              accessibilityLabel="Hajee Mohammad Danesh Science and Technology University logo"
            />
            <Text variant="section" weight="bold" align="center">
              HSTU Attendance Portal
            </Text>
          </View>
          <Card className="gap-4">
            <View className="gap-1">
              <Text variant="title">Please update the app</Text>
              <Text tone="muted">
                This version ({installed}) no longer works with the portal. Install version {minimum} or newer to go on.
              </Text>
            </View>
            <Button label="Download the update" variant="primary" icon={Download} fullWidth onPress={openDownload} />
            <Text variant="small" tone="muted">
              The download page opens in your browser. Install the new app over this one.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Wraps the app (app/_layout.tsx). On phones it checks the version once at start; below the
 * minimum the "Please update" screen covers everything. The web app never checks.
 */
export function AppVersionGate({ children }: { children: React.ReactNode }) {
  const { status, installed, config } = useAppUpdate();
  return (
    <View style={{ flex: 1 }}>
      {children}
      {status === 'required' ? (
        <UpdateRequiredScreen installed={installed} minimum={config.min_app_version} downloadUrl={config.download_url} />
      ) : null}
    </View>
  );
}
