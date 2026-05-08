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
            className="flex-row justify-around items-center border-t border-border bg-background py-2"
        >
            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <NavItem
                        key={item.route}
                        label={item.label}
                        route={item.route}
                        className="flex-col h-auto gap-1 px-3 py-1"
                        icon={({ className }) => (
                            <Icon className={className} />
                        )}
                    />
                );
            })}
        </Nav>
    );
}