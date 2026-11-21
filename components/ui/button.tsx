import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { cn, FOCUS_RING } from '@/lib/utils';
import { colors, type ColorToken } from '@/lib/theme';
import { Icon } from './icon';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  destructive?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  className?: string;
};

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-primary border-primary active:bg-primary-hover active:border-primary-hover web:hover:bg-primary-hover web:hover:border-primary-hover',
  secondary: 'bg-surface border-border active:bg-bg web:hover:bg-bg',
  quiet: 'bg-transparent border-transparent active:bg-primary-soft web:hover:bg-primary-soft',
  danger: 'bg-absent border-absent active:opacity-90 web:hover:opacity-90',
};

function contentColor(variant: ButtonVariant, destructive?: boolean): ColorToken {
  if (variant === 'primary' || variant === 'danger') return 'white';
  if (destructive) return 'absent';
  return variant === 'quiet' ? 'primary' : 'text';
}

export const Button = React.forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = 'secondary',
    destructive,
    icon,
    iconRight,
    loading = false,
    fullWidth,
    compact,
    disabled,
    className,
    accessibilityLabel,
    ...props
  },
  ref
) {
  const inactive = disabled || loading;
  const tint = contentColor(variant, destructive);
  return (
    <Pressable
      ref={ref}
      role="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      aria-disabled={!!inactive}
      aria-busy={loading}
      disabled={inactive}
      className={cn(
        'min-h-[44px] flex-row items-center justify-center gap-2 rounded-control border',
        compact ? 'px-3' : 'px-4',
        CONTAINER[variant],
        variant === 'quiet' && destructive && 'active:bg-absent-soft web:hover:bg-absent-soft',
        fullWidth ? 'w-full' : 'self-start',
        inactive && 'opacity-60',
        FOCUS_RING,
        className
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors[tint]} />
      ) : icon ? (
        <Icon as={icon} size={18} color={tint} />
      ) : null}
      <Text weight="semibold" style={{ color: colors[tint] }} numberOfLines={1}>
        {label}
      </Text>
      {iconRight && !loading ? <Icon as={iconRight} size={18} color={tint} /> : null}
    </Pressable>
  );
});

export type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: LucideIcon;
  accessibilityLabel: string;
  color?: ColorToken;
  size?: number;
  className?: string;
};

export const IconButton = React.forwardRef<View, IconButtonProps>(function IconButton(
  { icon, accessibilityLabel, color = 'muted', size = 20, disabled, className, ...props },
  ref
) {
  return (
    <Pressable
      ref={ref}
      role="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-control active:bg-bg web:hover:bg-bg',
        disabled && 'opacity-60',
        FOCUS_RING,
        className
      )}
      {...props}
    >
      <Icon as={icon} size={size} color={color} />
    </Pressable>
  );
});
