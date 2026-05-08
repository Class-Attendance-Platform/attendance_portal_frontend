import { Slot } from "expo-router";
import { View } from "react-native";


export default function RootLayout() {
    return (
        <View className="w-screen h-screen">
            <Slot />
        </View>
    );
}