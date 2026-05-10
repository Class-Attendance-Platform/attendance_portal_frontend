import { router } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';

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

export default function SignInScreen() {
  const passwordInputRef = React.useRef<TextInput>(null);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
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
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-base mt-2">
              Please sign in to continue.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-5 pt-4">
            <View className="gap-2">
              <Label nativeID="emailLabel" htmlFor="email">
                Email Address
              </Label>
              <Input
                id="email"
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={onEmailSubmitEditing}
                submitBehavior="submit"
              />
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Label nativeID="passwordLabel" htmlFor="password">
                  Password
                </Label>
                <Button
                  variant="link"
                  size="sm"
                  className="web:h-fit h-4 px-1 py-0 sm:h-4"
                  onPress={() => router.push('/(auth)/forgot-password')}
                >
                  <Text className="font-normal text-sm text-primary">
                    Forgot password?
                  </Text>
                </Button>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                placeholder="••••••••"
                secureTextEntry
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
            </View>

            <Button className="w-full mt-4" size="lg" onPress={onSubmit}>
              <Text className="font-semibold">Sign In</Text>
            </Button>

            <View className="flex-row justify-center items-center mt-2">
              <Text className="text-sm text-muted-foreground">
                Don't have an account?{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/register')}
                className="p-1 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-primary underline underline-offset-4">
                  Sign up
                </Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}