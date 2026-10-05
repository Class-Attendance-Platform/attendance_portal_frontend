import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as React from 'react';
import { Linking, Platform, View } from 'react-native';

import { PublicPage } from '@/components/layout/PublicPage';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useAuth } from '@/hooks/AuthContext';
import { homeFor } from '@/lib/routes';

/** The installed app's version (Android/desktop builds set it from the release tag). */
function appVersion(): string {
  const native = Platform.OS !== 'web' ? Application.nativeApplicationVersion : null;
  return native || Constants.expoConfig?.version || '1.0.0';
}

const PLATFORM_NAME = Platform.select({ web: 'Web app', android: 'Android app', ios: 'iPhone app', default: 'App' });

function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View className={`flex-row flex-wrap justify-between gap-2 py-2.5 ${first ? '' : 'border-t border-border'}`}>
      <Text tone="muted">{label}</Text>
      <Text weight="semibold" tabular>
        {value}
      </Text>
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text>{children}</Text>;
}

/** /about: version, credits, the face model licence and a short privacy note. Public. */
export default function AboutScreen() {
  const { user } = useAuth();
  return (
    <PublicPage
      width="wide"
      footerLinks={user ? [{ label: 'Back to the portal', href: homeFor(user.role) }] : [{ label: 'Sign in', href: '/login' }]}
    >
      <View className="gap-1">
        <Text variant="title">About this app</Text>
        <Text tone="muted">Class attendance for the Department of Computer Science and Engineering, HSTU.</Text>
      </View>

      <Card title="This app">
        <View className="mt-2">
          <Row first label="App" value={PLATFORM_NAME ?? 'App'} />
          <Row label="Version" value={appVersion()} />
        </View>
      </Card>

      <Card title="Credits" className="gap-3">
        <Paragraph>
          HSTU Attendance Portal is made for the Department of Computer Science and Engineering at Hajee Mohammad Danesh
          Science and Technology University (HSTU), Dinajpur. It is an open-source project of the Class Attendance
          Platform team.
        </Paragraph>
        <Paragraph>
          Built with Expo and React Native (web, Android and desktop), Django REST framework, and the Public Sans
          typeface (SIL Open Font License). Icons by Lucide (ISC License).
        </Paragraph>
        <View className="flex-row">
          <TextLink
            label="Source code and releases on GitHub"
            onPress={() => Linking.openURL('https://github.com/Class-Attendance-Platform')}
          />
        </View>
      </Card>

      <Card title="Face recognition model" className="gap-3">
        <Paragraph>
          Face attendance uses the InsightFace “buffalo_l” models (a face detector and the ArcFace face recognition model),
          running on the portal’s own server.
        </Paragraph>
        <Paragraph>
          These models are licensed by InsightFace for non-commercial, academic and research use only. This portal uses them
          only to take attendance at the university; they may not be used commercially.
        </Paragraph>
        <View className="flex-row">
          <TextLink label="InsightFace on GitHub" onPress={() => Linking.openURL('https://github.com/deepinsight/insightface')} />
        </View>
      </Card>

      <Card title="Privacy" className="gap-3">
        <Paragraph>
          The portal keeps your name, email, student or employee ID and attendance records, so teachers can take attendance
          and you can see your own.
        </Paragraph>
        <Paragraph>
          If you register your face, it keeps three small face pictures and the numbers the model makes from them, to find
          you in class photos. Class photos themselves are never stored. You can delete your face data at any time on the
          face registration page, or ask an admin to do it.
        </Paragraph>
        <Paragraph>
          To stop one phone checking in several students, the app keeps a random device number. It is not linked to your
          phone’s hardware. Your data is used only for class attendance.
        </Paragraph>
      </Card>

    </PublicPage>
  );
}
