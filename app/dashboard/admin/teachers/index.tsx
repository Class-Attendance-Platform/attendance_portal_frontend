import * as React from 'react';
import { useMemo, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Dropdown } from '@/components/custom/dropdown';
import { TeacherCard } from '../../../../components/custom/teachercard';

import { MOCK_TEACHERS } from '../../../../mock/users';
import type { Teacher } from '@/types/teacher';

const DEPARTMENTS = ['All', 'CSE', 'Mathematics', 'Physics', 'Management', 'English'];
const DESIGNATIONS = ['All', 'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];

export default function TeachersScreen() {
  const { width } = useWindowDimensions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const numColumns = useMemo(() => {
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  }, [width]);

  const filteredTeachers = useMemo(() => {
    return MOCK_TEACHERS.filter((teacher) => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        teacher.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDepartment === 'All' || teacher.department === selectedDepartment;
      const matchesDesig =
        selectedDesignation === 'All' || teacher.designation === selectedDesignation;

      return matchesSearch && matchesDept && matchesDesig;
    });
  }, [searchQuery, selectedDepartment, selectedDesignation]);

  const clearFilters = () => {
    setSelectedDepartment('All');
    setSelectedDesignation('All');
    setSearchQuery('');
  };

  return (
    <View className="flex-1 overflow-hidden bg-background md:pr-64 lg:pr-64">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row gap-2 px-4 py-4">
          <View className="relative flex-1 justify-center">
            <Search size={18} className="absolute left-3 z-10 text-muted-foreground" />
            <Input
              placeholder="Search teachers by name or ID..."
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
                  Department
                </Text>
                <Dropdown
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  options={DEPARTMENTS}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 ml-1 text-xs font-semibold text-muted-foreground">
                  Designation
                </Text>
                <Dropdown
                  value={selectedDesignation}
                  onValueChange={setSelectedDesignation}
                  options={DESIGNATIONS}
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
        data={filteredTeachers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            className={`flex-1 p-2 ${numColumns > 1 ? `max-w-[${100 / numColumns}%]` : 'w-full'}`}>
            <TeacherCard teacher={item} />
          </View>
        )}
        numColumns={numColumns}
        key={numColumns}
        contentContainerClassName="p-2 pb-8"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-10 flex-1 items-center justify-center p-8">
            <Text className="text-center text-lg font-semibold text-foreground">
              No teachers found.
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
