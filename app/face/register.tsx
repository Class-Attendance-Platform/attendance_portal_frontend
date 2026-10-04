import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Check, CheckSquare, ChevronLeft, ScanFace, Square } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmDialog } from '@/components/custom/confirm-dialog';
import { useAuth } from '@/hooks/AuthContext';
import { faceService } from '@/lib/services';
import type { PhotoFile } from '@/lib/upload';

const STEPS = [
  { key: 'straight', label: 'Look straight at the camera' },
  { key: 'left', label: 'Turn your head slightly left' },
  { key: 'right', label: 'Turn your head slightly right' },
] as const;

type Phase = 'loading' | 'registered' | 'ready' | 'capturing' | 'uploading' | 'done';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function FaceRegisterScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromSignup = from === 'signup';
  const { user, isLoading } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const mounted = useRef(true);

  const [phase, setPhase] = useState<Phase>('loading');
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => () => { mounted.current = false; }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await faceService.getMine();
      setRegisteredAt(res.registered ? res.registered_at : null);
      setPhase(res.registered ? 'registered' : 'ready');
    } catch (err: any) {
      setError(err.message || 'Could not load your face registration.');
      setPhase('ready');
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (user.role === 'STUDENT') loadStatus();
  }, [isLoading, user, loadStatus]);

  const leave = () => {
    if (!fromSignup && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const startCapture = async () => {
    setError('');
    setShotsTaken(0);
    setPhase('capturing');
    const photos: Record<string, PhotoFile> = {};
    try {
      for (let i = 0; i < STEPS.length; i++) {
        for (let n = 3; n > 0; n--) {
          if (!mounted.current) return;
          setCountdown(n);
          await wait(1000);
        }
        setCountdown(null);
        const picture = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
        if (!picture?.uri) throw new Error('The camera did not return a photo. Please try again.');
        photos[STEPS[i].key] = { uri: picture.uri, name: `${STEPS[i].key}.jpg`, type: 'image/jpeg' };
        setShotsTaken(i + 1);
      }
      setPhase('uploading');
      const res = await faceService.registerMine(photos as any);
      setRegisteredAt(res.registered_at);
      setPhase('done');
    } catch (err: any) {
      if (!mounted.current) return;
      setCountdown(null);
      setShotsTaken(0);
      setError(err.message || 'Face registration failed. Please try again.');
      setPhase('ready');
    }
  };

  const deleteFaceData = async () => {
    setConfirmDelete(false);
    try {
      await faceService.deleteMine();
      setRegisteredAt(null);
      setPhase('ready');
    } catch (err: any) {
      setError(err.message || 'Could not delete your face data.');
    }
  };

  if (!isLoading && user && user.role !== 'STUDENT') {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-center text-muted-foreground">Face registration is only for students.</Text>
      </View>
    );
  }

  const busy = phase === 'capturing' || phase === 'uploading';
  const currentStep = phase === 'capturing' ? shotsTaken : -1;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="items-center p-5 pb-10">
      <View className="w-full max-w-md gap-4">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={leave}
            disabled={busy}
            accessibilityLabel="Back"
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background active:opacity-70">
            <ChevronLeft size={20} className="text-foreground" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Register your face</Text>
            <Text className="text-sm text-muted-foreground">
              {fromSignup ? 'Last step of sign-up (optional)' : 'Used only for face attendance'}
            </Text>
          </View>
        </View>

        {phase === 'loading' ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : phase === 'registered' || phase === 'done' ? (
          <View className="items-center gap-4 rounded-2xl border border-border bg-card p-6">
            <View className="rounded-full bg-emerald-500/10 p-4">
              <Check size={32} className="text-emerald-600" />
            </View>
            <Text className="text-center text-lg font-bold text-foreground">
              {phase === 'done' ? 'Face registered' : 'Your face is registered'}
            </Text>
            <Text className="text-center text-sm text-muted-foreground">
              {registeredAt ? `Registered on ${new Date(registeredAt).toLocaleDateString()}. ` : ''}
              Your teacher can now mark you present from a class photo.
            </Text>
            <View className="w-full gap-2">
              <Button size="lg" onPress={() => router.replace('/')}>
                <Text className="font-semibold">Go to dashboard</Text>
              </Button>
              {phase === 'registered' && (
                <>
                  <Button variant="outline" size="lg" onPress={() => setPhase('ready')}>
                    <Text className="font-semibold">Register again</Text>
                  </Button>
                  <Button variant="ghost" size="lg" onPress={() => setConfirmDelete(true)}>
                    <Text className="font-semibold text-destructive">Delete my face data</Text>
                  </Button>
                </>
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Camera */}
            <View className="h-72 items-center justify-center overflow-hidden rounded-2xl bg-neutral-900">
              {permission?.granted ? (
                <>
                  <CameraView
                    ref={cameraRef}
                    facing="front"
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#171717' }}
                  />
                  <View pointerEvents="none" className="h-56 w-44 rounded-full border-4 border-white" />
                  {countdown !== null && (
                    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
                      <Text className="text-7xl font-black text-white">{countdown}</Text>
                    </View>
                  )}
                  <View pointerEvents="none" className="absolute bottom-3 rounded-full bg-neutral-800 px-3 py-1">
                    <Text className="text-xs font-semibold text-white">
                      {phase === 'uploading' ? 'Checking your photos…' : 'Keep your face inside the oval'}
                    </Text>
                  </View>
                </>
              ) : (
                <View className="items-center gap-3 p-6">
                  <ScanFace size={36} className="text-neutral-300" />
                  <Text className="text-center text-sm text-neutral-200">
                    {permission && !permission.canAskAgain
                      ? 'Camera access is blocked. Allow it in your browser or phone settings.'
                      : 'We need your camera to take 3 photos of your face.'}
                  </Text>
                  {(!permission || permission.canAskAgain) && (
                    <Button variant="secondary" onPress={requestPermission}>
                      <Text className="font-semibold">Allow camera</Text>
                    </Button>
                  )}
                </View>
              )}
            </View>

            {/* Checklist */}
            <View className="rounded-2xl border border-border bg-card">
              {STEPS.map((step, i) => {
                const done = i < shotsTaken || phase === 'uploading';
                const now = i === currentStep;
                return (
                  <View
                    key={step.key}
                    className={`flex-row items-center gap-3 px-4 py-3 ${i < STEPS.length - 1 ? 'border-b border-border/60' : ''} ${now ? 'bg-muted/60' : ''}`}>
                    {done ? (
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-600">
                        <Check size={16} className="text-white" />
                      </View>
                    ) : (
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full ${now ? 'border-[3px] border-foreground' : 'bg-muted'}`}>
                        <Text className={`text-xs font-extrabold ${now ? 'text-foreground' : 'text-muted-foreground'}`}>{i + 1}</Text>
                      </View>
                    )}
                    <Text className={`flex-1 text-sm ${now ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </Text>
                    <Text
                      className={`text-xs font-bold ${done ? 'text-emerald-700' : now ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {done ? 'Done' : now ? 'Now' : 'Waiting'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Consent */}
            <Pressable
              onPress={() => setConsent((v) => !v)}
              disabled={busy}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              className="flex-row items-start gap-3 active:opacity-70">
              {consent ? (
                <CheckSquare size={20} className="text-foreground" />
              ) : (
                <Square size={20} className="text-muted-foreground" />
              )}
              <Text className="flex-1 text-sm leading-5 text-foreground/80">
                I agree that my face photos are stored and used only for class attendance. I can delete them at any time.
              </Text>
            </Pressable>

            {error ? (
              <View className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                <Text className="text-center text-sm font-medium text-destructive">{error}</Text>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <Button variant="outline" size="lg" className="flex-1" onPress={leave} disabled={busy}>
                <Text className="font-semibold">Do it later</Text>
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onPress={startCapture}
                disabled={busy || !consent || !permission?.granted}>
                <Text className="font-semibold">
                  {phase === 'capturing' ? 'Capturing…' : phase === 'uploading' ? 'Checking…' : 'Start capture'}
                </Text>
              </Button>
            </View>
          </>
        )}
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete your face data?"
        message="Your face photos will be removed. Your teacher will need to mark you by hand until you register again."
        confirmText="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteFaceData}
      />
    </ScrollView>
  );
}
