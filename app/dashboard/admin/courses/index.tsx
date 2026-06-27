import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  View,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { Search, Plus, X } from 'lucide-react-native';
import { Image } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { CourseCard } from '@/components/custom/coursecard';
import TopPanel from '@/components/custom/toppanel';
import { Course } from '@/types/course';
import { configService, adminService } from '@/lib/services';
import { webAlert } from '@/lib/utils';
import { ConfirmDialog } from '@/components/custom/confirm-dialog';

function humanize(str: string): string {
  if (!str) return '';
  return str
    .split('_')
    .map((word) => {
      if (word === 'AND') return 'and';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export default function CoursesScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmPress, setOnConfirmPress] = useState<() => void>(() => {});

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirmPress(() => () => {
      onConfirm();
      setConfirmVisible(false);
    });
    setConfirmVisible(true);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [creditEnumMap, setCreditEnumMap] = useState<Record<string, string>>({});
  const [revCreditMap, setRevCreditMap] = useState<Record<string, string>>({});
  const [creditsOptions, setCreditsOptions] = useState<string[]>([]);

  const [facultyMap, setFacultyMap] = useState<Record<string, string>>({});
  const [revFacultyMap, setRevFacultyMap] = useState<Record<string, string>>({});
  const [facultyOptions, setFacultyOptions] = useState<string[]>([]);

  const [deptMap, setDeptMap] = useState<Record<string, string>>({});
  const [revDeptMap, setRevDeptMap] = useState<Record<string, string>>({});
  const [deptOptions, setDeptOptions] = useState<string[]>([]);

  const [credits, setCredits] = useState('3.00');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchConfig = async () => {
    try {
      const [creditsRes, facultiesRes, deptsRes] = await Promise.all([
        configService.getCredits(),
        configService.getFaculties(),
        configService.getDepartments(),
      ]);
      if (creditsRes.success) {
        setCreditEnumMap(creditsRes.creditEnumMap);
        setRevCreditMap(creditsRes.revCreditMap);
        setCreditsOptions(Object.keys(creditsRes.creditEnumMap));
      }
      if (facultiesRes.success && facultiesRes.faculties) {
        const map: Record<string, string> = {};
        const revMap: Record<string, string> = {};
        const options: string[] = [];
        facultiesRes.faculties.forEach((f: string) => {
          const h = humanize(f);
          map[h] = f;
          revMap[f] = h;
          options.push(h);
        });
        setFacultyMap(map);
        setRevFacultyMap(revMap);
        setFacultyOptions(options);
        setFaculty(options[0] || '');
      }
      if (deptsRes.success && deptsRes.departments) {
        const map: Record<string, string> = {};
        const revMap: Record<string, string> = {};
        const options: string[] = [];
        deptsRes.departments.forEach((d: string) => {
          const h = humanize(d);
          map[h] = d;
          revMap[d] = h;
          options.push(h);
        });
        setDeptMap(map);
        setRevDeptMap(revMap);
        setDeptOptions(options);
        setDepartment(options[0] || '');
      }
    } catch (err: any) {
      console.error('Failed to load courses configuration:', err);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getCourses();
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
    fetchConfig();
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
      const titleStr = course.title || '';
      const codeStr = course.code || '';
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        titleStr.toLowerCase().includes(query) || codeStr.toLowerCase().includes(query);

      const rawSelFaculty = facultyMap[selectedFaculty] || selectedFaculty;
      const matchesFaculty = selectedFaculty === 'ALL' || course.faculty === rawSelFaculty;

      const rawSelDept = deptMap[selectedDepartment] || selectedDepartment;
      const matchesDept = selectedDepartment === 'ALL' || course.department === rawSelDept;

      return matchesSearch && matchesFaculty && matchesDept;
    });
  }, [courses, searchQuery, selectedFaculty, selectedDepartment, facultyMap, deptMap]);

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setCode('');
    setTitle('');
    setContent('');
    setCredits(creditsOptions[0] || '3.00');
    setFaculty(facultyOptions[0] || '');
    setDepartment(deptOptions[0] || '');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setCode(course.code);
    setTitle(course.title);
    setContent(course.content || '');

    setCredits(revCreditMap[course.credits] || '3.00');
    setFaculty(revFacultyMap[course.faculty] || course.faculty);
    setDepartment(revDeptMap[course.department] || course.department);
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
        credits: creditEnumMap[credits] || 'CREDIT_3_00',
        faculty: facultyMap[faculty] || faculty,
        department: deptMap[department] || department,
      };

      if (editingCourse) {
        res = await adminService.updateCourse(editingCourse.id, body);
      } else {
        res = await adminService.createCourse(body);
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
    showConfirm(
      'Delete Course',
      'Are you sure you want to delete this course? This will remove it from the catalog.',
      async () => {
        try {
          const res = await adminService.deleteCourse(id);
          if (res.success) {
            fetchCourses();
          }
        } catch (err: any) {
          setError(err.message || 'Failed to delete course.');
        }
      }
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
    <View className="flex-1 bg-background">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row items-center gap-2 px-4 pb-2 pt-4">
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
            className="h-11 flex-row gap-2 rounded-xl px-4"
            onPress={handleOpenAddModal}>
            <Plus size={16} className="text-background" />
            <Text className="font-semibold">Add Course</Text>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-3 px-4 pb-3">
          <View className="min-w-[140px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Faculty
            </Label>
            <Dropdown
              value={selectedFaculty}
              onValueChange={setSelectedFaculty}
              options={['ALL', ...facultyOptions]}
            />
          </View>
          <View className="min-w-[140px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Department
            </Label>
            <Dropdown
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
              options={['ALL', ...deptOptions]}
            />
          </View>
        </View>
      </View>

      {error ? (
        <View className="m-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
          <Text className="text-center text-sm font-medium text-destructive">{error}</Text>
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
          <View className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <View className="mb-4 flex-row items-center justify-between border-b border-border/50 pb-3">
              <Text className="text-lg font-bold">
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </Text>
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
                  options={creditsOptions.length > 0 ? creditsOptions : [credits]}
                />
              </View>

              <View className="gap-1.5">
                <Label>Faculty</Label>
                <Dropdown
                  value={faculty}
                  onValueChange={setFaculty}
                  options={facultyOptions.length > 0 ? facultyOptions : [faculty]}
                />
              </View>

              <View className="gap-1.5">
                <Label>Department</Label>
                <Dropdown
                  value={department}
                  onValueChange={setDepartment}
                  options={deptOptions.length > 0 ? deptOptions : [department]}
                />
              </View>

              <Button className="mt-4 w-full" onPress={handleSaveCourse} disabled={submitting}>
                <Text className="font-semibold text-primary-foreground">
                  {submitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Save Course'}
                </Text>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmVisible}
        title={confirmTitle}
        message={confirmMessage}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={onConfirmPress}
      />
    </View>
  );
}
