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

export function CourseSelector({ courseInfos, selectedIds, onToggle, maxHeight = 128 }: CourseSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredCourses = useMemo(() => {
    return courseInfos.filter(ci => 
      ci.course.code.toLowerCase().includes(search.toLowerCase()) ||
      ci.course.title.toLowerCase().includes(search.toLowerCase()) ||
      ci.teacher.userName.toLowerCase().includes(search.toLowerCase())
    );
  }, [courseInfos, search]);

  return (
    <View className="gap-2">
      <View className="flex-row items-center bg-muted/20 border border-border/60 rounded-xl px-2.5 py-1.5">
        <Search size={14} className="text-muted-foreground mr-2" />
        <Input
          placeholder="Search courses..."
          value={search}
          onChangeText={setSearch}
          className="text-xs font-semibold text-foreground p-0 h-6 border-0 bg-transparent flex-1"
        />
      </View>
      
      <View style={{ maxHeight }} className="border border-border rounded-2xl p-2 bg-muted/5">
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {filteredCourses.length === 0 ? (
            <Text className="text-[10px] text-muted-foreground italic text-center py-4">No courses found</Text>
          ) : (
            filteredCourses.map(ci => {
              const isSelected = selectedIds.includes(ci.id);
              return (
                <Pressable
                  key={ci.id}
                  onPress={() => onToggle(ci.id)}
                  className={`p-2.5 rounded-xl mb-1.5 flex-row justify-between items-center border ${
                    isSelected ? 'bg-primary/10 border-primary/25' : 'bg-card border-transparent'
                  }`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold text-foreground">
                      {ci.course.code}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground line-clamp-1" numberOfLines={1}>
                      {ci.course.title}
                    </Text>
                    <Text className="text-[10px] text-primary/80 font-semibold mt-0.5">
                      {ci.teacher.userName}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="bg-primary rounded-full p-0.5">
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
        <Text className="text-[10px] text-muted-foreground font-bold">
          {selectedIds.length} courses selected
        </Text>
      </View>
    </View>
  );
}
