import { router } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

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

export default function ResetPasswordScreen() {
  const codeInputRef = React.useRef<TextInput>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  function onPasswordSubmitEditing() {
    codeInputRef.current?.focus();
  }

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
              Reset Password
            </CardTitle>
            <CardDescription className="text-center text-base mt-2">
              Enter the code sent to your email and set a new password.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-5 pt-4">
            <View className="gap-2">
              <Label nativeID="passwordLabel" htmlFor="password">
                New Password
              </Label>
              <View className="relative justify-center">
                <Input
                  id="password"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  className="pr-10"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={onPasswordSubmitEditing}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 active:opacity-70 justify-center h-full"
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-muted-foreground" />
                  ) : (
                    <Eye size={16} className="text-muted-foreground" />
                  )}
                </Pressable>
              </View>
            </View>

            <View className="gap-2">
              <Label nativeID="codeLabel" htmlFor="code">
                Verification Code
              </Label>
              <Input
                ref={codeInputRef}
                id="code"
                placeholder="123456"
                autoCapitalize="none"
                returnKeyType="send"
                keyboardType="numeric"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                onSubmitEditing={onSubmit}
              />
            </View>

            <Button className="w-full mt-4" size="lg" onPress={onSubmit}>
              <Text className="font-semibold">Reset Password</Text>
            </Button>

            <View className="flex-row justify-center items-center mt-2">
              <Text className="text-sm text-muted-foreground">
                Remember your password?{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                className="p-1 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-primary underline underline-offset-4">
                  Sign in
                </Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}