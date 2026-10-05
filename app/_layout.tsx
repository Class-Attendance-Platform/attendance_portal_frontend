import '@/global.css';

// One import per weight, so only these four font files go into the app (not all 18).
import { PublicSans_400Regular } from '@expo-google-fonts/public-sans/400Regular';
import { PublicSans_500Medium } from '@expo-google-fonts/public-sans/500Medium';
import { PublicSans_600SemiBold } from '@expo-google-fonts/public-sans/600SemiBold';
import { PublicSans_700Bold } from '@expo-google-fonts/public-sans/700Bold';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { MessageProvider } from '@/components/ui/message-bar';
import { ErrorState } from '@/components/ui/states';
import { FontsReadyProvider } from '@/components/ui/text';
import { AuthProvider } from '@/hooks/AuthContext';
import { colors, NAV_THEME } from '@/lib/theme';

/** Shown instead of a screen that crashed. */
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
  // Public Sans for every weight we use. Until it loads (or if it fails) the system font is used.
  const [fontsLoaded, fontError] = useFonts({
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <FontsReadyProvider value={fontsLoaded && !fontError}>
        <ThemeProvider value={NAV_THEME}>
          <MessageProvider>
            <ConfirmProvider>
              <AuthProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'none',
                    contentStyle: { backgroundColor: colors.bg },
                  }}
                />
              </AuthProvider>
            </ConfirmProvider>
          </MessageProvider>
        </ThemeProvider>
      </FontsReadyProvider>
    </SafeAreaProvider>
  );
}
