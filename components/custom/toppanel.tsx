// components/TopPanel.tsx
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { cn } from "./nav";

export default function TopPanel() {
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <View
            accessibilityRole="header"
            className={cn(
                "flex-row items-center justify-between px-2 card"
            )}
        >
            <Text className="text-lg text-primary">
            </Text>

            <View className="flex-row gap-4">
                <Pressable
                    onPress={toggleColorScheme}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isDark }}
                    accessibilityLabel="Toggle colour scheme"
                    className={cn("p-2 rounded-full active:opacity-70  bg-zinc-100 dark:bg-zinc-800")}
                >
                    <Text className="text-sm text-zinc-800 dark:text-zinc-200">
                        {isDark ? "🌙" : "☀️"}
                    </Text>
                </Pressable>

                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Avatar alt="Zach Nugent's Avatar">
                            <AvatarImage source={{ uri: 'https://github.com/mrzachnugent.png' }} />
                            <AvatarFallback>
                                <Text>ZN</Text>
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="m-4 p-2">
                        <DropdownMenuItem>
                            <Text className="text-primary">Profile</Text>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Text className="text-primary">Settings</Text>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Text className="text-red-400">Logout</Text>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </View>
        </View>
    );
}