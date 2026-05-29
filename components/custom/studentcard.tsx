import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

interface StudentCardProps {
  student: {
    id: string;
    userName: string;
    email: string;
    studentId: number | string;

    faculty: string;
    department: string;
    currentLevel: string;
    currentSemester: string;
  };
  onPress?: (student: any) => void;
  onEdit?: (student: any) => void;
  onDelete?: (student: any) => void;
}

export function StudentCard({ student, onPress, onEdit, onDelete }: StudentCardProps) {
  const name = student.userName || 'Unknown Student';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'ST';

  return (
    <View className="m-2 flex-1">
      <Pressable
        onPress={() => onPress?.(student)}
        className="flex-1 overflow-hidden rounded-[24px]">
        <Card className="flex-1 rounded-[24px] border border-border/50 bg-card px-5 py-4 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                <Text className="text-sm font-bold text-primary">{initials}</Text>
              </View>

              <Badge variant="outline" className="border-primary/20 bg-primary/5 px-2.5 py-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {student.studentId}
                </Text>
              </Badge>
            </View>

            <View className="items-center rounded-full bg-green-500/10 px-3 py-1.5">
              <Text className="text-[11px] font-bold text-green-600">
                ACTIVE
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center my-3">
            <Text className="text-base font-bold leading-tight text-foreground" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-xs text-muted-foreground/85 mt-0.5" numberOfLines={1}>
              {student.email}
            </Text>
            <Text className="text-xs font-semibold text-muted-foreground mt-2" numberOfLines={1}>
              {student.department}
            </Text>
            <Text className="text-[11px] text-muted-foreground/80 mt-0.5">
              Level {student.currentLevel} • Semester {student.currentSemester}
            </Text>
          </View>

          <View className="flex-row items-center justify-between border-t border-border/40 pt-3">
            <Text className="text-[13px] font-semibold text-muted-foreground">Manage student</Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.(student);
                }}
                className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Pencil size={14} className="text-primary" />
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.(student);
                }}
                className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 size={14} className="text-destructive" />
              </Pressable>
            </View>
          </View>
        </Card>
      </Pressable>
    </View>
  );
}
