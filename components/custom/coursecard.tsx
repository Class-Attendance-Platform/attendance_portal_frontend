import * as React from 'react';
import { Pressable, View } from 'react-native';
import { GraduationCap, Trash2, Pencil } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

interface CourseCardProps {
  course: {
    id: string;
    code: string;
    title: string;
    content?: string;

    credits: string | number;
  };
  onPress?: (course: any) => void;
  onEdit?: (course: any) => void;
  onDelete?: (course: any) => void;
}

export function CourseCard({ course, onPress, onEdit, onDelete }: CourseCardProps) {
  const displayCredits = course.credits
    ? typeof course.credits === 'number'
      ? course.credits.toFixed(2)
      : course.credits.replace('CREDIT_', '').replace('_', '.')
    : '2.00';


  return (
    <View className="m-2 flex-1">
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
              {displayCredits} CR
            </Text>
          </View>
        </View>

        <View className="flex-1 justify-center my-4">
          <Text
            className="mb-1 text-base font-bold leading-tight text-foreground"
            numberOfLines={2}>
            {course.title}
          </Text>

          <Text className="text-xs text-muted-foreground/80 line-clamp-2">
            {course.content || 'No course description available.'}
          </Text>
        </View>

        <View className="flex-row items-center justify-between border-t border-border/40 pt-3">
          <Text className="text-[13px] font-semibold text-muted-foreground">Manage course</Text>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onEdit?.(course);
              }}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Pencil size={14} className="text-primary" />
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete?.(course);
              }}
              className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 size={14} className="text-destructive" />
            </Pressable>
          </View>
        </View>
      </Card>
    </View>
  );
}
