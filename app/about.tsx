import { Linking, Platform, View } from 'react-native';

import { appVersion, UpdateNotice } from '@/components/auth/AppUpdate';
import { PublicPage } from '@/components/layout/PublicPage';
import { Card } from '@/components/ui/card';
import { useMessage } from '@/components/ui/message-bar';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useAuth } from '@/hooks/AuthContext';
import { useAppConfig } from '@/hooks/useAppConfig';
import { DEFAULT_APP_CONFIG } from '@/lib/api/config';
import { homeFor } from '@/lib/routes';

const PLATFORM_NAME = Platform.select({ web: 'Web app', android: 'Android app', ios: 'iPhone app', default: 'App' });

function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View className={`flex-row flex-wrap justify-between gap-2 py-2.5 ${first ? '' : 'border-t border-border'}`}>
      <Text tone="muted">{label}</Text>
      <Text weight="semibold" tabular selectable>
        {value}
      </Text>
    </View>
  );
}

/** A link out of the app, with room above and below for its 44 px touch area. */
function OutLink({ label, url }: { label: string; url: string }) {
  const message = useMessage();
  return (
    <View className="flex-row py-1.5">
      <TextLink
        label={label}
        accessibilityHint="Opens in your browser"
        onPress={() => Linking.openURL(url).catch(() => message.error(`Could not open ${url}.`))}
      />
    </View>
  );
}

/** /about: name and version, what the app is, credits, the face model licence and privacy. Public. */
export default function AboutScreen() {
  const { user } = useAuth();
  const config = useAppConfig();
  const appName = config.app_name || DEFAULT_APP_CONFIG.app_name;

  return (
    <PublicPage
      width="wide"
      footerLinks={user ? [{ label: 'Back to the portal', href: homeFor(user.role) }] : [{ label: 'Sign in', href: '/login' }]}
    >
      <View className="gap-1">
        <Text variant="title">About this app</Text>
        <Text tone="muted">Class attendance for the Department of CSE, HSTU.</Text>
      </View>

      <UpdateNotice />

      <Card title="This app">
        <View className="mt-2">
          <Row first label="Name" value={appName} />
          <Row label="App" value={PLATFORM_NAME ?? 'App'} />
          <Row label="Version" value={appVersion()} />
        </View>
      </Card>

      <Card title="What it is" className="gap-3">
        <Text>
          {appName} keeps class attendance for the Department of Computer Science and Engineering at Hajee Mohammad
          Danesh Science and Technology University (HSTU), Dinajpur.
        </Text>
        <Text>
          Teachers take attendance with a QR code that students scan in class, a 6-digit code for online classes, a
          class photo, or a roll call. Students see their own attendance for each course; admins manage students,
          teachers, courses and semesters.
        </Text>
      </Card>

      <Card title="Credits" className="gap-3">
        <Text>Built for the Department of CSE, HSTU.</Text>
        <Text>
          Made with Expo and React Native (web, Android and desktop), Django REST framework, the Public Sans typeface
          (SIL Open Font License) and Lucide icons (ISC License).
        </Text>
      </Card>

      <Card title="Face recognition model" className="gap-3">
        <Text>
          Face attendance uses the InsightFace “buffalo_l” models (a face detector and the ArcFace recognition model),
          running on the portal’s own server.
        </Text>
        <Text>
          InsightFace licenses these models for non-commercial, academic and research use only. The portal uses them only
          to take class attendance at the university; they may not be used commercially.
        </Text>
        <OutLink label="InsightFace on GitHub" url="https://github.com/deepinsight/insightface" />
      </Card>

      <Card title="Privacy" className="gap-3">
        <Text>
          The portal keeps your name, email, student or employee ID and attendance records, so teachers can take attendance
          and you can see your own.
        </Text>
        <Text>
          If you register your face, the portal stores three small face pictures and the numbers the model makes from them,
          only to recognise you in class photos. Class photos are never stored. You can delete your face data at any time
          on the face registration page, or ask an admin to do it.
        </Text>
        <Text>
          To stop one phone checking in several students, the app keeps a random device number. It is not linked to your
          phone’s hardware. Your data is used only for class attendance.
        </Text>
      </Card>
    </PublicPage>
  );
}
