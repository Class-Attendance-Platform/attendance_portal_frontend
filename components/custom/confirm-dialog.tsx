import * as React from 'react';
import { Modal, View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable 
        className="flex-1 items-center justify-center bg-black/60 p-6"
        onPress={onCancel}
      >
        <Pressable
          className="w-full max-w-sm rounded-[32px] border border-border bg-card p-8 shadow-2xl"
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <View className="mb-6 items-center">
            <Text className="text-center text-lg font-black text-foreground">
              {title}
            </Text>
            <Text className="mt-3 px-2 text-center text-sm font-medium leading-relaxed text-muted-foreground/80">
              {message}
            </Text>
          </View>
          <View className="flex-row gap-4">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-2xl active:scale-95"
              onPress={onCancel}
            >
              <Text className="text-xs font-black uppercase tracking-widest text-foreground">
                {cancelText}
              </Text>
            </Button>
            <Button
              className={`h-11 flex-1 rounded-2xl active:scale-95 ${
                isDestructive ? 'bg-destructive' : 'bg-primary'
              }`}
              onPress={onConfirm}
            >
              <Text className={`text-xs font-black uppercase tracking-widest ${
                isDestructive ? 'text-destructive-foreground' : 'text-primary-foreground'
              }`}>
                {confirmText}
              </Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
