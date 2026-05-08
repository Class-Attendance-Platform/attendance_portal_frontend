import BottomBar from "@/components/custom/bottombar";
import SideBar from "@/components/custom/sidebar";
import TopPanel from "@/components/custom/toppanel";

import { useBreakpoint } from "@/hooks/useBreakpoint";
import { RouteKey } from "@/types/routes";

import { LucideIcon } from "lucide-react-native";
import { ReactNode } from "react";
import { ImageSourcePropType, View } from "react-native";

export type NavigationItem = {
    label: string;
    route: RouteKey;
    icon: LucideIcon;
};

type DashboardLayoutProps = {
    children: ReactNode;

    title: string;

    navItems: NavigationItem[];

    logo?: ImageSourcePropType;

    topPanel?: ReactNode;

    className?: string;
};

export default function DashboardLayout({
    children,
    title,
    navItems,
    logo,
    topPanel,
    className,
}: DashboardLayoutProps) {
    const { isMobile } = useBreakpoint();

    return (
        <View className={`flex-1 flex-row bg-zinc-50 ${className ?? ""}`}>
            {!isMobile && (
                <SideBar
                    title={title}
                    items={navItems}
                    logo={logo}
                />
            )}

            <View className="flex-1">
                <View className="flex-1">
                    <View className="w-full border-b border-border bg-background p-4">
                        {topPanel ?? <TopPanel />}
                    </View>

                    <View className="flex-1">
                        {children}
                    </View>
                </View>

                {isMobile && (
                    <BottomBar
                        items={navItems}
                    />
                )}
            </View>
        </View>
    );
}