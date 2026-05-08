import { Image, ImageSourcePropType, Text, View } from "react-native";

import { NavigationItem } from "../layout/dashboard";
import { Nav, NavItem } from "./nav";

type SidebarProps = {
    title: string;
    logo?: ImageSourcePropType;
    items: NavigationItem[];
};

export default function Sidebar({
    title,
    logo,
    items,
}: SidebarProps) {
    return (
        <Nav className="w-64 h-full border-r border-border bg-background p-4 gap-y-1">
            <View className="flex-col items-center mb-6">
                {logo && (
                    <Image
                        source={logo}
                        style={{ width: 175, height: 175 }}
                        resizeMode="contain"
                    />
                )}

                <Text className="text-xl font-bold tracking-tight mb-6 px-4 text-foreground">
                    {title}
                </Text>
            </View>

            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <NavItem
                        key={item.route}
                        label={item.label}
                        route={item.route}
                        className="justify-start w-full"
                        icon={({ className }) => (
                            <Icon className={className} />
                        )}
                    />
                );
            })}
        </Nav>
    );
}