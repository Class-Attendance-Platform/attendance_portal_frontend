import * as React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown, Search, SlidersHorizontal } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { useState } from 'react';

interface DropdownProps {
  value: string;
  onValueChange: (val: string) => void;
  options: string[];
}

export function Dropdown({ value, onValueChange, options }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="h-10 flex-row items-center justify-between rounded-lg border border-border bg-background px-3 active:opacity-70">
        <Text className="line-clamp-1 flex-1 pr-2 text-sm font-medium">{value}</Text>
        <ChevronDown size={16} className="text-muted-foreground" />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setIsOpen(false)}>
          <Pressable className="w-full max-w-xs overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <View className="border-b border-border bg-muted/30 p-4">
              <Text className="text-center font-semibold">Select Option</Text>
            </View>
            <ScrollView className="max-h-72">
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  className="flex-row items-center justify-between border-b border-border/50 p-4 active:bg-muted/50"
                  onPress={() => {
                    onValueChange(opt);
                    setIsOpen(false);
                  }}>
                  <Text
                    className={`text-sm ${value === opt ? 'font-bold text-primary' : 'text-foreground'}`}>
                    {opt}
                  </Text>
                  {value === opt && <Check size={16} className="text-primary" />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
