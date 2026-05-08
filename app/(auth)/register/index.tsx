import { SignUpForm } from '@/components/sign-up-form';
import { ScrollView, View } from 'react-native';
import { Image } from 'react-native';

export default function SignUpScreen() {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
      keyboardDismissMode="interactive">
      <View className="w-full max-w-sm">
        <Image
          source={require('@/assets/images/hstu.png')}
          style={{ width: 175, height: 175, alignSelf: 'center', marginBottom: 16 }}
          resizeMode="contain"
        />
        <SignUpForm />
      </View>
    </ScrollView>
  );
}
