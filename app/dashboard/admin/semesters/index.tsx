import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import {
  View,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  FlatList,
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
import { Badge } from '@/components/ui/badge';
import { adminService } from '@/lib/services';
import { Semester } from '@/types/semester';
import { Student } from '@/types/student';
import { CourseInfo, Course } from '@/types/course';
import { Teacher } from '@/types/teacher';
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
import { webAlert } from '@/lib/utils';
import { Platform } from 'react-native';
import { ConfirmDialog } from '@/components/custom/confirm-dialog';

const getLevelNumber = (l: Level) => {
  switch (l) {
    case 'First': return '1';
    case 'Second': return '2';
    case 'Third': return '3';
    case 'Fourth': return '4';
    default: return l;
  }
};

export default function SemestersScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseInfos, setCourseInfos] = useState<CourseInfo[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courseTeacherMap, setCourseTeacherMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmPress, setOnConfirmPress] = useState<() => void>(() => { });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setOnConfirmPress(() => () => {
      onConfirm();
      setConfirmVisible(false);
    });
    setConfirmVisible(true);
  };

  const [activeSemesterId, setActiveSemesterId] = useState<string>('');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);

  const [level, setLevel] = useState<Level>('Third');
  const [semester, setSemester] = useState<SemesterName>('I');
  const [startDateStr, setStartDateStr] = useState('2026-02-20');
  const [endDateStr, setEndDateStr] = useState('2026-08-20');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCourseInfoIds, setSelectedCourseInfoIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [targetLevel, setTargetLevel] = useState<Level>('Third');
  const [targetSemester, setTargetSemester] = useState<SemesterName>('I');

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const handleOpenStartDatePicker = () => {
    setPickerTarget('start');
    try {
      const parts = startDateStr.split('-');
      if (parts.length === 3) {
        setPickerYear(parseInt(parts[0], 10));
        setPickerMonth(parseInt(parts[1], 10) - 1);
      }
    } catch (e) { }
    setDatePickerOpen(true);
  };

  const handleOpenEndDatePicker = () => {
    setPickerTarget('end');
    try {
      const parts = endDateStr.split('-');
      if (parts.length === 3) {
        setPickerYear(parseInt(parts[0], 10));
        setPickerMonth(parseInt(parts[1], 10) - 1);
      }
    } catch (e) { }
    setDatePickerOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [semRes, studRes, ciRes, cRes, teachRes] = await Promise.all([
        adminService.getSemesters(),
        adminService.getStudents(),
        adminService.getCourseInfos(),
        adminService.getCourses(),
        adminService.getTeachers(),
      ]);

      if (semRes.success) {
        const mappedSemesters = (semRes.semesters || []).map((s: any) => ({
          ...s,
          startDate: s.start_date || s.startDate,
          endDate: s.end_date || s.endDate,
        }));
        setSemesters(mappedSemesters);
        if (mappedSemesters.length > 0 && !activeSemesterId) {
          setActiveSemesterId(mappedSemesters[0].id);
        }
      }
      if (studRes.success) setStudents(studRes.students || []);
      if (ciRes.success) setCourseInfos(ciRes.course_infos || []);
      if (cRes.success) setCourses(cRes.courses || []);
      if (teachRes.success) setTeachers(teachRes.teachers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSemester = useMemo(
    () => semesters.find((s) => s.id === activeSemesterId),
    [semesters, activeSemesterId]
  );

  const resolvedCourses = useMemo(() => {
    if (!activeSemester) return [];
    return (activeSemester.courses || [])
      .map((id) => courseInfos.find((ci) => ci.id === id))
      .filter(Boolean);
  }, [activeSemester, courseInfos]);

  const resolvedStudents = useMemo(() => {
    if (!activeSemester) return [];
    return (activeSemester.students || [])
      .map((id) => students.find((s) => s.id === id))
      .filter((s): s is Student => !!s)
      .filter((s) => {
        if (!rosterSearchQuery) return true;
        const q = rosterSearchQuery.toLowerCase();
        return (
          (s.userName || '').toLowerCase().includes(q) ||
          (s.studentId || '').toString().includes(q) ||
          (s.email || '').toLowerCase().includes(q)
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
    setCourseTeacherMap({});
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
    const courseIds = (sem.courses || [])
      .map((ciId) => courseInfos.find((ci) => ci.id === ciId)?.course?.id)
      .filter(Boolean) as string[];
    setSelectedCourseInfoIds(courseIds);

    const initialMap: Record<string, string> = {};
    (sem.courses || []).forEach((ciId) => {
      const ci = courseInfos.find((c) => c.id === ciId);
      if (ci && ci.course && ci.teacher) {
        initialMap[ci.course.id] = ci.teacher.id || '';
      }
    });
    setCourseTeacherMap(initialMap);

    setError('');
    setModalOpen(true);
  };

  const handleSaveSemester = async () => {
    setSubmitting(true);
    try {
      const body = {
        level,
        semester,
        start_date: startDateStr,
        end_date: endDateStr,
        students: selectedStudentIds,
        courses: selectedCourseInfoIds.map((cid) => ({
          course: cid,
          teacher: courseTeacherMap[cid] || null,
        })),
      };
      let res = editingSemester
        ? await adminService.updateSemester(editingSemester.id, body)
        : await adminService.createSemester(body);
      if (res.success) {
        setModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setError(err.message || 'Error saving semester.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSemester = (id: string) => {
    showConfirm('Delete Semester', 'Are you sure you want to delete this semester?', async () => {
      if ((await adminService.deleteSemester(id)).success) {
        if (activeSemesterId === id) setActiveSemesterId('');
        fetchData();
      }
    });
  };

  const handlePromoteSession = async () => {
    if (!activeSemester) return;
    setSubmitting(true);
    try {
      const res = await adminService.createSemester({
        level: targetLevel,
        semester: targetSemester,
        start_date: '2026-08-20',
        end_date: '2027-02-20',
        students: activeSemester.students,
        courses: [],
      });
      if (res.success) {
        // Delete the previous semester
        await adminService.deleteSemester(activeSemester.id);
        setPromotionModalOpen(false);
        if (res.semester && res.semester.id) {
          setActiveSemesterId(res.semester.id);
        } else {
          setActiveSemesterId('');
        }
        await fetchData();
        webAlert('Success', 'Promotion complete. The previous semester has been deleted.');
      }
    } catch (err: any) {
      webAlert('Error', 'Promotion failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudentFromSemester = async (studentId: string) => {
    if (!activeSemester) return;
    showConfirm('Remove Student', 'Remove student from this semester?', async () => {
      const updated = (activeSemester.students || []).filter((id) => id !== studentId);
      const res = await adminService.updateSemester(activeSemester.id, { students: updated });
      if (res.success) fetchData();
    });
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleCourseSelection = (id: string) => {
    setSelectedCourseInfoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };


  const numColumns = useMemo(() => {
    if (width >= 1440) return 4;
    if (width >= 1150) return 3;
    if (width >= 768) return 2;
    return 1;
  }, [width]);

  if (loading)

    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View className="flex-1 bg-background">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row items-center gap-2 px-4 pb-2 pt-4">
          <View className="relative flex-1 justify-center">
            <Text className="text-xl font-bold">Academic Semesters</Text>
          </View>
          <Button
            variant="default"
            className="h-11 flex-row gap-2 rounded-xl px-4"
            onPress={handleOpenAddModal}>
            <Plus size={16} className="text-background" />
            <Text className="font-semibold">Add Semester</Text>
          </Button>
        </View>
      </View>

      <FlatList
        data={semesters}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerClassName="p-4 pb-8 gap-4"
        columnWrapperClassName={numColumns > 1 ? "gap-4" : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-10 flex-1 items-center justify-center p-8">
            <Text className="text-center text-lg font-semibold text-foreground">
              No sessions found.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <Card className="flex-1 rounded-[24px] border-border/60 bg-card p-5 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-lg font-black text-foreground">
                    Level {getLevelNumber(item.level)} Semester {item.semester}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-muted-foreground">
                    {formatDateArray(item.startDate)} — {formatDateArray(item.endDate)}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    className="h-8 w-8 items-center justify-center rounded-xl bg-muted/50"
                    onPress={() => handleOpenEditModal(item)}>
                    <Pencil size={14} className="text-foreground" />
                  </Pressable>
                  <Pressable
                    className="h-8 w-8 items-center justify-center rounded-xl bg-destructive/10"
                    onPress={() => handleDeleteSemester(item.id)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Pressable>
                </View>
              </View>

              <View className="mt-4 flex-row gap-4 border-t border-border/40 pt-4">
                <View className="flex-1 flex-row items-center gap-2">
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Users size={14} className="text-emerald-600" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Students</Text>
                    <Text className="text-base font-black text-foreground">{item.students?.length || 0}</Text>
                  </View>
                </View>
                <View className="flex-1 flex-row items-center gap-2">
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10">
                    <BookOpen size={14} className="text-indigo-600" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Courses</Text>
                    <Text className="text-base font-black text-foreground">{item.courses?.length || 0}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex-row gap-2 rounded-xl border-primary/20 bg-primary/5"
                  onPress={() => {
                    setTargetLevel(item.level);
                    setTargetSemester(item.semester === 'I' ? 'II' : 'I');
                    if (item.semester === 'II') {
                      const idx = LEVELS.indexOf(item.level) + 1;
                      if (idx < LEVELS.length) setTargetLevel(LEVELS[idx]);
                    }
                    setActiveSemesterId(item.id);
                    setPromotionModalOpen(true);
                  }}
                >
                  <ArrowUpCircle size={14} className="text-primary" />
                  <Text className="text-xs font-black text-primary">Promote Session</Text>
                </Button>
              </View>
            </Card>
          </View>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-border bg-card shadow-2xl">
            <View className="flex-row items-center justify-between border-b border-border/50 bg-muted/5 p-5">
              <View>
                <Text className="text-lg font-black text-foreground">
                  {editingSemester ? 'Edit Academic Session' : 'Create New Session'}
                </Text>
              </View>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-xl bg-muted/30 active:scale-90"
                onPress={() => setModalOpen(false)}>
                <X size={20} className="text-muted-foreground" />
              </Pressable>
            </View>
            <ScrollView className="max-h-[75vh] p-5">
              <View className="gap-6 flex-col md:flex-row">
                <View className="flex-1 gap-6">
                  <View className="rounded-[24px] border border-border/60 bg-muted/10 p-5">
                    <Text className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary">
                      Basic Configuration
                    </Text>

                    <View className="mb-4 flex-row gap-3">
                      <View className="flex-1 gap-1.5">
                        <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Level
                        </Label>
                        <Dropdown value={level} onValueChange={setLevel} options={LEVELS} />
                      </View>
                      <View className="flex-1 gap-1.5">
                        <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Term
                        </Label>
                        <Dropdown
                          value={semester}
                          onValueChange={setSemester}
                          options={SEMESTERS}
                        />
                      </View>
                    </View>

                    <View className="mb-4 gap-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Start Date
                      </Label>
                      <Pressable
                        onPress={handleOpenStartDatePicker}
                        className="relative justify-center">
                        <Input
                          value={startDateStr}
                          editable={false}
                          className="h-11 rounded-xl border-border bg-background pr-12 text-sm font-bold text-foreground"
                        />
                        <Calendar size={16} className="absolute right-4 text-muted-foreground/60" />
                      </Pressable>
                    </View>

                    <View className="gap-1.5">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        End Date
                      </Label>
                      <Pressable
                        onPress={handleOpenEndDatePicker}
                        className="relative justify-center">
                        <Input
                          value={endDateStr}
                          editable={false}
                          className="h-11 rounded-xl border-border bg-background pr-12 text-sm font-bold text-foreground"
                        />
                        <Calendar size={16} className="absolute right-4 text-muted-foreground/60" />
                      </Pressable>
                    </View>
                  </View>

                  {error ? (
                    <Text className="rounded-xl bg-destructive/10 px-2 py-3 text-center text-xs font-black text-destructive">
                      {error}
                    </Text>
                  ) : null}

                  <View className="gap-2 border border-border/60 rounded-[24px] p-4 bg-card">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Assigned Courses
                      </Text>
                      <Badge className="bg-indigo-500/10 px-2 py-0.5">
                        <Text className="text-[9px] font-black text-indigo-600">
                          {selectedCourseInfoIds.length} Selected
                        </Text>
                      </Badge>
                    </View>
                    <CourseSelector
                      courses={courses}
                      selectedIds={selectedCourseInfoIds}
                      onToggle={toggleCourseSelection}
                      maxHeight={200}
                    />
                  </View>
                </View>

                <View className="flex-1 gap-6">
                  <View className="gap-2 border border-border/60 rounded-[24px] p-4 bg-card">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Student Roster
                      </Text>
                      <Badge className="bg-primary/10 px-2 py-0.5">
                        <Text className="text-[9px] font-black text-primary">
                          {selectedStudentIds.length} Selected
                        </Text>
                      </Badge>
                    </View>
                    <StudentSelector
                      students={students}
                      selectedIds={selectedStudentIds}
                      onToggle={toggleStudentSelection}
                      maxHeight={200}
                    />
                  </View>

                  {selectedCourseInfoIds.length > 0 && (
                    <View className="gap-2 border border-border/60 rounded-[24px] p-4 bg-card">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Assign Instructors
                      </Text>
                      <ScrollView style={{ maxHeight: 200 }} className="rounded-xl border border-border bg-muted/5 p-2" nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        <View className="gap-2">
                          {selectedCourseInfoIds.map((cid) => {
                            const course = courses.find((c) => c.id === cid);
                            if (!course) return null;
                            const currentTeacherId = courseTeacherMap[cid] || '';
                            const teacherOptions = [
                              'No Teacher Assigned',
                              ...teachers.map((t) => t.userName),
                            ];
                            const currentTeacherName =
                              teachers.find((t) => t.id === currentTeacherId)?.userName ||
                              'No Teacher Assigned';

                            const handleTeacherChange = (val: string) => {
                              const selectedTeacher = teachers.find((t) => t.userName === val);
                              setCourseTeacherMap((prev) => ({
                                ...prev,
                                [cid]: selectedTeacher ? selectedTeacher.id : '',
                              }));
                            };

                            return (
                              <View key={cid} className="flex-col gap-1 border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
                                <Text className="text-xs font-bold text-foreground">
                                  {course.code}
                                </Text>
                                <Dropdown
                                  value={currentTeacherName}
                                  onValueChange={handleTeacherChange}
                                  options={teacherOptions}
                                />
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
            <View className="flex-row gap-3 border-t border-border/50 bg-muted/5 p-5">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl active:scale-95"
                onPress={() => setModalOpen(false)}>
                <Text className="text-xs font-black uppercase tracking-widest text-foreground">
                  Cancel
                </Text>
              </Button>
              <Button
                className="h-12 flex-[2] rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
                onPress={handleSaveSemester}
                disabled={submitting}>
                <Text className="text-xs font-black uppercase tracking-widest text-primary-foreground">
                  {submitting ? 'Processing...' : 'Save'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={promotionModalOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 p-6">
          <View className="w-full max-w-sm rounded-[32px] border border-border bg-card p-6 shadow-2xl">
            <View className="mb-6 items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-sm shadow-primary/10">
                <ArrowUpCircle size={32} className="text-primary" />
              </View>
              <Text className="text-center text-xl font-black text-foreground">
                Batch Promotion
              </Text>
              <Text className="mt-2 px-2 text-center text-xs font-semibold leading-relaxed text-muted-foreground">
                Create a new academic session for the current roster. This will move all selected
                students to the target level.
              </Text>
            </View>
            <View className="mb-6 gap-4 rounded-[24px] border border-border/50 bg-muted/10 p-5">
              <View className="gap-1.5">
                <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Target Level
                </Label>
                <Dropdown
                  value={targetLevel}
                  onValueChange={(v: any) => setTargetLevel(v)}
                  options={LEVELS}
                />
              </View>
              <View className="gap-1.5">
                <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Target Term
                </Label>
                <Dropdown
                  value={targetSemester}
                  onValueChange={(v: any) => setTargetSemester(v)}
                  options={SEMESTERS}
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl active:scale-95"
                onPress={() => setPromotionModalOpen(false)}>
                <Text className="text-xs font-black uppercase tracking-widest text-foreground">
                  Cancel
                </Text>
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
                onPress={handlePromoteSession}
                disabled={submitting}>
                <Text className="text-xs font-black uppercase tracking-widest text-primary-foreground">
                  Confirm
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={datePickerOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 p-6"
          onPress={() => setDatePickerOpen(false)}>
          <View
            className="w-full max-w-sm rounded-[32px] border border-border bg-card p-6 shadow-2xl"
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}>
            <View className="mb-5 flex-row items-center justify-between border-b border-border/40 pb-3">
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Select {pickerTarget === 'start' ? 'Start' : 'End'} Date
              </Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-xl bg-muted/40"
                onPress={() => setDatePickerOpen(false)}>
                <X size={16} className="text-muted-foreground" />
              </Pressable>
            </View>

            <View className="mb-4 flex-row items-center justify-between px-1">
              <Text className="text-base font-black text-foreground">
                {
                  [
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
                  ][pickerMonth]
                }{' '}
                {pickerYear}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-lg border-border/60 bg-muted/20 p-0"
                  onPress={() => {
                    if (pickerMonth === 0) {
                      setPickerMonth(11);
                      setPickerYear((y) => y - 1);
                    } else setPickerMonth((m) => m - 1);
                  }}>
                  <Text className="text-base font-bold text-foreground">←</Text>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 rounded-lg border-border/60 bg-muted/20 p-0"
                  onPress={() => {
                    if (pickerMonth === 11) {
                      setPickerMonth(0);
                      setPickerYear((y) => y + 1);
                    } else setPickerMonth((m) => m + 1);
                  }}>
                  <Text className="text-base font-bold text-foreground">→</Text>
                </Button>
              </View>
            </View>

            <View className="mb-2 flex-row border-b border-border/30 pb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <View key={d} className="flex-1 items-center">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {d[0]}
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {(() => {
                const total = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                const startIdx = new Date(pickerYear, pickerMonth, 1).getDay();
                const cells = [];
                for (let i = 0; i < startIdx; i++)
                  cells.push(<View key={`e-${i}`} style={{ width: '14.28%' }} />);
                for (let d = 1; d <= total; d++) {
                  const curr = `${pickerYear}-${(pickerMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                  const isSel = (pickerTarget === 'start' ? startDateStr : endDateStr) === curr;
                  cells.push(
                    <Pressable
                      key={d}
                      style={{ width: '14.28%' }}
                      className={`h-10 items-center justify-center rounded-xl ${isSel ? 'bg-primary shadow-sm shadow-primary/20' : 'hover:bg-muted/30'}`}
                      onPress={() => {
                        if (pickerTarget === 'start') setStartDateStr(curr);
                        else setEndDateStr(curr);
                        setDatePickerOpen(false);
                      }}>
                      <Text
                        className={`text-xs font-black ${isSel ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {d}
                      </Text>
                    </Pressable>
                  );
                }
                return cells;
              })()}
            </View>
          </View>
        </Pressable>
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
