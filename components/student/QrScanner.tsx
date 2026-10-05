import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { Camera, Settings } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';

/** The in-app scanner runs on phones (Android); on the web the phone's own camera opens the link. */
export const HAS_QR_SCANNER = Platform.OS !== 'web';

export type QrScannerProps = {
  /** Called with the text of each new QR code seen (the same code again is ignored for 3 s). */
  onScan: (data: string) => void;
  /** Stops reading codes (e.g. while a check-in is being sent). */
  paused?: boolean;
};

/**
 * A back-camera QR scanner (expo-camera). Asks for the camera first, saying why; when the camera
 * was refused for good, points to the phone settings. No animation: a plain frame shows where
 * to hold the QR.
 */
export function QrScanner({ onScan, paused }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [asking, setAsking] = React.useState(false);
  const [failed, setFailed] = React.useState<string | null>(null);
  const last = React.useRef<{ data: string; at: number } | null>(null);
  // The camera runs only while this screen is shown (screens stay mounted under others).
  const [focused, setFocused] = React.useState(true);
  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const handleScan = React.useCallback(
    (result: BarcodeScanningResult) => {
      const data = result.data ?? '';
      const now = Date.now();
      if (last.current && last.current.data === data && now - last.current.at < 3000) return;
      last.current = { data, at: now };
      onScan(data);
    },
    [onScan]
  );

  if (!permission) return <LoadingState label="Opening the camera…" />;

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <View className="gap-3">
        <Text tone="muted">
          {blocked
            ? 'Camera access is off for this app. Turn it on in your phone settings, or type the code below.'
            : 'The app uses your camera only to read the QR code on the classroom screen. Nothing is recorded or saved.'}
        </Text>
        {blocked ? (
          <Button label="Open phone settings" icon={Settings} onPress={() => Linking.openSettings().catch(() => {})} />
        ) : (
          <Button
            label="Allow camera"
            variant="primary"
            icon={Camera}
            loading={asking}
            onPress={async () => {
              setAsking(true);
              try {
                await requestPermission();
              } finally {
                setAsking(false);
              }
            }}
          />
        )}
      </View>
    );
  }

  if (failed) {
    return (
      <Text tone="muted">
        {`The camera could not start (${failed}). Type the code below instead.`}
      </Text>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel="Camera view. Hold the QR code inside the frame."
      style={{ height: 300, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.text }}
    >
      {focused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={paused ? undefined : handleScan}
          onMountError={(event) => setFailed(event.message || 'camera error')}
        />
      ) : null}
      <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
        <View style={{ width: 210, height: 210, borderWidth: 3, borderColor: colors.white, borderRadius: 12 }} />
      </View>
      <View pointerEvents="none" className="absolute bottom-3 left-0 right-0 items-center">
        <View className="rounded-pill px-3 py-1" style={{ backgroundColor: colors.text }}>
          <Text variant="caption" weight="semibold" tone="inverse">
            {paused ? 'Checking you in…' : 'Hold the QR code inside the frame'}
          </Text>
        </View>
      </View>
    </View>
  );
}
