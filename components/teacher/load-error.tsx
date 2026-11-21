import { Link, type Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/states';
import type { ApiError } from '@/lib/api/client';

export const isFinalError = (error: ApiError | null | undefined): error is ApiError =>
  error?.status === 403 || error?.status === 404;

export type CourseLoadErrorProps = {
  error: ApiError;
  title: string;
  onRetry: () => void;
  missing?: { title: string; message: string; backLabel: string; backHref: Href };
};

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
