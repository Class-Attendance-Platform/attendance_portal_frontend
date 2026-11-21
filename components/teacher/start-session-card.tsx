import { Link } from 'expo-router';
import { Camera, ClipboardList, MonitorSmartphone, Play, School } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { isApiError } from '@/lib/api/client';
import { SESSION_ERRORS, sessionsApi, type LiveSession, type SessionMinutes } from '@/lib/api/sessions';
import type { Delivery, UUID } from '@/lib/api/types';
import { ChoiceGroup } from './choice-group';
import { faceHref, rollCallHref } from './labels';

const LENGTHS: SessionMinutes[] = [2, 5, 10, 15];

export type StartSessionCardProps = {
  courseInfoId: UUID;
  onStarted: (session: LiveSession | { id: UUID }) => void;
};

export function StartSessionCard({ courseInfoId, onStarted }: StartSessionCardProps) {
  const [delivery, setDelivery] = React.useState<Delivery>('IN_CLASS');
  const [minutes, setMinutes] = React.useState<SessionMinutes>(5);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const result = await sessionsApi.start({ course_info_id: courseInfoId, delivery, duration_minutes: minutes });
      onStarted(result.session);
    } catch (caught) {
      if (isApiError(caught) && caught.code === SESSION_ERRORS.sessionRunning && typeof caught.body.session_id === 'string') {
        onStarted({ id: caught.body.session_id });
        return;
      }
      setError(isApiError(caught) ? caught.message : 'Could not start the session. Please try again.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card title="Start a session" className="gap-4">
      <Text tone="muted">
        Students in class scan the QR code. Students online type the 6-digit code. The code changes every 30 seconds.
      </Text>

      <View className="gap-2">
        <Text weight="semibold">Where is the class?</Text>
        <ChoiceGroup<Delivery>
          label="Where is the class"
          value={delivery}
          onChange={setDelivery}
          choices={[
            { value: 'IN_CLASS', label: 'In class', icon: School },
            { value: 'ONLINE', label: 'Online', icon: MonitorSmartphone },
          ]}
        />
      </View>

      <View className="gap-2">
        <Text weight="semibold">How long?</Text>
        <ChoiceGroup<SessionMinutes>
          label="Session length"
          value={minutes}
          onChange={setMinutes}
          choices={LENGTHS.map((value) => ({ value, label: `${value} min` }))}
        />
        <Text variant="small" tone="muted">
          You can add 2 minutes at a time while it runs (30 minutes at most).
        </Text>
      </View>

      {error ? <Notice tone="error" message={error} live /> : null}

      <View className="flex-row flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button label="Start" variant="primary" icon={Play} loading={starting} onPress={start} />
        <Link href={rollCallHref(courseInfoId)} asChild>
          <Button label="Roll call" icon={ClipboardList} />
        </Link>
        <Link href={faceHref(courseInfoId)} asChild>
          <Button label="Class photo (face)" icon={Camera} />
        </Link>
      </View>
    </Card>
  );
}
