import { Link, type Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/states';
import type { ApiError } from '@/lib/api/client';

/** Another teacher's course (403) or one that does not exist (404): "Try again" cannot help. */
export const isFinalError = (error: ApiError | null | undefined): error is ApiError =>
  error?.status === 403 || error?.status === 404;

export type CourseLoadErrorProps = {
  error: ApiError;
  /** Title for other errors (no connection, server error), e.g. "Couldn't open this course". */
  title: string;
  onRetry: () => void;
  /** A 404 of the page's own item (a student not in the course) instead of "Course not found". */
  missing?: { title: string; message: string; backLabel: string; backHref: Href };
};

/**
 * A teacher page that could not load, in a card. Another teacher's course and a missing one get
 * a plain reason and a way back; only other errors offer "Try again".
 */
export function CourseLoadError({ error, title, onRetry, missing }: CourseLoadErrorProps) {
  const denied = error.status === 403;
  const notFound = error.status === 404;
  const own = notFound ? missing : undefined;
  return (
    <Card>
      <ErrorState
        title={denied ? 'Not your course' : own ? own.title : notFound ? 'Course not found' : title}
        message={
          denied ? 'This course is taught by another teacher.' : own ? own.message : notFound ? 'It may have been removed.' : error.message
        }
        onRetry={denied || notFound ? undefined : onRetry}
      />
      {denied || notFound ? (
        <View className="items-center pb-4">
          <Link href={own ? own.backHref : '/teacher'} dismissTo asChild>
            <Button label={own ? own.backLabel : 'Back to My courses'} icon={ArrowLeft} className="self-center" />
          </Link>
        </View>
      ) : null}
    </Card>
  );
}
