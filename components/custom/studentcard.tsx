import * as React from 'react';
import { Pressable, View, Image } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Student } from '@/types/student';

interface StudentCardProps {
  student: Student;
  onPress?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

export function StudentCard({ student, onPress, onEdit, onDelete }: StudentCardProps) {
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();

  return (
    <View className="m-2 flex-1">
      <Pressable
        onPress={() => onPress?.(student)}
        className="flex-1 overflow-hidden rounded-[24px]">
        <Card className="flex-1 rounded-[24px] border border-border/50 bg-card px-5 py-3.5 shadow-sm">
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

            <View
              className={`items-center rounded-full px-3 py-1.5 ${
                student.isActive ? 'bg-green-500/10' : 'bg-destructive/10'
              }`}>
              <Text
                className={`text-[11px] font-bold ${
                  student.isActive ? 'text-green-600' : 'text-destructive'
                }`}>
                {student.isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center">
            <Text className="text-base font-bold leading-tight text-foreground" numberOfLines={2}>
              {student.firstName} {student.lastName}
            </Text>

            <Text className="text-xs font-medium text-muted-foreground/80">
              {student.department} • Batch of {student.batchYear}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-muted-foreground">Manage student</Text>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.(student);
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-secondary/80">
                <Pencil size={15} className="text-secondary-foreground" />
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.(student);
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
