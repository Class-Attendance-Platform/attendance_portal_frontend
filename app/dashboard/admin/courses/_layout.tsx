import { Slot } from 'expo-router';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View className="h-screen w-screen">
      <Slot />
    </View>
  );
}
