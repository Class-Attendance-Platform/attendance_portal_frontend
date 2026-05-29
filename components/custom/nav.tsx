// components/nav.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { usePathname, useRouter } from "expo-router";
import * as React from "react";
import {
    Pressable,
    Text,
    View,
    type PressableProps,
    type ViewProps,
} from "react-native";
import { twMerge } from "tailwind-merge";
import { ROUTES, type RouteKey } from "types/routes";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function useAppNavigation() {
    const router = useRouter();
    return (route: RouteKey) => router.push(ROUTES[route]);
}

/**
 * Returns whether a given RouteKey matches the current pathname.
 * Handles nested routes (e.g. /profile/edit still highlights "Profile").
 */
export function useIsActiveRoute() {
    const pathname = usePathname();
    return React.useCallback(
        (route: RouteKey) => {
            const target = ROUTES[route];
            if ((target as string) === "/") return pathname === "/";
            return pathname === target || pathname.startsWith(`${target}/`);
        },
        [pathname]
    );
}

const navItemVariants = cva(
    "flex-row items-center gap-2 rounded-md transition-colors active:opacity-70",
    {
        variants: {
            variant: {
                default: "bg-transparent active:bg-accent",
                active: "bg-accent",
                ghost: "bg-transparent",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 px-3",
                lg: "h-11 px-8",
                icon: "h-10 w-10 justify-center",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

const navTextVariants = cva("font-medium", {
    variants: {
        variant: {
            default: "text-muted-foreground",
            active: "text-foreground",
            ghost: "text-muted-foreground",
        },
        size: {
            default: "text-sm",
            sm: "text-xs",
            lg: "text-base",
            icon: "hidden",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});

const navIconVariants = cva("", {
    variants: {
        variant: {
            default: "text-muted-foreground",
            active: "text-foreground",
            ghost: "text-muted-foreground",
        },
        size: {
            default: "w-5 h-5",
            sm: "w-4 h-4",
            lg: "w-6 h-6",
            icon: "w-5 h-5",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});

/**
 * Render prop for icons so they receive the resolved variant/size and can
 * be styled accordingly (e.g. lucide icons accept `color` and `size` props).
 */
export type NavIconRenderer = (state: {
    active: boolean;
    className: string;
}) => React.ReactNode;

// --- Context (lets a parent <Nav> set defaults like size for all children) ---

type NavContextValue = {
    size?: VariantProps<typeof navItemVariants>["size"];
};

const NavContext = React.createContext<NavContextValue>({});

// --- Container ---

export interface NavProps extends ViewProps, NavContextValue { }

const NavContainer = React.forwardRef<View, NavProps>(
    ({ className, size, children, ...props }, ref) => (
        <NavContext.Provider value={{ size }}>
            <View ref={ref} className={cn("flex", className)} {...props}>
                {children}
            </View>
        </NavContext.Provider>
    )
);
NavContainer.displayName = "Nav";

// --- Item ---

export interface NavItemProps
    extends Omit<PressableProps, "children">,
    VariantProps<typeof navItemVariants> {
    label: string;
    route: RouteKey;
    /**
     * Either a static node or a render function that receives the resolved
     * active state and a className (color + size) to apply to the icon.
     */
    icon?: React.ReactNode | NavIconRenderer;
    textClassName?: string;
    iconClassName?: string;
    /** Override active detection. By default, derived from current pathname. */
    active?: boolean;
}

const NavItem = React.forwardRef<View, NavItemProps>(
    (
        {
            className,
            textClassName,
            iconClassName,
            variant,
            size,
            label,
            route,
            icon,
            active,
            ...props
        },
        ref
    ) => {
        const navigate = useAppNavigation();
        const isActiveRoute = useIsActiveRoute();
        const ctx = React.useContext(NavContext);

        const isActive = active ?? isActiveRoute(route);
        const resolvedVariant = variant ?? (isActive ? "active" : "default");
        const resolvedSize = size ?? ctx.size ?? "default";

        const resolvedIconClassName = cn(
            navIconVariants({
                variant: resolvedVariant,
                size: resolvedSize,
            }),
            iconClassName
        );

        const renderedIcon =
            typeof icon === "function"
                ? (icon as NavIconRenderer)({
                    active: isActive,
                    className: resolvedIconClassName,
                })
                : icon;

        return (
            <Pressable
                ref={ref}
                onPress={() => navigate(route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={label}
                className={cn(
                    navItemVariants({
                        variant: resolvedVariant,
                        size: resolvedSize,
                        className,
                    })
                )}
                {...props}
            >
                {renderedIcon}
                <Text
                    className={cn(
                        navTextVariants({
                            variant: resolvedVariant,
                            size: resolvedSize,
                            className: textClassName,
                        })
                    )}
                >
                    {label}
                </Text>
            </Pressable>
        );
    }
);
NavItem.displayName = "NavItem";

export {
    NavContainer as Nav, navIconVariants, NavItem,
    navItemVariants,
    navTextVariants
};
