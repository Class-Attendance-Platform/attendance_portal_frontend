import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { FlatList, View, useWindowDimensions, ActivityIndicator, Modal, Pressable, Alert, ScrollView } from 'react-native';
import { Search, Plus, X } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { CourseCard } from '@/components/custom/coursecard';
import { api } from '@/lib/api';

const CREDITS_OPTIONS = ['1.00', '1.50', '2.00', '3.00'];
const CREDIT_ENUM_MAP: Record<string, string> = {
  '1.00': 'CREDIT_1_00',
  '1.50': 'CREDIT_1_50',
  '2.00': 'CREDIT_2_00',
  '3.00': 'CREDIT_3_00',
};

const REV_CREDIT_MAP: Record<string, string> = {
  'CREDIT_1_00': '1.00',
  'CREDIT_1_50': '1.50',
  'CREDIT_2_00': '2.00',
  'CREDIT_3_00': '3.00',
};

interface Course {
  id: string;
  code: string;
  title: string;
  content: string;
  credits: string;
  faculty: string;
  department: string;
}

const FACULTIES = [
  'COMPUTER_SCIENCE_AND_ENGINEERING',
  'ENGINEERING',
  'AGRICULTURE',
  'BUSINESS_STUDIES'
];
const DEPARTMENTS = [
  'COMPUTER_SCIENCE_AND_ENGINEERING',
  'INFORMATION_AND_COMMUNICATION_TECHNOLOGY',
  'ELECTRICAL_AND_ELECTRONIC_ENGINEERING',
  'AGRICULTURE_CHEMISTRY'
];

export default function CoursesScreen() {
  const { width } = useWindowDimensions();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [credits, setCredits] = useState('3.00');
  const [faculty, setFaculty] = useState('COMPUTER_SCIENCE_AND_ENGINEERING');
  const [department, setDepartment] = useState('COMPUTER_SCIENCE_AND_ENGINEERING');
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/courses');
      if (res.success) {
        setCourses(res.courses || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const numColumns = useMemo(() => {
    if (width >= 1440) return 5;
    if (width >= 1150) return 4;
    if (width >= 850) return 3;
    if (width >= 580) return 2;
    return 1;
  }, [width]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFaculty = selectedFaculty === 'ALL' || course.faculty === selectedFaculty;
      const matchesDept = selectedDepartment === 'ALL' || course.department === selectedDepartment;
      return matchesSearch && matchesFaculty && matchesDept;
    });
  }, [courses, searchQuery, selectedFaculty, selectedDepartment]);

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setCode('');
    setTitle('');
    setContent('');
    setCredits('3.00');
    setFaculty('COMPUTER_SCIENCE_AND_ENGINEERING');
    setDepartment('COMPUTER_SCIENCE_AND_ENGINEERING');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setCode(course.code);
    setTitle(course.title);
    setContent(course.content);
    setCredits(REV_CREDIT_MAP[course.credits] || '3.00');
    setFaculty(course.faculty || 'COMPUTER_SCIENCE_AND_ENGINEERING');
    setDepartment(course.department || 'COMPUTER_SCIENCE_AND_ENGINEERING');
    setError('');
    setModalOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!code || !title) {
      setError('Course code and title are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let res;
      const body = {
        code,
        title,
        content,
        credits: CREDIT_ENUM_MAP[credits] || 'CREDIT_3_00',
        faculty,
        department,
      };

      if (editingCourse) {
        res = await api.put(`/api/admin/courses/${editingCourse.id}`, body);
      } else {
        res = await api.post('/api/admin/courses', body);
      }

      if (res.success) {
        setModalOpen(false);
        fetchCourses();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = (id: string) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This will remove it from the catalog.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/api/admin/courses/${id}`);
              if (res.success) {
                fetchCourses();
              }
            } catch (err: any) {
              setError(err.message || 'Failed to delete course.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-muted-foreground">Loading courses...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background md:pr-64 lg:pr-64">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row items-center gap-2 px-4 pt-4 pb-2">
          <View className="relative flex-1 justify-center">
            <Search size={18} className="absolute left-3 z-10 text-muted-foreground" />
            <Input
              placeholder="Search courses by code or title..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="h-11 rounded-xl border-transparent bg-muted/50 pl-10 pr-4 focus:border-primary"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Button
            variant="default"
            className="h-11 px-4 rounded-xl flex-row gap-2"
            onPress={handleOpenAddModal}>
            <Plus size={16} />
            <Text className="font-semibold">Add Course</Text>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-3 px-4 pb-3">
          <View className="flex-1 min-w-[140px]">
            <Label className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Faculty</Label>
            <Dropdown
              value={selectedFaculty}
              onValueChange={setSelectedFaculty}
              options={['ALL', ...FACULTIES]}
            />
          </View>
          <View className="flex-1 min-w-[140px]">
            <Label className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Department</Label>
            <Dropdown
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
              options={['ALL', ...DEPARTMENTS]}
            />
          </View>
        </View>
      </View>

      {error ? (
        <View className="m-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <Text className="text-destructive text-sm text-center font-medium">{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredCourses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ flex: 1, padding: 4, maxWidth: `${100 / numColumns}%` }}>
            <CourseCard
              course={item}
              onEdit={() => handleOpenEditModal(item)}
              onDelete={() => handleDeleteCourse(item.id)}
            />
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
          </View>
        }
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl">
            <View className="flex-row items-center justify-between border-b border-border/50 pb-3 mb-4">
              <Text className="text-lg font-bold">{editingCourse ? 'Edit Course' : 'Create New Course'}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[60vh] gap-4 pr-1" showsVerticalScrollIndicator={true}>
              <View className="gap-1.5">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  placeholder="CSE 201"
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                />
              </View>

              <View className="gap-1.5">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  placeholder="Object Oriented Programming"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View className="gap-1.5">
                <Label htmlFor="content">Course Description</Label>
                <Input
                  id="content"
                  placeholder="Introductory course covering OOP concepts"
                  value={content}
                  onChangeText={setContent}
                />
              </View>

              <View className="gap-1.5">
                <Label>Credits</Label>
                <Dropdown
                  value={credits}
                  onValueChange={setCredits}
                  options={CREDITS_OPTIONS}
                />
              </View>

              <View className="gap-1.5">
                <Label>Faculty</Label>
                <Dropdown
                  value={faculty}
                  onValueChange={setFaculty}
                  options={FACULTIES}
                />
              </View>

              <View className="gap-1.5">
                <Label>Department</Label>
                <Dropdown
                  value={department}
                  onValueChange={setDepartment}
                  options={DEPARTMENTS}
                />
              </View>

              <Button
                className="w-full mt-4"
                onPress={handleSaveCourse}
                disabled={submitting}>
                <Text className="font-semibold text-primary-foreground">{submitting ? 'Saving...' : (editingCourse ? 'Update Course' : 'Save Course')}</Text>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
