import { LucideIcon } from "lucide-react-native";

import { RouteKey } from "@/types/routes";
import { Nav, NavItem } from "./nav";

type BottomBarItem = {
    label: string;
    route: RouteKey;
    icon: LucideIcon;
};

type BottomBarProps = {
    items: BottomBarItem[];
};

export default function BottomBar({
    items,
}: BottomBarProps) {
    return (
        <Nav
            size="sm"
            className="flex-row items-center border-t border-border bg-background py-1 w-full"
        >
            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <NavItem
                        key={item.route}
                        label={item.label}
                        route={item.route}
                        className="flex-1 flex-col h-auto gap-0.5 px-1 py-1 items-center justify-center bg-transparent active:bg-transparent"
                        textClassName="text-[10px] font-bold text-center"
                        iconClassName="w-4 h-4"
                        icon={({ className }) => (
                            <Icon className={className} />
                        )}
                    />
                );
            })}
        </Nav>
    );
}