import { router, Stack } from 'expo-router';
import React from 'react';
import { Image, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerBackTitle: 'Back' }} />
      
      <View className="flex-1 items-center justify-center p-6 bg-background">
        <View className="w-full max-w-sm items-center gap-6">
          {/* Faded Logo for subtle branding */}
          <Image
            source={require('@/assets/images/hstu.png')}
            style={{ width: 175, height: 175, opacity: 0.5 }}
            resizeMode="contain"
          />

          {/* Typography */}
          <View className="items-center gap-2">
            <Text className="text-7xl tracking-tight text-foreground">
              404
            </Text>
            <Text className="text-lg font-semibold text-foreground text-center">
              Oops! Screen not found.
            </Text>
            <Text className="text-base text-muted-foreground text-center mt-1">
              The page you are looking for doesn't exist or has been moved.
            </Text>
          </View>

          {/* Call to Action */}
          <Button 
            className="w-full mt-4" 
            size="lg" 
            onPress={() => router.replace('/')}
          >
            <Text className="font-semibold">Return to Home</Text>
          </Button>
        </View>
      </View>
    </>
  );
}