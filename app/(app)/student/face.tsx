import { Link, useRouter } from 'expo-router';
import { CircleCheck, House, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { FaceCapture } from '@/components/student/FaceCapture';
import { useLoad } from '@/components/student/use-load';
import { toApiError } from '@/lib/api/client';
import { facesApi, type FaceStatus } from '@/lib/api/faces';
import { formatDate } from '@/lib/format';

function PrivacyCard() {
  return (
    <Card className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon as={ShieldCheck} size={20} color="primary" />
        <Text weight="semibold">What is kept</Text>
      </View>
      <Text tone="muted">
        3 small face pictures and numbers made from them, used only to match you in your teacher's class photos.
        Class photos are never stored. You can delete your face data at any time.
      </Text>
    </Card>
  );
}

/** /student/face: register your face for face attendance (3 photos, with consent), or delete it. */
export default function StudentFace() {
  const router = useRouter();
  const confirm = useConfirm();
  const message = useMessage();
  const { data, error, loading, retrying, reload } = useLoad(() => facesApi.mine(), []);
  const [status, setStatus] = React.useState<FaceStatus | null>(null);
  const [registering, setRegistering] = React.useState(false);
  const [justRegistered, setJustRegistered] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // The latest status: from the server, or from our own register / delete.
  React.useEffect(() => {
    if (data) setStatus({ registered: data.registered, registered_at: data.registered_at, poses: data.poses });
  }, [data]);

  const deleteFace = async () => {
    const ok = await confirm({
      title: 'Delete your face data?',
      message: 'Your face pictures are removed. Until you register again, your teacher marks you by hand or by code.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await facesApi.deleteMine();
      setStatus({ registered: false, registered_at: null, poses: [] });
      setJustRegistered(false);
      message.success('Your face data was deleted.');
    } catch (caught) {
      message.error(toApiError(caught).message);
    } finally {
      setDeleting(false);
    }
  };

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingState label="Loading your face registration…" />;
  } else if (error || !status) {
    body = (
      <Card>
        <ErrorState
          title="Couldn't load your face registration"
          message={error?.message ?? 'Please try again.'}
          onRetry={reload}
          retrying={retrying}
        />
      </Card>
    );
  } else if (status.registered && !registering) {
    body = (
      <>
        {justRegistered ? (
          <Notice
            tone="success"
            title="Face registered"
            message="Your teacher can now mark you present from a class photo."
            live
          />
        ) : null}
        <Card>
          <View className="items-center gap-3 px-2 py-4">
            <View className="h-14 w-14 items-center justify-center rounded-pill bg-primary-soft">
              <Icon as={CircleCheck} size={30} color="primary" />
            </View>
            <Text variant="section" align="center">
              Your face is registered
            </Text>
            <Text tone="muted" align="center" className="max-w-[440px]">
              {`${status.registered_at ? `Registered on ${formatDate(status.registered_at)}. ` : ''}Your teacher can mark you present from a class photo.`}
            </Text>
            <View className="mt-2 flex-row flex-wrap justify-center gap-2">
              <Link href="/student" asChild>
                <Button label="Back to home" icon={House} variant="primary" />
              </Link>
              <Button label="Register again" icon={RefreshCw} onPress={() => setRegistering(true)} disabled={deleting} />
              <Button label="Delete my face data" icon={Trash2} variant="quiet" destructive loading={deleting} onPress={deleteFace} />
            </View>
          </View>
        </Card>
        <PrivacyCard />
      </>
    );
  } else {
    body = (
      <>
        {status.registered ? (
          <Notice message="Registering again replaces your saved face pictures." />
        ) : null}
        <FaceCapture
          onRegistered={(next) => {
            setStatus(next);
            setRegistering(false);
            setJustRegistered(true);
            message.success('Face registered.');
          }}
          cancel={
            status.registered
              ? { label: 'Cancel', onPress: () => setRegistering(false) }
              : { label: 'Do it later', onPress: () => router.navigate('/student') }
          }
        />
        <PrivacyCard />
      </>
    );
  }

  return (
    <Page>
      <PageHeader title="Face registration" meta="Used only for face attendance in your classes." />
      {body}
    </Page>
  );
}
