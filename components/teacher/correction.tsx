import { Check, X } from 'lucide-react-native';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useMessage } from '@/components/ui/message-bar';
import { isApiError } from '@/lib/api/client';
import { teacherApi, type SetAttendanceResponse } from '@/lib/api/teacher';
import type { AttendanceStatus, ISODate, UUID } from '@/lib/api/types';
import { formatDate } from '@/lib/format';

/**
 * Changes one student on one date (PUT /teacher/course-info/<id>/attendance/) and reports the
 * result with a message. `busy` holds the "date|profile" keys being saved.
 */
export function useCorrection(courseInfoId: UUID, onSaved: (result: SetAttendanceResponse, profileId: UUID) => void) {
  const message = useMessage();
  const [busy, setBusy] = React.useState<Set<string>>(new Set());

  const change = React.useCallback(
    async (date: ISODate, profileId: UUID, status: AttendanceStatus, name: string) => {
      const key = `${date}|${profileId}`;
      setBusy((current) => new Set(current).add(key));
      try {
        const result = await teacherApi.setAttendance(courseInfoId, { date, profile_id: profileId, status });
        onSaved(result, profileId);
        const word = status === 'PRESENT' ? 'present' : 'absent';
        message.success(
          result.changed ? `${name} is now ${word} on ${formatDate(date)}.` : `${name} was already ${word} on ${formatDate(date)}.`
        );
      } catch (caught) {
        message.error(isApiError(caught) ? caught.message : 'Could not save the change. Please try again.');
      } finally {
        setBusy((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [courseInfoId, message, onSaved]
  );

  const isBusy = React.useCallback((date: ISODate, profileId: UUID) => busy.has(`${date}|${profileId}`), [busy]);

  return { change, isBusy };
}

export type FlipButtonProps = {
  status: AttendanceStatus;
  name: string;
  date: ISODate;
  busy?: boolean;
  disabled?: boolean;
  onFlip: (next: AttendanceStatus) => void;
};

/** "Mark absent" for a present day, "Mark present" for an absent one. */
export function FlipButton({ status, name, date, busy, disabled, onFlip }: FlipButtonProps) {
  const next: AttendanceStatus = status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
  const word = next === 'PRESENT' ? 'present' : 'absent';
  return (
    <Button
      label={`Mark ${word}`}
      icon={next === 'PRESENT' ? Check : X}
      compact
      loading={busy}
      disabled={disabled}
      accessibilityLabel={`Mark ${name} ${word} on ${formatDate(date)}`}
      onPress={() => onFlip(next)}
    />
  );
}
