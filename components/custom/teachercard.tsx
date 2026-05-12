import * as React from 'react';
import { Pressable, View, Image } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Teacher } from '@/types/teacher';

interface TeacherCardProps {
  teacher: Teacher;
  onPress?: (teacher: Teacher) => void;
  onEdit?: (teacher: Teacher) => void;
  onDelete?: (teacher: Teacher) => void;
}

export function TeacherCard({ teacher, onPress, onEdit, onDelete }: TeacherCardProps) {
  const initials = `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(0)}`.toUpperCase();

  return (
    <View className="m-2 flex-1">
      <Pressable
        onPress={() => onPress?.(teacher)}
        className="flex-1 overflow-hidden rounded-[24px]">
        <Card className="flex-1 rounded-[24px] border border-border/50 bg-card px-5 py-3.5 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                <Text className="text-sm font-bold text-primary">{initials}</Text>
              </View>

              <Badge variant="outline" className="border-primary/20 bg-primary/5 px-2.5 py-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {teacher.employeeId}
                </Text>
              </Badge>
            </View>

            <View
              className={`items-center rounded-full px-3 py-1.5 ${
                teacher.isActive ? 'bg-green-500/10' : 'bg-destructive/10'
              }`}>
              <Text
                className={`text-[11px] font-bold ${
                  teacher.isActive ? 'text-green-600' : 'text-destructive'
                }`}>
                {teacher.isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center">
            <Text className="text-base font-bold leading-tight text-foreground" numberOfLines={2}>
              {teacher.firstName} {teacher.lastName}
            </Text>

            <Text className="text-xs font-medium text-muted-foreground/80">
              {teacher.designation} • {teacher.department}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-muted-foreground">Manage teacher</Text>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.(teacher);
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-secondary/80">
                <Pencil size={15} className="text-secondary-foreground" />
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.(teacher);
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-secondary/80">
                <Trash2 size={15} className="text-destructive" />
              </Pressable>
            </View>
          </View>
        </Card>
      </Pressable>
    </View>
  );
}
