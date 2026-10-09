import { CameraView } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { Camera, Check, RefreshCw, ScanFace, Settings } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toApiError } from '@/lib/api/client';
import { facesApi, type FaceStatus, type RegisterFacePhotos } from '@/lib/api/faces';
import { colors } from '@/lib/theme';
import type { PhotoFile } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { NO_CAMERA_TEXT, cameraErrorText } from './camera-errors';
import { useCameraPermission } from './use-camera-permission';

const STEPS = [
  { key: 'straight', label: 'Look straight at the camera' },
  { key: 'left', label: 'Turn your head slightly left' },
  { key: 'right', label: 'Turn your head slightly right' },
] as const;

type Phase = 'ready' | 'capturing' | 'uploading';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Android otherwise takes the photos at the camera's full size (often several MB each), while the
// server shrinks them to 640 px. A size the camera lacks falls back to the closest smaller one.
// The web takes the photo at the size of the video.
const PICTURE_SIZE = Platform.OS === 'android' ? '1280x960' : undefined;

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
  const message = useMessage();
  const [permission, requestPermission, getPermission] = useCameraPermission();
  const cameraRef = React.useRef<CameraView>(null);
  const active = React.useRef(true);
  const [focused, setFocused] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>('ready');
  const [consent, setConsent] = React.useState(false);
  const [shots, setShots] = React.useState(0);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [asking, setAsking] = React.useState(false);
  // Why the camera may not be used yet (shown under "Allow camera").
  const [permissionProblem, setPermissionProblem] = React.useState<string | null>(null);
  // The camera itself: ready for photos, or why it did not start.
  const [cameraReady, setCameraReady] = React.useState(false);
  const [cameraProblem, setCameraProblem] = React.useState<string | null>(null);
  // Every start of the camera has a number (the CameraView's key). "Try again" and showing the page
  // again start a new one; late calls from an older one are ignored. On the web expo-camera reports
  // a failed start with onMountError and then still calls onCameraReady, so the failure is kept.
  const cameraRun = React.useRef({ id: 0, failed: false });
  const [cameraKey, setCameraKey] = React.useState(0);

  const restartCamera = React.useCallback(() => {
    cameraRun.current = { id: cameraRun.current.id + 1, failed: false };
    setCameraKey(cameraRun.current.id);
    setCameraReady(false);
    setCameraProblem(null);
  }, []);

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
      restartCamera();
      return () => {
        setFocused(false);
        setCameraReady(false);
        active.current = false;
      };
    }, [restartCamera])
  );

  const askForCamera = async () => {
    setAsking(true);
    setPermissionProblem(null);
    try {
      const result = await requestPermission();
      if (result.granted) return;
      if (Platform.OS !== 'web') {
        setPermissionProblem('Camera access was not allowed. You can allow it in your phone settings.');
        return;
      }
      // Browsers answer "not allowed" for every camera failure: tell the cases apart.
      const hasCamera = await CameraView.isAvailableAsync().catch(() => true);
      if (window.isSecureContext && !hasCamera) {
        setPermissionProblem(NO_CAMERA_TEXT);
        return;
      }
      // Allowed, but the camera did not start (e.g. in use by another app): the camera view says why.
      const now = await getPermission().catch(() => null);
      if (now?.granted) return;
      setPermissionProblem(
        'The browser did not allow the camera. Allow it in the address bar or the site settings. On a phone browser the site must use HTTPS.'
      );
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
        // JPEG on the web too (expo-camera's web default is a PNG several times larger).
        const picture = await cameraRef.current?.takePictureAsync({ quality: 0.85, imageType: 'jpg' }).catch(() => null);
        if (!picture?.uri) {
          // Leaving the page just then stops the camera: no error to report.
          if (!active.current) throw new Error('stopped');
          // The camera stopped (e.g. unplugged): start it again; if it cannot, its notice says why.
          if (picture === null) restartCamera();
          throw new Error(
            picture === null ? 'The camera is not ready. Please try again.' : 'The camera did not return a photo. Please try again.'
          );
        }
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
      const reason = toApiError(caught).message;
      setError(reason);
      // The student left this page while the photos were checked: tell them where they are now.
      if (!active.current) message.error(reason, 'Face registration failed');
    }
  };

  const busy = phase !== 'ready';
  const granted = !!permission?.granted;
  const stepState = (index: number): 'done' | 'now' | 'waiting' => {
    if (phase === 'uploading' || index < shots) return 'done';
    if (phase === 'capturing' && index === shots) return 'now';
    return 'waiting';
  };
  // Why Start cannot be pressed yet (a camera that did not start has its own notice).
  const hint = busy
    ? null
    : !granted
      ? 'Allow the camera first.'
      : !consent
        ? 'Tick the box above to start.'
        : !cameraReady && !cameraProblem
          ? 'Starting the camera…'
          : null;

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
        {permissionProblem ? <Notice tone="warn" message={permissionProblem} live className="self-stretch" /> : null}
        {blocked ? (
          <Button label="Open phone settings" icon={Settings} onPress={() => Linking.openSettings().catch(() => {})} className="self-center" />
        ) : (
          <Button label="Allow camera" icon={Camera} variant="primary" loading={asking} onPress={askForCamera} className="self-center" />
        )}
      </View>
    );
  } else {
    const run = cameraKey;
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
            key={run}
            ref={cameraRef}
            facing="front"
            pictureSize={PICTURE_SIZE}
            style={StyleSheet.absoluteFill}
            onCameraReady={() => {
              if (run !== cameraRun.current.id || cameraRun.current.failed) return;
              setCameraReady(true);
              setCameraProblem(null);
            }}
            onMountError={(event) => {
              if (run !== cameraRun.current.id) return;
              cameraRun.current.failed = true;
              setCameraReady(false);
              setCameraProblem(cameraErrorText(event));
            }}
          />
        ) : null}
        <View pointerEvents="none" style={{ width: 176, height: 228, borderRadius: 114, borderWidth: 3, borderColor: colors.white }} />
        {countdown !== null ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
            {/* A solid dark circle keeps the digit readable over any face or background. */}
            <View className="h-20 w-20 items-center justify-center rounded-pill" style={{ backgroundColor: colors.text }}>
              <Text weight="bold" tone="inverse" style={{ fontSize: 48, lineHeight: 56 }}>
                {String(countdown)}
              </Text>
            </View>
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

  // Side by side from 768 px; where the two do not fit (tablets, narrow windows) the steps go under the camera.
  return (
    <View className={isDesktop ? 'flex-row flex-wrap items-start gap-5' : 'gap-4'}>
      <Card padded={false} className={isDesktop ? 'w-[440px] max-w-full' : undefined}>
        {camera}
      </Card>
      <View className={cn('gap-4', isDesktop && 'min-w-[240px] flex-1')}>
        {/* First, so on phones they show right under the camera without scrolling. */}
        {cameraProblem && granted ? (
          <Notice tone="warn" message={cameraProblem} live>
            <Button label="Try again" icon={RefreshCw} onPress={restartCamera} />
          </Notice>
        ) : null}
        {error ? <Notice tone="error" title="Registration failed" message={error} live /> : null}
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
        {hint ? (
          <Text variant="small" tone="muted">
            {`${hint} Each photo is taken after a 3-second countdown.`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
