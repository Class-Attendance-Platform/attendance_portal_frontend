import { Check, GraduationCap, Presentation, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radioKeys } from '@/components/ui/keys';
import { Text } from '@/components/ui/text';
import { cn, FOCUS_RING } from '@/lib/utils';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RULES = 'At least 8 characters.';

export function emailProblem(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address, like name@example.com.';
  return undefined;
}

export function newPasswordProblem(password: string): string | undefined {
  if (!password) return 'Choose a password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  return undefined;
}

export function confirmProblem(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Type the new password again.';
  if (confirm !== password) return "The two passwords don't match.";
  return undefined;
}

export type SignUpRole = 'STUDENT' | 'TEACHER';

const ROLE_CHOICES: { value: SignUpRole; label: string; note: string; icon: LucideIcon }[] = [
  { value: 'STUDENT', label: 'Student', note: 'I attend classes', icon: GraduationCap },
  { value: 'TEACHER', label: 'Teacher', note: 'I teach courses', icon: Presentation },
];

export function RoleChoice({ value, onChange }: { value: SignUpRole | null; onChange: (role: SignUpRole) => void }) {
  const refs = React.useRef<(View | null)[]>([]);
  const chosenIndex = ROLE_CHOICES.findIndex((choice) => choice.value === value);
  return (
    <View role="radiogroup" accessibilityLabel="I am a" className="flex-row gap-3">
      {ROLE_CHOICES.map((choice, index) => {
        const selected = choice.value === value;
        return (
          <Pressable
            key={choice.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="radio"
            aria-checked={selected}
            accessibilityState={{ checked: selected, selected }}
            accessibilityLabel={`${choice.label}: ${choice.note}`}
            onPress={() => onChange(choice.value)}
            {...radioKeys({
              index,
              count: ROLE_CHOICES.length,
              tabStop: index === Math.max(chosenIndex, 0),
              onPick: () => onChange(choice.value),
              onMove: (next) => {
                refs.current[next]?.focus();
                onChange(ROLE_CHOICES[next].value);
              },
            })}
            className={cn(
              'min-h-[112px] flex-1 items-center justify-center gap-2 rounded-control border px-3 py-4',
              selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface active:bg-bg web:hover:bg-bg',
              FOCUS_RING
            )}
          >
            {selected ? (
              <View className="absolute right-2 top-2">
                <Icon as={Check} size={18} color="primary" strokeWidth={2.5} />
              </View>
            ) : null}
            <View className={cn('h-11 w-11 items-center justify-center rounded-pill', selected ? 'bg-primary' : 'bg-primary-soft')}>
              <Icon as={choice.icon} size={22} color={selected ? 'white' : 'primary'} />
            </View>
            <Text weight="semibold" tone={selected ? 'primary' : 'default'} align="center">
              {choice.label}
            </Text>
            <Text variant="small" tone="muted" align="center">
              {choice.note}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FixedField({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <View className="min-h-[44px] justify-center rounded-control border border-border bg-bg px-3 py-2">
        <Text>{value}</Text>
      </View>
      {note ? (
        <Text variant="small" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export function FormHeading({ title, lead }: { title: string; lead?: string }) {
  return (
    <View className="gap-1">
      <Text variant="title">{title}</Text>
      {lead ? <Text tone="muted">{lead}</Text> : null}
    </View>
  );
}
