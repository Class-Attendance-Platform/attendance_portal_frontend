import * as React from 'react';
import { useMemo, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Dropdown } from '@/components/custom/dropdown';
import { CourseCard } from '../../../../components/custom/coursecard';

import { MOCK_COURSES } from '../../../../mock/courses';
import type { Course } from '@/types/course';

const FACULTIES = ['All', 'Engineering', 'Science', 'Business', 'Arts'];
const DEPARTMENTS = ['All', 'CSE', 'Mathematics', 'Physics', 'Management', 'English'];

export default function CoursesScreen() {
  const { width } = useWindowDimensions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const numColumns = useMemo(() => {
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  }, [width]);

  const filteredCourses = useMemo(() => {
    return MOCK_COURSES.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFaculty = selectedFaculty === 'All' || course.faculty === selectedFaculty;
      const matchesDept = selectedDepartment === 'All' || course.department === selectedDepartment;

      return matchesSearch && matchesFaculty && matchesDept;
    });
  }, [searchQuery, selectedFaculty, selectedDepartment]);

  const clearFilters = () => {
    setSelectedFaculty('All');
    setSelectedDepartment('All');
    setSearchQuery('');
  };

  return (
    <View className="flex-1 overflow-hidden bg-background md:pr-64 lg:pr-64">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row gap-2 px-4 py-4">
          <View className="relative flex-1 justify-center">
            <Search size={18} className="absolute left-3 z-10 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="h-11 rounded-xl border-transparent bg-muted/50 pl-10 pr-4 focus:border-primary"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            className="h-11 w-11 flex-none rounded-xl"
            onPress={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal
              size={18}
              className={showFilters ? 'text-primary-foreground' : 'text-foreground'}
            />
          </Button>
        </View>

        {showFilters && (
          <View className="gap-3 border-t border-border/50 bg-card px-4 pb-4 pt-3">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="mb-1 ml-1 text-xs font-semibold text-muted-foreground">
                  Faculty
                </Text>
                <Dropdown
                  value={selectedFaculty}
                  onValueChange={setSelectedFaculty}
                  options={FACULTIES}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 ml-1 text-xs font-semibold text-muted-foreground">
                  Department
                </Text>
                <Dropdown
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  options={DEPARTMENTS}
                />
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1 items-end justify-end">
                <Button variant="ghost" size="sm" className="h-10 px-2" onPress={clearFilters}>
                  <Text className="text-xs text-destructive">Clear All</Text>
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={filteredCourses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            className={`flex-1 p-2 ${numColumns > 1 ? `max-w-[${100 / numColumns}%]` : 'w-full'}`}>
            <CourseCard course={item} />
          </View>
        )}
        numColumns={numColumns}
        key={numColumns}
        contentContainerClassName="p-2 pb-8"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-10 flex-1 items-center justify-center p-8">
            <Text className="text-center text-lg font-semibold text-foreground">
              No courses found.
            </Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              Try adjusting your filters or search query.
            </Text>
          </View>
        }
      />
    </View>
  );
}
