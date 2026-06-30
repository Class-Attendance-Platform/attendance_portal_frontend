import { router, useLocalSearchParams } from 'expo-router';
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
import { useAuth } from '@/hooks/AuthContext';

export default function SignInScreen() {
  const { login } = useAuth();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const passwordInputRef = React.useRef<TextInput>(null);

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  async function onSubmit() {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await login(email, password);
      if (params.redirect) {
        router.replace(decodeURIComponent(params.redirect) as any);
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
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
            {error ? (
              <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                <Text className="text-destructive text-sm text-center font-medium">{error}</Text>
              </View>
            ) : null}

            <View className="gap-2">
              <Label nativeID="emailLabel" htmlFor="email">
                Email Address or Username
              </Label>
              <Input
                id="email"
                placeholder="test@gmail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={onEmailSubmitEditing}
                submitBehavior="submit"
                editable={!isSubmitting}
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
              <View className="relative justify-center">
                <Input
                  ref={passwordInputRef}
                  id="password"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  className="pr-10"
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
                  editable={!isSubmitting}
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

            <Button 
              className="w-full mt-4" 
              size="lg" 
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text className="font-semibold">{isSubmitting ? 'Signing In...' : 'Sign In'}</Text>
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