import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { Camera, Check, ScanFace, Settings } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toApiError } from '@/lib/api/client';
import { facesApi, type FaceStatus, type RegisterFacePhotos } from '@/lib/api/faces';
import { colors } from '@/lib/theme';
import type { PhotoFile } from '@/lib/upload';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'straight', label: 'Look straight at the camera' },
  { key: 'left', label: 'Turn your head slightly left' },
  { key: 'right', label: 'Turn your head slightly right' },
] as const;

type Phase = 'ready' | 'capturing' | 'uploading';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function StepRow({ index, label, state }: { index: number; label: string; state: 'done' | 'now' | 'waiting' }) {
  return (
    <View
      className={cn(
        'min-h-[52px] flex-row items-center gap-3 px-4 py-3',
        index > 0 && 'border-t border-border',
        state === 'now' && 'bg-primary-soft'
      )}
      accessible
      accessibilityLabel={`Photo ${index + 1}: ${label}. ${state === 'done' ? 'Done' : state === 'now' ? 'Now' : 'Waiting'}.`}
    >
      {state === 'done' ? (
        <View className="h-7 w-7 items-center justify-center rounded-pill bg-primary">
          <Icon as={Check} size={16} color="white" strokeWidth={3} />
        </View>
      ) : (
        <View
          className={cn(
            'h-7 w-7 items-center justify-center rounded-pill border-2',
            state === 'now' ? 'border-primary bg-surface' : 'border-border bg-bg'
          )}
        >
          <Text variant="caption" weight="bold" tone={state === 'now' ? 'primary' : 'muted'}>
            {String(index + 1)}
          </Text>
        </View>
      )}
      <Text className="flex-1" weight={state === 'now' ? 'semibold' : 'regular'} tone={state === 'waiting' ? 'muted' : 'default'}>
        {label}
      </Text>
      <Text variant="small" weight="semibold" tone={state === 'done' ? 'primary' : state === 'now' ? 'default' : 'muted'}>
        {state === 'done' ? 'Done' : state === 'now' ? 'Now' : 'Waiting'}
      </Text>
    </View>
  );
}

export type FaceCaptureProps = {
  /** After the server accepted the 3 photos. */
  onRegistered: (status: FaceStatus) => void;
  /** The second button: "Do it later" / "Cancel". */
  cancel: { label: string; onPress: () => void };
};

/**
 * The guided capture from the old app, restyled: front camera with an oval guide, 3 photos
 * (straight, left, right) each after a plain 3-2-1 countdown, consent, then the upload.
 */
export function FaceCapture({ onRegistered, cancel }: FaceCaptureProps) {
  const { isDesktop } = useBreakpoint();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);
  const active = React.useRef(true);
  const [focused, setFocused] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>('ready');
  const [consent, setConsent] = React.useState(false);
  const [shots, setShots] = React.useState(0);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cameraReady, setCameraReady] = React.useState(false);
  const [cameraProblem, setCameraProblem] = React.useState<string | null>(null);
  const [asking, setAsking] = React.useState(false);

  React.useEffect(
    () => () => {
      active.current = false;
    },
    []
  );
  // The camera runs only while this page is shown; leaving it stops a capture.
  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      active.current = true;
      return () => {
        setFocused(false);
        setCameraReady(false);
        active.current = false;
      };
    }, [])
  );

  const askForCamera = async () => {
    setAsking(true);
    setCameraProblem(null);
    try {
      const result = await requestPermission();
      if (!result.granted) {
        setCameraProblem(
          Platform.OS === 'web'
            ? 'The browser did not allow the camera. Allow it in the address bar or the site settings. On a phone browser the site must use HTTPS.'
            : 'Camera access was not allowed. You can allow it in your phone settings.'
        );
      }
    } finally {
      setAsking(false);
    }
  };

  const start = async () => {
    setError(null);
    setShots(0);
    setPhase('capturing');
    const photos: Partial<Record<(typeof STEPS)[number]['key'], PhotoFile>> = {};
    try {
      for (let index = 0; index < STEPS.length; index += 1) {
        for (let count = 3; count > 0; count -= 1) {
          if (!active.current) throw new Error('stopped');
          setCountdown(count);
          await wait(1000);
        }
        setCountdown(null);
        if (!active.current) throw new Error('stopped');
        const picture = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
        if (!picture?.uri) throw new Error('The camera did not return a photo. Please try again.');
        photos[STEPS[index].key] = { uri: picture.uri, name: `${STEPS[index].key}.jpg`, type: 'image/jpeg' };
        setShots(index + 1);
      }
      setPhase('uploading');
      // The upload finishes even if the student left the page meanwhile: the result is kept.
      const status = await facesApi.registerMine(photos as RegisterFacePhotos);
      setPhase('ready');
      setShots(0);
      onRegistered(status);
    } catch (caught) {
      setCountdown(null);
      setShots(0);
      setPhase('ready');
      if (caught instanceof Error && caught.message === 'stopped') return;
      setError(toApiError(caught).message);
    }
  };

  const busy = phase !== 'ready';
  const granted = !!permission?.granted;
  const stepState = (index: number): 'done' | 'now' | 'waiting' => {
    if (phase === 'uploading' || index < shots) return 'done';
    if (phase === 'capturing' && index === shots) return 'now';
    return 'waiting';
  };

  let camera: React.ReactNode;
  if (!permission) {
    camera = <LoadingState label="Opening the camera…" />;
  } else if (!granted) {
    const blocked = !permission.canAskAgain && Platform.OS !== 'web';
    camera = (
      <View className="items-center gap-3 px-4 py-8">
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-primary-soft">
          <Icon as={ScanFace} size={24} color="primary" />
        </View>
        <Text weight="semibold" align="center">
          Your camera takes 3 photos of your face
        </Text>
        <Text tone="muted" align="center" className="max-w-[360px]">
          {blocked
            ? 'Camera access is off for this app. Turn it on in your phone settings to continue.'
            : 'The photos are checked on the server. Only small face pictures are kept, never class photos.'}
        </Text>
        {cameraProblem ? <Notice tone="warn" message={cameraProblem} live className="self-stretch" /> : null}
        {blocked ? (
          <Button label="Open phone settings" icon={Settings} onPress={() => Linking.openSettings().catch(() => {})} className="self-center" />
        ) : (
          <Button label="Allow camera" icon={Camera} variant="primary" loading={asking} onPress={askForCamera} className="self-center" />
        )}
      </View>
    );
  } else {
    camera = (
      <View
        style={{
          height: isDesktop ? 340 : 300,
          backgroundColor: colors.text,
          overflow: 'hidden',
          borderRadius: isDesktop ? 9 : 11,
        }}
        className="items-center justify-center"
        accessible
        accessibilityLabel={countdown !== null ? `Photo in ${countdown}` : 'Camera view. Keep your face inside the oval.'}
      >
        {focused ? (
          <CameraView
            ref={cameraRef}
            facing="front"
            style={StyleSheet.absoluteFill}
            onCameraReady={() => setCameraReady(true)}
            onMountError={(event) => setCameraProblem(event.message || 'The camera could not start.')}
          />
        ) : null}
        <View pointerEvents="none" style={{ width: 176, height: 228, borderRadius: 114, borderWidth: 3, borderColor: colors.white }} />
        {countdown !== null ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
            <Text weight="bold" tone="inverse" style={{ fontSize: 64, lineHeight: 72 }}>
              {String(countdown)}
            </Text>
          </View>
        ) : null}
        <View pointerEvents="none" className="absolute bottom-3 left-0 right-0 items-center">
          <View className="rounded-pill px-3 py-1" style={{ backgroundColor: colors.text }}>
            <Text variant="caption" weight="semibold" tone="inverse">
              {phase === 'uploading'
                ? 'Checking your photos…'
                : phase === 'capturing'
                  ? STEPS[Math.min(shots, STEPS.length - 1)].label
                  : 'Keep your face inside the oval'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={isDesktop ? 'flex-row items-start gap-5' : 'gap-4'}>
      <Card padded={false} className={isDesktop ? 'w-[440px]' : undefined}>
        {camera}
      </Card>
      <View className={cn('gap-4', isDesktop && 'flex-1')}>
        <Card title="Three photos" padded={false}>
          <View className="mt-3">
            {STEPS.map((step, index) => (
              <StepRow key={step.key} index={index} label={step.label} state={stepState(index)} />
            ))}
          </View>
        </Card>
        <Checkbox
          checked={consent}
          onChange={setConsent}
          disabled={busy}
          label="I agree that my face photos are stored and used only for class attendance. I can delete them at any time."
        />
        {cameraProblem && granted ? <Notice tone="warn" message={cameraProblem} live /> : null}
        {error ? <Notice tone="error" title="Registration failed" message={error} live /> : null}
        <View className="flex-row flex-wrap items-center gap-3">
          <Button
            label={phase === 'capturing' ? 'Taking photos…' : phase === 'uploading' ? 'Checking your photos…' : 'Start'}
            variant="primary"
            icon={Camera}
            loading={busy}
            disabled={!consent || !granted || !cameraReady}
            onPress={start}
          />
          <Button label={cancel.label} onPress={cancel.onPress} disabled={busy} />
        </View>
        {!busy && (!consent || !granted) ? (
          <Text variant="small" tone="muted">
            {!granted ? 'Allow the camera first.' : 'Tick the box above to start.'} Each photo is taken after a 3-second countdown.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
