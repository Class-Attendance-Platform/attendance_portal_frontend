import { Link } from 'expo-router';
import { Check, CircleDashed, ScanFace } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { isApiError } from '@/lib/api/client';
import { facesApi, type FaceStatus } from '@/lib/api/faces';
import { formatDate } from '@/lib/format';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; face: FaceStatus };

/** A student's face registration (GET /faces/me/) with a link to /student/face. */
export function FaceStatusCard() {
  const [state, setState] = React.useState<State>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const face = await facesApi.mine();
      setState({ kind: 'ready', face });
    } catch (error) {
      setState({
        kind: 'error',
        message: isApiError(error) ? error.message : 'Could not load your face registration. Please try again.',
      });
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

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
        <ErrorState title="Couldn't load your face registration" message={state.message} onRetry={load} className="py-4" />
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
