import { router } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, type TextStyle, View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';

const RESEND_CODE_INTERVAL_SECONDS = 30;
const TABULAR_NUMBERS_STYLE: TextStyle = { fontVariant: ['tabular-nums'] };

export default function VerifyEmailScreen() {
  const { countdown, restartCountdown } = useCountdown(RESEND_CODE_INTERVAL_SECONDS);

  function onSubmit() {
    // TODO: Submit form and navigate to protected screen if successful
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="flex-grow items-center justify-center p-4 py-8 sm:p-6 mt-safe"
      keyboardDismissMode="interactive"
    >
      <View className="w-full max-w-sm gap-6">
        <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5 rounded-2xl">
          <CardHeader className="items-center pb-2 mt-4">
            <Image
              source={require('@/assets/images/hstu.png')}
              style={{ width: 90, height: 90, marginBottom: 16 }}
              resizeMode="contain"
            />
            <CardTitle className="text-center text-2xl font-bold tracking-tight">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-center text-base mt-2">
              Enter the verification code sent to m@example.com.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-5 pt-4">
            <View className="gap-2">
              <Label nativeID="codeLabel" htmlFor="code">
                Verification Code
              </Label>
              <Input
                id="code"
                placeholder="123456"
                autoCapitalize="none"
                returnKeyType="send"
                keyboardType="numeric"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                onSubmitEditing={onSubmit}
              />
              
              <View className="items-end mt-1">
                <Button
                  variant="link"
                  size="sm"
                  className="h-fit py-0 px-0"
                  disabled={countdown > 0}
                  onPress={() => {
                    // TODO: Resend code
                    restartCountdown();
                  }}
                >
                  <Text className="text-xs text-muted-foreground font-medium">
                    Didn't receive the code?{' '}
                    <Text
                      className={countdown > 0 ? "text-muted-foreground" : "text-primary"}
                    >
                      Resend
                    </Text>
                    {countdown > 0 && (
                      <Text className="text-xs" style={TABULAR_NUMBERS_STYLE}>
                        {' '}({countdown})
                      </Text>
                    )}
                  </Text>
                </Button>
              </View>
            </View>

            <Button className="w-full mt-4" size="lg" onPress={onSubmit}>
              <Text className="font-semibold">Verify</Text>
            </Button>

            <View className="flex-row justify-center items-center mt-2">
              <Text className="text-sm text-muted-foreground">
                Entered the wrong email?{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/register')}
                className="p-1 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-primary underline underline-offset-4">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

function useCountdown(seconds = 30) {
  const [countdown, setCountdown] = React.useState(seconds);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = React.useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = React.useCallback(() => {
    stopCountdown();
    setCountdown(seconds);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds, stopCountdown]);

  React.useEffect(() => {
    startCountdown();
    return stopCountdown;
  }, [startCountdown, stopCountdown]);

  return { countdown, restartCountdown: startCountdown };
}