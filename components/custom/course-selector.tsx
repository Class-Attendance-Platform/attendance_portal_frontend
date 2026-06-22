import * as React from 'react';
import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Search, Check, BookOpen } from 'lucide-react-native';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { CourseInfo } from '@/types/course';

interface CourseSelectorProps {
  courseInfos: CourseInfo[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxHeight?: number;
}

export function CourseSelector({
  courseInfos,
  selectedIds,
  onToggle,
  maxHeight = 128,
}: CourseSelectorProps) {
  const [search, setSearch] = useState('');
  const filteredCourses = useMemo(() => {
    return courseInfos.filter((ci) => {
      const code = ci.course?.code?.toLowerCase() || '';
      const title = ci.course?.title?.toLowerCase() || '';
      const teacherName = ci.teacher?.userName?.toLowerCase() || '';
      const s = search.toLowerCase();

      return code.includes(s) || title.includes(s) || teacherName.includes(s);
    });
  }, [courseInfos, search]);

  return (
    <View className="gap-2">
      <View className="flex-row items-center rounded-xl border border-border/60 bg-muted/20 px-2.5 py-1.5">
        <Search size={14} className="mr-2 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={search}
          onChangeText={setSearch}
          className="h-6 flex-1 border-0 bg-transparent p-0 text-xs font-semibold text-foreground"
        />
      </View>

      <View style={{ maxHeight }} className="rounded-2xl border border-border bg-muted/5 p-2">
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {filteredCourses.length === 0 ? (
            <Text className="py-4 text-center text-[10px] italic text-muted-foreground">
              No courses found
            </Text>
          ) : (
            filteredCourses.map((ci) => {
              const isSelected = selectedIds.includes(ci.id);
              return (
                <Pressable
                  key={ci.id}
                  onPress={() => onToggle(ci.id)}
                  className={`mb-1.5 flex-row items-center justify-between rounded-xl border p-2.5 ${
                    isSelected ? 'border-primary/25 bg-primary/10' : 'border-transparent bg-card'
                  }`}>
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold text-foreground">{ci.course.code}</Text>
                    <Text
                      className="line-clamp-1 text-[10px] text-muted-foreground"
                      numberOfLines={1}>
                      {ci.course.title}
                    </Text>
                    <Text className="mt-0.5 text-[10px] font-semibold text-primary/80">
                      {ci.teacher?.userName || 'No teacher assigned'}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="rounded-full bg-primary p-0.5">
                      <Check size={10} className="text-primary-foreground" />
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[10px] font-bold text-muted-foreground">
          {selectedIds.length} courses selected
        </Text>
      </View>
    </View>
  );
}
