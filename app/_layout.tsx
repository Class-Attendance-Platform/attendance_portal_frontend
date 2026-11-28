import '@/global.css';

import { PublicSans_400Regular } from '@expo-google-fonts/public-sans/400Regular';
import { PublicSans_500Medium } from '@expo-google-fonts/public-sans/500Medium';
import { PublicSans_600SemiBold } from '@expo-google-fonts/public-sans/600SemiBold';
import { PublicSans_700Bold } from '@expo-google-fonts/public-sans/700Bold';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppVersionGate } from '@/components/auth/AppUpdate';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { MessageProvider } from '@/components/ui/message-bar';
import { ErrorState } from '@/components/ui/states';
import { FontsReadyProvider } from '@/components/ui/text';
import { AuthProvider } from '@/hooks/AuthContext';
import { colors, NAV_THEME } from '@/lib/theme';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-bg p-4">
      <ErrorState
        title="Something went wrong"
        message={error?.message || 'This screen stopped working. Try again, or reload the app.'}
        onRetry={retry}
      />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const goBack = () => {
      if (router.canGoBack()) router.back();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) {
        return;
      }
      goBack();
    };
    const offSettings = window.desktop?.onOpenServerSettings(() => router.push('/server'));
    const offBack = window.desktop?.onGoBack?.(goBack);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      offSettings?.();
      offBack?.();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <FontsReadyProvider value={fontsLoaded && !fontError}>
        <ThemeProvider value={NAV_THEME}>
          <MessageProvider>
            <ConfirmProvider>
              <AuthProvider>
                <StatusBar style="dark" />
                <AppVersionGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'none',
                      contentStyle: { backgroundColor: colors.bg },
                    }}
                  />
                </AppVersionGate>
              </AuthProvider>
            </ConfirmProvider>
          </MessageProvider>
        </ThemeProvider>
      </FontsReadyProvider>
    </SafeAreaProvider>
  );
}
