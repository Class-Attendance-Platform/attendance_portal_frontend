import { Link, useFocusEffect } from 'expo-router';
import { Check, CircleDashed, ScanFace } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { isApiError } from '@/lib/api/client';
import { facesApi, onFaceChange, type FaceStatus } from '@/lib/api/faces';
import { formatDate } from '@/lib/format';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; face: FaceStatus };

export function FaceStatusCard() {
  const [state, setState] = React.useState<State>({ kind: 'loading' });
  const latest = React.useRef(0);

  const load = React.useCallback(async (quiet: boolean) => {
    const id = ++latest.current;
    if (!quiet) setState({ kind: 'loading' });
    try {
      const face = await facesApi.mine();
      if (id === latest.current) setState({ kind: 'ready', face });
    } catch (error) {
      if (id !== latest.current) return;
      const message = isApiError(error) ? error.message : 'Could not load your face registration. Please try again.';
      setState((current) => (quiet && current.kind === 'ready' ? current : { kind: 'error', message }));
    }
  }, []);
  const reload = React.useCallback(() => {
    load(false);
  }, [load]);

  React.useEffect(() => {
    load(false);
  }, [load]);

  const shown = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (!shown.current) {
        shown.current = true;
        return;
      }
      load(true);
    }, [load])
  );

  React.useEffect(() => onFaceChange(() => load(true)), [load]);

  const registered = state.kind === 'ready' && state.face.registered;

  return (
    <Card
      title="Face registration"
      actions={
        state.kind === 'ready' ? (
          registered ? (
            <Pill label="Registered" tone="present" icon={Check} />
          ) : (
            <Pill label="Not registered" tone="warn" icon={CircleDashed} />
          )
        ) : null
      }
      className="gap-3"
    >
      {state.kind === 'loading' ? (
        <LoadingState label="Loading your face registration…" className="py-4" />
      ) : state.kind === 'error' ? (
        <ErrorState title="Couldn't load your face registration" message={state.message} onRetry={reload} className="py-4" />
      ) : (
        <View className="gap-4">
          <Text tone="muted">
            {registered
              ? `Registered on ${formatDate(state.face.registered_at)}. Teachers can take your attendance from a class photo.`
              : 'Register your face so teachers can take your attendance from a class photo. It takes three photos.'}
          </Text>
          <Link href="/student/face" asChild>
            <Button
              label={registered ? 'Manage face registration' : 'Register your face'}
              variant={registered ? 'secondary' : 'primary'}
              icon={ScanFace}
            />
          </Link>
        </View>
      )}
    </Card>
  );
}
