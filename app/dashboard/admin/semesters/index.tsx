import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { FlatList, View, useWindowDimensions, ActivityIndicator, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Search, Plus, Trash2, X, Calendar, BookOpen, Users, Pencil, GraduationCap } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { api } from '@/lib/api';

const LEVELS = ['First', 'Second', 'Third', 'Fourth'];
const SEMESTERS = ['I', 'II'];

interface Semester {
  id: string;
  level: string;
  semester: string;
  startDate: any;
  endDate: any;
  students: string[];
  courses: string[];
}

interface Student {
  id: string;
  userName: string;
  studentId: number;
}

interface CourseInfo {
  id: string;
  course: {
    title: string;
    code: string;
  };
  teacher: {
    userName: string;
  };
}

export default function SemestersScreen() {
  const { width } = useWindowDimensions();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseInfos, setCourseInfos] = useState<CourseInfo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);

  const [level, setLevel] = useState('Third');
  const [semester, setSemester] = useState('I');
  const [startDateStr, setStartDateStr] = useState('2026-02-20');
  const [endDateStr, setEndDateStr] = useState('2026-08-20');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCourseInfoIds, setSelectedCourseInfoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const semRes = await api.get('/api/admin/semesters');
      const studRes = await api.get('/api/admin/students');
      const teachRes = await api.get('/api/admin/teachers');

      if (semRes.success) {
        setSemesters(semRes.semesters || []);
      }
      if (studRes.success) {
        setStudents(studRes.students || []);
      }

      const ciList: CourseInfo[] = [];
      if (teachRes.success && teachRes.teachers) {
        for (const t of teachRes.teachers) {
          try {
            const tCoursesRes = await api.get(`/api/teacher/${t.id}/courses`);
            if (tCoursesRes.success) {
              const currentList = tCoursesRes.currentCourses || [];
              const prevList = tCoursesRes.previousCourses || [];
              [...currentList, ...prevList].forEach(c => {
                if (!ciList.some(item => item.id === c.id)) {
                  ciList.push({
                    id: c.id,
                    course: { title: c.course.title, code: c.course.code },
                    teacher: { userName: t.userName }
                  });
                }
              });
            }
          } catch (e) {
            console.error("Error loading teacher courses", e);
          }
        }
      }
      setCourseInfos(ciList);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch semesters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const numColumns = useMemo(() => {
    if (width >= 1200) return 3;
    if (width >= 768) return 2;
    return 1;
  }, [width]);

  const handleOpenAddModal = () => {
    setEditingSemester(null);
    setLevel('Third');
    setSemester('I');
    setStartDateStr('2026-02-20');
    setEndDateStr('2026-08-20');
    setSelectedStudentIds([]);
    setSelectedCourseInfoIds([]);
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (sem: Semester) => {
    setEditingSemester(sem);
    setLevel(sem.level);
    setSemester(sem.semester);
    
    const startStr = Array.isArray(sem.startDate) 
      ? sem.startDate.map((n: any) => String(n).padStart(2, '0')).join('-') 
      : String(sem.startDate || '2026-02-20');
      
    const endStr = Array.isArray(sem.endDate) 
      ? sem.endDate.map((n: any) => String(n).padStart(2, '0')).join('-') 
      : String(sem.endDate || '2026-08-20');
      
    setStartDateStr(startStr);
    setEndDateStr(endStr);
    setSelectedStudentIds(sem.students || []);
    setSelectedCourseInfoIds(sem.courses || []);
    setError('');
    setModalOpen(true);
  };

  const handleSaveSemester = async () => {
    setSubmitting(true);
    setError('');
    try {
      const startParts = startDateStr.split('-').map(Number);
      const endParts = endDateStr.split('-').map(Number);

      const body = {
        level,
        semester,
        startDate: startParts.length === 3 ? startParts : [2026, 2, 20],
        endDate: endParts.length === 3 ? endParts : [2026, 8, 20],
        students: selectedStudentIds,
        courses: selectedCourseInfoIds,
      };

      let res;
      if (editingSemester) {
        res = await api.put(`/api/admin/semesters/${editingSemester.id}`, body);
      } else {
        res = await api.post('/api/admin/semesters', body);
      }

      if (res.success) {
        setModalOpen(false);
        setSelectedStudentIds([]);
        setSelectedCourseInfoIds([]);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save semester.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSemester = (id: string) => {
    Alert.alert(
      'Delete Semester Config',
      'Are you sure you want to delete this semester configuration? Students enrolled in this semester will need to be reallocated.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/api/admin/semesters/${id}`);
              if (res.success) {
                fetchData();
              }
            } catch (err: any) {
              setError(err.message || 'Failed to delete semester.');
            }
          }
        }
      ]
    );
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleCourseSelection = (id: string) => {
    setSelectedCourseInfoIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-muted-foreground">Loading semesters...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background md:pr-64 lg:pr-64">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row items-center gap-2 px-4 py-4">
          <Text className="flex-1 text-lg font-bold text-foreground">Semesters Config</Text>
          <Button
            variant="default"
            className="h-11 px-4 rounded-xl flex-row gap-2"
            onPress={handleOpenAddModal}>
            <Plus size={16} />
            <Text className="font-semibold">Add Semester</Text>
          </Button>
        </View>
      </View>

      {error ? (
        <View className="m-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <Text className="text-destructive text-sm text-center font-medium">{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={semesters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const start = Array.isArray(item.startDate) ? item.startDate.join('/') : item.startDate;
          const end = Array.isArray(item.endDate) ? item.endDate.join('/') : item.endDate;
          
          // Resolve course codes
          const resolvedCourses = (item.courses || []).map(ciId => {
            return courseInfos.find(ci => ci.id === ciId);
          }).filter(Boolean);

          return (
            <View
              style={{ 
                flex: 1, 
                padding: 8, 
                maxWidth: numColumns > 1 ? `${100 / numColumns}%` : '100%' 
              }}
            >
              <View className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm flex-1 relative">
                {/* Left accent color bar */}
                <View className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                
                <View className="p-5 pl-7 gap-3">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-extrabold text-foreground">
                          Level {item.level}
                        </Text>
                        <View className="bg-primary/10 rounded-full px-2.5 py-0.5">
                          <Text className="text-[10px] font-bold text-primary">Semester {item.semester}</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1.5 mt-2">
                        <Calendar size={13} className="text-muted-foreground" />
                        <Text className="text-xs text-muted-foreground font-semibold">
                          {start} - {end}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <Pressable
                        onPress={() => handleOpenEditModal(item)}
                        className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/5 active:scale-95 transition-transform"
                      >
                        <Pencil size={14} className="text-primary" />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSemester(item.id)}
                        className="h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/5 active:scale-95 transition-transform"
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Pressable>
                    </View>
                  </View>

                  <View className="my-1.5 h-px bg-border/40" />

                  <View className="flex-row gap-5">
                    <View className="flex-row items-center gap-2">
                      <View className="h-7 w-7 rounded-full bg-muted items-center justify-center">
                        <Users size={12} className="text-muted-foreground" />
                      </View>
                      <View>
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Students</Text>
                        <Text className="text-xs text-foreground font-extrabold">
                          {item.students ? item.students.length : 0} Enrolled
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row items-center gap-2">
                      <View className="h-7 w-7 rounded-full bg-muted items-center justify-center">
                        <BookOpen size={12} className="text-muted-foreground" />
                      </View>
                      <View>
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Courses</Text>
                        <Text className="text-xs text-foreground font-extrabold">
                          {item.courses ? item.courses.length : 0} Active
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Course tag chip list */}
                  {resolvedCourses.length > 0 ? (
                    <View className="mt-2.5">
                      <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">Enrolled Course Codes</Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {resolvedCourses.map((rc: any, idx) => (
                          <View key={idx} className="bg-secondary px-2.5 py-0.5 rounded-full border border-border/80">
                            <Text className="text-[10px] font-bold text-foreground">{rc.course.code}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
        numColumns={numColumns}
        key={numColumns}
        contentContainerClassName="p-2 pb-8"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-10 flex-1 items-center justify-center p-8">
            <Text className="text-center text-lg font-semibold text-foreground">
              No semesters configured yet.
            </Text>
          </View>
        }
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl max-h-[85%]">
            <View className="flex-row items-center justify-between border-b border-border/50 pb-3 mb-4">
              <Text className="text-lg font-bold">{editingSemester ? 'Edit Semester Session' : 'Create Semester Session'}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <ScrollView className="gap-4 pr-1" showsVerticalScrollIndicator>
              <View className="flex-row gap-2 mb-2">
                <View className="flex-1 gap-1.5">
                  <Label>Level</Label>
                  <Dropdown
                    value={level}
                    onValueChange={setLevel}
                    options={LEVELS}
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label>Semester</Label>
                  <Dropdown
                    value={semester}
                    onValueChange={setSemester}
                    options={SEMESTERS}
                  />
                </View>
              </View>

              <View className="gap-1.5 mb-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  placeholder="YYYY-MM-DD"
                  value={startDateStr}
                  onChangeText={setStartDateStr}
                />
              </View>

              <View className="gap-1.5 mb-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  placeholder="YYYY-MM-DD"
                  value={endDateStr}
                  onChangeText={setEndDateStr}
                />
              </View>

              <View className="gap-1.5 mb-2">
                <Label>Select Enrolled Students ({selectedStudentIds.length})</Label>
                <View className="h-32 border border-border rounded-xl p-2 bg-muted/20">
                  <ScrollView nestedScrollEnabled>
                    {students.map(s => (
                      <Pressable
                        key={s.id}
                        onPress={() => toggleStudentSelection(s.id)}
                        className={`p-2 rounded-lg mb-1 flex-row justify-between items-center ${
                          selectedStudentIds.includes(s.id) ? 'bg-primary/10 border border-primary/20' : 'bg-card'
                        }`}
                      >
                        <Text className="text-xs font-medium text-foreground">
                          {s.studentId} - {s.userName}
                        </Text>
                        {selectedStudentIds.includes(s.id) && <Text className="text-primary text-xs font-bold">Selected</Text>}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View className="gap-1.5 mb-4">
                <Label>Select Semester Courses ({selectedCourseInfoIds.length})</Label>
                <View className="h-32 border border-border rounded-xl p-2 bg-muted/20">
                  <ScrollView nestedScrollEnabled>
                    {courseInfos.map(ci => (
                      <Pressable
                        key={ci.id}
                        onPress={() => toggleCourseSelection(ci.id)}
                        className={`p-2 rounded-lg mb-1 flex-row justify-between items-center ${
                          selectedCourseInfoIds.includes(ci.id) ? 'bg-primary/10 border border-primary/20' : 'bg-card'
                        }`}
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-xs font-bold text-foreground">
                            {ci.course.code}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground line-clamp-1">
                            {ci.course.title} ({ci.teacher.userName})
                          </Text>
                        </View>
                        {selectedCourseInfoIds.includes(ci.id) && <Text className="text-primary text-xs font-bold flex-none">Selected</Text>}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Button
                className="w-full mb-4"
                onPress={handleSaveSemester}
                disabled={submitting}>
                <Text className="font-semibold">{submitting ? 'Saving...' : (editingSemester ? 'Save Changes' : 'Create Semester')}</Text>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}