import * as React from 'react';
import { Pressable, View } from 'react-native';
import { GraduationCap, Pencil, Trash2 } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Course } from '@/types/course';

interface CourseCardProps {
  course: Course;
  onPress?: (course: Course) => void;
  onEdit?: (course: Course) => void;
  onDelete?: (course: Course) => void;
}

export function CourseCard({ course, onPress, onEdit, onDelete }: CourseCardProps) {
  return (
    <View className="m-2 flex-1">
      <Pressable
        onPress={() => onPress?.(course)}
        className="flex-1 overflow-hidden rounded-[24px]">
        <Card className="flex-1 rounded-[24px] border border-border/50 bg-card p-5 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap size={20} className="text-primary" />
              </View>

              <Badge variant="outline" className="border-primary/20 bg-primary/5 px-2.5 py-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {course.code}
                </Text>
              </Badge>
            </View>

            <View className="items-center rounded-full bg-muted px-3 py-1.5">
              <Text className="text-[11px] font-bold text-muted-foreground">
                {course.credits} CR
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center">
            <Text
              className="mb-2 text-base font-bold leading-tight text-foreground"
              numberOfLines={2}>
              {course.title}
            </Text>

            <Text className="text-xs font-medium text-muted-foreground/80">
              {course.faculty} • {course.department}
            </Text>
          </View>

          <View className="flex-row items-center justify-between border-t border-border/40 pt-4">
            <Text className="text-[13px] font-semibold text-muted-foreground">Manage course</Text>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.(course);
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-secondary/80">
                <Pencil size={15} className="text-secondary-foreground" />
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.(course);
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
