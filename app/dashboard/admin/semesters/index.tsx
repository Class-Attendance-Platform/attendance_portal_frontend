import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  View,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Search,
  Plus,
  Trash2,
  X,
  Calendar,
  BookOpen,
  Users,
  Pencil,
  GraduationCap,
  ChevronRight,
  UserPlus,
  UserMinus,
  ArrowUpCircle,
} from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { Card } from '@/components/ui/card';
import { adminService, teacherService } from '@/lib/services';
import { Semester } from '@/types/semester';
import { Student } from '@/types/student';
import { CourseInfo } from '@/types/course';
import {
  LEVELS,
  SEMESTERS,
  Level,
  SemesterName,
  formatDateArray,
  parseDateString,
} from '@/types/common';
import { StudentSelector } from '@/components/custom/student-selector';
import { CourseSelector } from '@/components/custom/course-selector';

export default function SemestersScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseInfos, setCourseInfos] = useState<CourseInfo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected active semester details
  const [activeSemesterId, setActiveSemesterId] = useState<string>('');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);

  const [level, setLevel] = useState<Level>('Third');
  const [semester, setSemester] = useState<SemesterName>('I');
  const [startDateStr, setStartDateStr] = useState('2026-02-20');
  const [endDateStr, setEndDateStr] = useState('2026-08-20');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCourseInfoIds, setSelectedCourseInfoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Promotion Modal
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [targetLevel, setTargetLevel] = useState<Level>('Third');
  const [targetSemester, setTargetSemester] = useState<SemesterName>('I');

  // Calendar Date Picker states
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [pickerMonth, setPickerMonth] = useState(4);
  const [pickerYear, setPickerYear] = useState(2026);

  const handleOpenStartDatePicker = () => {
    setPickerTarget('start');
    try {
      const parts = startDateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setPickerYear(y);
          setPickerMonth(m);
        }
      }
    } catch (e) {}
    setDatePickerOpen(true);
  };

  const handleOpenEndDatePicker = () => {
    setPickerTarget('end');
    try {
      const parts = endDateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setPickerYear(y);
          setPickerMonth(m);
        }
      }
    } catch (e) {}
    setDatePickerOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const semRes = await adminService.getSemesters();
      const studRes = await adminService.getStudents();
      const teachRes = await adminService.getTeachers();

      if (semRes.success) {
        setSemesters(semRes.semesters || []);
        if (semRes.semesters && semRes.semesters.length > 0) {
          setActiveSemesterId((prev) => {
            if (prev && semRes.semesters.some((s: Semester) => s.id === prev)) return prev;
            return semRes.semesters[0].id;
          });
        }
      }
      if (studRes.success) {
        setStudents(studRes.students || []);
      }

      const ciList: CourseInfo[] = [];
      if (teachRes.success && teachRes.teachers) {
        for (const t of teachRes.teachers) {
          try {
            const tCoursesRes = await teacherService.getTeacherCourses(t.id);
            if (tCoursesRes.success) {
              const currentList = tCoursesRes.currentCourses || [];
              const prevList = tCoursesRes.previousCourses || [];
              [...currentList, ...prevList].forEach((c) => {
                if (!ciList.some((item) => item.id === c.id)) {
                  ciList.push({
                    id: c.id,
                    course: {
                      id: c.course.id,
                      code: c.course.code,
                      title: c.course.title,
                      content: c.course.content || '',
                      credits: c.course.credits,
                      faculty: c.course.faculty || '',
                      department: c.course.department || '',
                    },
                    teacher: { userName: t.userName, id: t.id },
                    attendance: c.attendance,
                    students: c.students || [],
                  });
                }
              });
            }
          } catch (e) {
            console.error('Error loading teacher courses', e);
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

  const activeSemester = useMemo(() => {
    return semesters.find((s) => s.id === activeSemesterId);
  }, [semesters, activeSemesterId]);

  // Resolve courses in semester
  const resolvedCourses = useMemo(() => {
    if (!activeSemester) return [];
    return (activeSemester.courses || [])
      .map((ciId) => {
        return courseInfos.find((ci) => ci.id === ciId);
      })
      .filter(Boolean);
  }, [activeSemester, courseInfos]);

  // Resolve students in semester with search filter
  const resolvedStudents = useMemo(() => {
    if (!activeSemester) return [];
    return (activeSemester.students || [])
      .map((sid) => {
        return students.find((s) => s.id === sid);
      })
      .filter((s): s is Student => !!s)
      .filter((s) => {
        if (!rosterSearchQuery) return true;
        const name = s.userName || '';
        const emailAddr = s.email || '';
        const query = rosterSearchQuery.toLowerCase();
        return (
          name.toLowerCase().includes(query) ||
          (s.studentId && s.studentId.toString().includes(rosterSearchQuery)) ||
          emailAddr.toLowerCase().includes(query)
        );
      });
  }, [activeSemester, students, rosterSearchQuery]);

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

    setStartDateStr(formatDateArray(sem.startDate));
    setEndDateStr(formatDateArray(sem.endDate));
    setSelectedStudentIds(sem.students || []);
    setSelectedCourseInfoIds(sem.courses || []);
    setError('');
    setModalOpen(true);
  };

  const handleSaveSemester = async () => {
    setSubmitting(true);
    setError('');
    try {
      const startParts = parseDateString(startDateStr);
      const endParts = parseDateString(endDateStr);

      const body = {
        level,
        semester,
        startDate: startParts,
        endDate: endParts,
        students: selectedStudentIds,
        courses: selectedCourseInfoIds,
      };

      let res;
      if (editingSemester) {
        res = await adminService.updateSemester(editingSemester.id, body);
      } else {
        res = await adminService.createSemester(body);
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
              const res = await adminService.deleteSemester(id);
              if (res.success) {
                if (activeSemesterId === id) {
                  setActiveSemesterId('');
                }
                fetchData();
              }
            } catch (err: any) {
              setError(err.message || 'Failed to delete semester.');
            }
          },
        },
      ]
    );
  };

  const handleRemoveStudentFromSemester = async (studentId: string) => {
    if (!activeSemester) return;

    Alert.alert(
      'Remove Student',
      'Are you sure you want to remove this student from the current semester session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedStudents = activeSemester.students.filter((id) => id !== studentId);
              const res = await adminService.updateSemester(activeSemester.id, {
                students: updatedStudents,
              });
              if (res.success) {
                fetchData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove student');
            }
          },
        },
      ]
    );
  };

  const handlePromoteSession = async () => {
    if (!activeSemester) return;
    setSubmitting(true);
    try {
      // Create a new semester session with the same students but updated level/semester
      const body = {
        level: targetLevel,
        semester: targetSemester,
        startDate: parseDateString('2026-08-20'), // Default future dates
        endDate: parseDateString('2027-02-20'),
        students: activeSemester.students,
        courses: [], // Courses should be selected for new semester
      };

      const res = await adminService.createSemester(body);
      if (res.success) {
        setPromotionModalOpen(false);
        fetchData();
        Alert.alert(
          'Success',
          `Students promoted to Level ${targetLevel} Semester ${targetSemester}`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to promote session');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCourseSelection = (id: string) => {
    setSelectedCourseInfoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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
    <View className="flex-1 bg-background">
      <View className={`flex-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* Sidebar: Semester Selection */}
        <View
          className={`border-border bg-card ${
            isMobile ? 'w-full border-b' : 'h-full w-80 border-r'
          }`}>
          <View className={`flex-col p-4 ${isMobile ? 'h-auto' : 'flex-1'}`}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Semester Sessions
              </Text>
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-row gap-1 rounded-xl border-primary/20 bg-primary/10 px-2.5"
                onPress={handleOpenAddModal}>
                <Plus size={12} className="text-primary" />
                <Text className="text-[10px] font-bold text-primary">Add New</Text>
              </Button>
            </View>

            {semesters.length === 0 ? (
              <Text className="mt-4 px-2 text-xs italic text-muted-foreground">
                No semesters configured.
              </Text>
            ) : isMobile ? (
              <View className="mb-2">
                <Dropdown
                  value={
                    activeSemester
                      ? `Level ${activeSemester.level} • Semester ${activeSemester.semester}`
                      : 'Select Session'
                  }
                  onValueChange={(val) => {
                    const found = semesters.find(
                      (s) => `Level ${s.level} • Semester ${s.semester}` === val
                    );
                    if (found) {
                      setActiveSemesterId(found.id);
                      setRosterSearchQuery('');
                    }
                  }}
                  options={semesters.map((s) => `Level ${s.level} • Semester ${s.semester}`)}
                />
              </View>
            ) : (
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {semesters.map((sem) => {
                  const isSelected = activeSemesterId === sem.id;
                  const start = formatDateArray(sem.startDate);
                  const end = formatDateArray(sem.endDate);

                  return (
                    <Pressable
                      key={sem.id}
                      onPress={() => {
                        setActiveSemesterId(sem.id);
                        setRosterSearchQuery('');
                      }}
                      className={`mb-2.5 w-full rounded-2xl border px-4 py-3 ${
                        isSelected
                          ? 'border-primary/20 bg-primary/10'
                          : 'border-transparent bg-muted/10 hover:bg-muted/20'
                      }`}>
                      <View className="flex-row items-center justify-between">
                        <Text
                          className={`text-sm font-extrabold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          Level {sem.level} • Semester {sem.semester}
                        </Text>
                        {isSelected && <View className="h-2 w-2 rounded-full bg-primary" />}
                      </View>

                      <Text className="mt-1 flex-row items-center gap-1 text-[10px] text-muted-foreground">
                        {start} - {end}
                      </Text>

                      <View className="mt-2 flex-row gap-3 border-t border-border/40 pt-2">
                        <View className="flex-row items-center gap-1">
                          <Users size={10} className="text-muted-foreground" />
                          <Text className="text-[10px] font-bold text-foreground/80">
                            {sem.students ? sem.students.length : 0} Students
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <BookOpen size={10} className="text-muted-foreground" />
                          <Text className="text-[10px] font-bold text-foreground/80">
                            {sem.courses ? sem.courses.length : 0} Courses
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Right Workspace: Selected Semester Details */}
        <View style={{ paddingRight: isMobile ? 0 : 320 }} className="flex-1 bg-background/30">
          {activeSemester ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}>
              {/* Header with Title and Control Buttons */}
              <View
                className={`mb-6 flex-col gap-4 border-b border-border/45 pb-5 ${width >= 1280 ? 'flex-row items-center justify-between' : ''}`}>
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-black tracking-tight text-foreground">
                      Level {activeSemester.level} Semester {activeSemester.semester}
                    </Text>
                    <View className="rounded-full bg-primary/10 px-2.5 py-0.5">
                      <Text className="text-[10px] font-bold text-primary">Active Session</Text>
                    </View>
                  </View>
                  <Text className="mt-1.5 flex-row items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={12} className="text-muted-foreground" />
                    Session Dates:{' '}
                    {Array.isArray(activeSemester.startDate)
                      ? activeSemester.startDate.join('/')
                      : activeSemester.startDate}{' '}
                    to{' '}
                    {Array.isArray(activeSemester.endDate)
                      ? activeSemester.endDate.join('/')
                      : activeSemester.endDate}
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-10 flex-row gap-1.5 rounded-xl border-primary/20 bg-primary/5 px-4 transition-transform active:scale-95"
                    onPress={() => {
                      setTargetLevel(activeSemester.level);
                      setTargetSemester(activeSemester.semester === 'I' ? 'II' : 'I');
                      if (activeSemester.semester === 'II') {
                        const nextLevelIdx = LEVELS.indexOf(activeSemester.level) + 1;
                        if (nextLevelIdx < LEVELS.length) {
                          setTargetLevel(LEVELS[nextLevelIdx]);
                        }
                      }
                      setPromotionModalOpen(true);
                    }}>
                    <ArrowUpCircle size={14} className="text-primary" />
                    <Text className="text-xs font-bold text-primary">Promote Session</Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 flex-row gap-1.5 rounded-xl border-border/80 bg-card px-4 transition-transform active:scale-95"
                    onPress={() => handleOpenEditModal(activeSemester)}>
                    <Pencil size={14} className="text-foreground" />
                    <Text className="text-xs font-bold text-foreground">Edit Config</Text>
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-10 flex-row gap-1.5 rounded-xl px-4 transition-transform active:scale-95"
                    onPress={() => handleDeleteSemester(activeSemester.id)}>
                    <Trash2 size={14} className="text-destructive-foreground" />
                    <Text className="text-xs font-bold text-destructive-foreground">Delete</Text>
                  </Button>
                </View>
              </View>

              {/* Stat Cards Row */}
              <View className="mb-6 flex-col gap-4 sm:flex-row">
                <Card className="flex-1 flex-row items-center gap-3.5 rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Users size={20} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Enrolled Students
                    </Text>
                    <Text className="text-lg font-black text-foreground">
                      {activeSemester.students ? activeSemester.students.length : 0} Enrolled
                    </Text>
                  </View>
                </Card>

                <Card className="flex-1 flex-row items-center gap-3.5 rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <BookOpen size={20} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Active Courses
                    </Text>
                    <Text className="text-lg font-black text-foreground">
                      {activeSemester.courses ? activeSemester.courses.length : 0} Courses
                    </Text>
                  </View>
                </Card>
              </View>

              {/* Split Workspace Sections */}
              <View className={`flex-col gap-6 ${width >= 1280 ? 'flex-row' : ''}`}>
                {/* Left pane: Active Courses List */}
                <View className="flex-1 gap-4">
                  <View className="flex-row items-center gap-2 border-b border-border/40 pb-2">
                    <BookOpen size={16} className="text-muted-foreground" />
                    <Text className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                      Active Courses
                    </Text>
                  </View>

                  {resolvedCourses.length === 0 ? (
                    <Card className="items-center justify-center rounded-3xl border border-border/85 bg-card p-6">
                      <Text className="text-xs italic text-muted-foreground">
                        No courses scheduled for this session.
                      </Text>
                    </Card>
                  ) : (
                    resolvedCourses.map(
                      (rc, idx) =>
                        rc && (
                          <Card
                            key={rc.id}
                            className="relative flex-row items-center justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
                            {/* Course visual accent line */}
                            <View className="absolute bottom-0 left-0 top-0 w-1 bg-primary/30" />

                            <View className="flex-1 pl-2 pr-4">
                              <Text className="text-sm font-extrabold text-foreground">
                                {rc.course.code}
                              </Text>
                              <Text
                                className="mt-0.5 text-xs font-semibold text-foreground/80"
                                numberOfLines={1}>
                                {rc.course.title}
                              </Text>
                              <Text className="mt-1.5 text-[10px] text-muted-foreground">
                                Instructor: {rc.teacher.userName}
                              </Text>
                            </View>

                            <View className="flex-none rounded-full border border-border/80 bg-secondary px-3 py-1">
                              <Text className="text-[10px] font-bold text-foreground">
                                {rc.course.credits
                                  ? rc.course.credits.replace('CREDIT_', '').replace('_', '.')
                                  : '2.00'}{' '}
                                CR
                              </Text>
                            </View>
                          </Card>
                        )
                    )
                  )}
                </View>

                {/* Right pane: Student Roster List with search filter */}
                <View className="flex-1 gap-4">
                  <View className="flex-col gap-3 border-b border-border/40 pb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <GraduationCap size={18} className="text-muted-foreground" />
                        <Text className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                          Roster ({resolvedStudents.length})
                        </Text>
                      </View>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-row gap-1 rounded-xl border-emerald-500/20 bg-emerald-500/10 px-2.5"
                        onPress={() => handleOpenEditModal(activeSemester)}>
                        <UserPlus size={12} className="text-emerald-600" />
                        <Text className="text-[10px] font-bold text-emerald-600">Add Student</Text>
                      </Button>
                    </View>

                    {/* Search bar */}
                    <View className="max-w-[200px] flex-1 flex-row items-center rounded-xl border border-border/70 bg-muted/40 px-2.5 py-1.5">
                      <Search size={12} className="mr-1.5 text-muted-foreground" />
                      <Input
                        placeholder="Search roster..."
                        value={rosterSearchQuery}
                        onChangeText={setRosterSearchQuery}
                        className="h-4 flex-1 border-0 bg-transparent p-0 text-[10px] font-semibold text-foreground"
                      />
                    </View>
                  </View>

                  {resolvedStudents.length === 0 ? (
                    <Card className="items-center justify-center rounded-3xl border border-border/85 bg-card p-6">
                      <Text className="text-xs italic text-muted-foreground">
                        No students matching search.
                      </Text>
                    </Card>
                  ) : (
                    <View className="gap-2">
                      {resolvedStudents.map((stud) => (
                        <Card
                          key={stud.id}
                          className="relative flex-row items-center justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-sm">
                          {/* Student visual accent line */}
                          <View className="absolute bottom-0 left-0 top-0 w-1 bg-emerald-500/20" />

                          <View className="flex-1 flex-row items-center pl-2">
                            <View className="flex-1">
                              <Text className="text-xs font-bold text-foreground">
                                {stud.userName}
                              </Text>
                              <Text className="mt-0.5 text-[10px] text-muted-foreground/80">
                                ID: {stud.studentId} • {stud.email}
                              </Text>
                            </View>

                            <View className="mr-2 rounded-full border border-primary/10 bg-primary/5 px-2.5 py-0.5">
                              <Text className="text-[9px] font-bold text-primary">
                                {stud.department
                                  ? stud.department
                                      .split('_')
                                      .map((w) => w[0])
                                      .join('')
                                  : 'N/A'}
                              </Text>
                            </View>

                            <Pressable
                              onPress={() => handleRemoveStudentFromSemester(stud.id)}
                              className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:bg-destructive/20">
                              <UserMinus size={14} className="text-destructive" />
                            </Pressable>
                          </View>
                        </Card>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          ) : (
            <View className="min-h-[400px] flex-1 items-center justify-center rounded-3xl border border-dashed border-border bg-card p-8">
              <GraduationCap size={48} className="mb-3 text-muted-foreground/35" />
              <Text className="text-center text-lg font-bold text-foreground">
                No Academic Session Selected
              </Text>
              <Text className="mt-1 max-w-[280px] text-center text-xs leading-normal text-muted-foreground">
                Select a level and semester configuration from the sidebar list on the left to view
                scheduled courses, student roster list, and session details.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Form Modal for Add/Edit Semester */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="max-h-[90%] w-full max-w-md flex-col rounded-3xl border border-border bg-card p-6 shadow-xl md:max-h-[85%] md:max-w-4xl">
            {/* Header (sticky) */}
            <View className="mb-4 flex-row items-center justify-between border-b border-border/50 pb-3.5">
              <Text className="text-lg font-extrabold text-foreground">
                {editingSemester ? 'Edit Semester Session' : 'Create Semester Session'}
              </Text>
              <Pressable
                onPress={() => setModalOpen(false)}
                className="h-7 w-7 items-center justify-center rounded-full bg-muted/30 active:scale-90">
                <X size={15} className="text-muted-foreground" />
              </Pressable>
            </View>

            {/* Scrollable Content */}
            <ScrollView className="mb-4 flex-1" showsVerticalScrollIndicator={false}>
              <View className={`flex-col ${width >= 768 ? 'flex-row gap-6' : 'gap-4'}`}>
                {/* Left Column: Form Settings */}
                <View className={`gap-4 ${width >= 768 ? 'w-[260px]' : ''}`}>
                  <View className="flex-row gap-3.5">
                    <View className="flex-1 gap-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Level</Label>
                      <Dropdown value={level} onValueChange={setLevel} options={LEVELS} />
                    </View>
                    <View className="flex-1 gap-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Semester</Label>
                      <Dropdown value={semester} onValueChange={setSemester} options={SEMESTERS} />
                    </View>
                  </View>

                  <View className="gap-1.5">
                    <Label className="text-xs font-bold text-muted-foreground">Start Date</Label>
                    <Pressable
                      onPress={handleOpenStartDatePicker}
                      className="relative justify-center">
                      <Input
                        placeholder="YYYY-MM-DD"
                        value={startDateStr}
                        editable={false}
                        className="h-11 rounded-xl border-border/80 bg-muted/10 pr-10 text-foreground"
                      />
                      <Calendar size={16} className="absolute right-3.5 text-muted-foreground" />
                    </Pressable>
                  </View>

                  <View className="gap-1.5">
                    <Label className="text-xs font-bold text-muted-foreground">End Date</Label>
                    <Pressable
                      onPress={handleOpenEndDatePicker}
                      className="relative justify-center">
                      <Input
                        placeholder="YYYY-MM-DD"
                        value={endDateStr}
                        editable={false}
                        className="h-11 rounded-xl border-border/80 bg-muted/10 pr-10 text-foreground"
                      />
                      <Calendar size={16} className="absolute right-3.5 text-muted-foreground" />
                    </Pressable>
                  </View>
                </View>

                {/* Right Column: Selectors */}
                <View className={`flex-1 gap-4 ${width >= 768 ? 'flex-row' : 'flex-col'}`}>
                  <View className="flex-1 gap-1.5">
                    <Label className="text-xs font-bold text-muted-foreground">
                      Select Enrolled Students
                    </Label>
                    <StudentSelector
                      students={students}
                      selectedIds={selectedStudentIds}
                      onToggle={toggleStudentSelection}
                      maxHeight={width >= 768 ? 240 : 160}
                    />
                  </View>

                  <View className="flex-1 gap-1.5">
                    <Label className="text-xs font-bold text-muted-foreground">
                      Select Semester Courses
                    </Label>
                    <CourseSelector
                      courseInfos={courseInfos}
                      selectedIds={selectedCourseInfoIds}
                      onToggle={toggleCourseSelection}
                      maxHeight={width >= 768 ? 240 : 160}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer (sticky) */}
            <View className="border-t border-border/50 pt-4">
              <Button
                className="h-11 w-full rounded-xl transition-transform active:scale-95"
                onPress={handleSaveSemester}
                disabled={submitting}>
                <Text className="text-sm font-bold text-primary-foreground">
                  {submitting ? 'Saving...' : editingSemester ? 'Save Changes' : 'Create Semester'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Promotion Modal */}
      <Modal visible={promotionModalOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ArrowUpCircle size={32} className="text-primary" />
              </View>
              <Text className="text-center text-lg font-black text-foreground">
                Promote Session
              </Text>
              <Text className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
                This will create a new academic session with the current roster. You can then assign
                new courses to this session.
              </Text>
            </View>

            <View className="mb-6 gap-4">
              <View className="gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Target Level</Label>
                <Dropdown
                  value={targetLevel}
                  onValueChange={(val: any) => setTargetLevel(val)}
                  options={LEVELS}
                />
              </View>
              <View className="gap-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Target Semester</Label>
                <Dropdown
                  value={targetSemester}
                  onValueChange={(val: any) => setTargetSemester(val)}
                  options={SEMESTERS}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onPress={() => setPromotionModalOpen(false)}>
                <Text className="text-sm font-bold text-foreground">Cancel</Text>
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl transition-transform active:scale-95"
                onPress={handlePromoteSession}
                disabled={submitting}>
                <Text className="text-sm font-bold text-primary-foreground">
                  {submitting ? 'Processing...' : 'Promote Now'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={datePickerOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setDatePickerOpen(false)}>
          <View
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl"
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}>
            <View className="mb-4 flex-row items-center justify-between border-b border-border/40 pb-3">
              <Text className="text-sm font-black uppercase tracking-wide text-foreground">
                Select {pickerTarget === 'start' ? 'Start' : 'End'} Date
              </Text>
              <Pressable
                onPress={() => setDatePickerOpen(false)}
                className="h-6 w-6 items-center justify-center rounded-full bg-muted/30">
                <X size={12} className="text-muted-foreground" />
              </Pressable>
            </View>

            <View className="mb-3.5 flex-row items-center justify-between px-1">
              <Text className="text-sm font-extrabold text-foreground">
                {(() => {
                  const monthNames = [
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December',
                  ];
                  return monthNames[pickerMonth];
                })()}{' '}
                {pickerYear}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-lg border-border/80 bg-muted/20 px-2.5"
                  onPress={() => {
                    if (pickerMonth === 0) {
                      setPickerMonth(11);
                      setPickerYear((prev) => prev - 1);
                    } else {
                      setPickerMonth((prev) => prev - 1);
                    }
                  }}>
                  <Text className="text-xs font-bold text-foreground">←</Text>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-lg border-border/80 bg-muted/20 px-2.5"
                  onPress={() => {
                    if (pickerMonth === 11) {
                      setPickerMonth(0);
                      setPickerYear((prev) => prev + 1);
                    } else {
                      setPickerMonth((prev) => prev + 1);
                    }
                  }}>
                  <Text className="text-xs font-bold text-foreground">→</Text>
                </Button>
              </View>
            </View>

            <View className="mb-2 flex-row border-b border-border/40 pb-1.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <View key={d} className="flex-1 items-center">
                  <Text className="text-[9px] font-bold uppercase text-muted-foreground">{d}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {(() => {
                const totalDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                const firstDayIndex = new Date(pickerYear, pickerMonth, 1).getDay();

                const calendarCells = [];
                for (let i = 0; i < firstDayIndex; i++) {
                  calendarCells.push({ key: `empty-${i}`, day: null });
                }
                for (let day = 1; day <= totalDays; day++) {
                  calendarCells.push({ key: `day-${day}`, day });
                }

                return calendarCells.map((cell) => {
                  const isEmpty = cell.day === null;
                  const isSelected =
                    !isEmpty &&
                    (() => {
                      const currentStr = pickerTarget === 'start' ? startDateStr : endDateStr;
                      const monthStr = (pickerMonth + 1).toString().padStart(2, '0');
                      const dayStr = cell.day!.toString().padStart(2, '0');
                      return currentStr === `${pickerYear}-${monthStr}-${dayStr}`;
                    })();

                  return (
                    <Pressable
                      key={cell.key}
                      disabled={isEmpty}
                      onPress={() => {
                        if (cell.day) {
                          const monthStr = (pickerMonth + 1).toString().padStart(2, '0');
                          const dayStr = cell.day.toString().padStart(2, '0');
                          const dateString = `${pickerYear}-${monthStr}-${dayStr}`;
                          if (pickerTarget === 'start') {
                            setStartDateStr(dateString);
                          } else {
                            setEndDateStr(dateString);
                          }
                          setDatePickerOpen(false);
                        }
                      }}
                      style={{ width: `${100 / 7}%` }}
                      className={`min-h-[36px] items-center justify-center rounded-lg border p-1.5 ${
                        isEmpty ? 'border-transparent opacity-0' : 'active:scale-95'
                      } ${
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-transparent hover:bg-muted/30'
                      }`}>
                      {!isEmpty && (
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? 'font-black text-primary-foreground' : 'text-foreground'
                          }`}>
                          {cell.day}
                        </Text>
                      )}
                    </Pressable>
                  );
                });
              })()}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
