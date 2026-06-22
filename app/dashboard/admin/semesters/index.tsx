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
    } catch (e) {}
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
    } catch (e) {}
    setDatePickerOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [semRes, studRes, ciRes, cRes] = await Promise.all([
        adminService.getSemesters(),
        adminService.getStudents(),
        adminService.getCourseInfos(),
        adminService.getCourses(),
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
        courses: selectedCourseInfoIds,
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

  if (loading)
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View className="flex-1 bg-background">
      <View className={`flex-1 ${isMobile ? 'flex-col' : 'flex-row'}`}>
        <View
          className={`${isMobile ? 'w-full border-b' : 'w-80 border-r'} border-border bg-card/20`}>
          <View className="p-6">
            <View className="mb-6 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                  Academic Sessions
                </Text>
                <Text className="text-xl font-black text-foreground">Semesters</Text>
              </View>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 rounded-2xl border-primary/20 bg-primary/10 p-0"
                onPress={handleOpenAddModal}>
                <Plus size={20} className="text-primary" />
              </Button>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {semesters.map((sem) => (
                <Pressable
                  key={sem.id}
                  onPress={() => {
                    setActiveSemesterId(sem.id);
                    setRosterSearchQuery('');
                  }}
                  className={`mb-2 rounded-2xl border p-3 shadow-sm transition-all ${
                    activeSemesterId === sem.id
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-transparent bg-muted/20 hover:bg-muted/30'
                  }`}>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-sm font-bold ${
                        activeSemesterId === sem.id ? 'text-primary' : 'text-foreground'
                      }`}>
                      Level {getLevelNumber(sem.level)} Semester {sem.semester}
                    </Text>
                    {activeSemesterId === sem.id && (
                      <View className="h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary" />
                    )}
                  </View>
                  <View className="mt-2 flex-row gap-4 border-t border-border/30 pt-2">
                    <View className="flex-row items-center gap-2">
                      <Users size={14} className="text-muted-foreground" />
                      <Text className="text-[11px] font-bold text-foreground/80">
                        {sem.students?.length || 0}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <BookOpen size={14} className="text-muted-foreground" />
                      <Text className="text-[11px] font-bold text-foreground/80">
                        {sem.courses?.length || 0}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
 
        <View className="flex-1 bg-background/30">
          {activeSemester ? (
            <ScrollView className="flex-1" contentContainerStyle={{ padding: isMobile ? 16 : 32 }}>
              <View className="mb-8 flex-col gap-6 border-b border-border/40 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Calendar size={28} className="text-primary" />
                    </View>
                    <View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-2xl font-black tracking-tight text-foreground">
                          Level {getLevelNumber(activeSemester.level)} Semester {activeSemester.semester}
                        </Text>
                        <Badge
                          variant="outline"
                          className="h-7 rounded-full border-emerald-500/20 bg-emerald-500/10 px-4 py-1">
                          <Text className="text-xs font-black text-emerald-600">ACTIVE</Text>
                        </Badge>
                      </View>
                      <Text className="mt-1.5 text-sm font-semibold text-muted-foreground">
                        {formatDateArray(activeSemester.startDate)} —{' '}
                        {formatDateArray(activeSemester.endDate)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="h-11 flex-row gap-2 rounded-[20px] border-primary/20 bg-primary/5 px-5"
                    onPress={() => {
                      setTargetLevel(activeSemester.level);
                      setTargetSemester(activeSemester.semester === 'I' ? 'II' : 'I');
                      if (activeSemester.semester === 'II') {
                        const idx = LEVELS.indexOf(activeSemester.level) + 1;
                        if (idx < LEVELS.length) setTargetLevel(LEVELS[idx]);
                      }
                      setPromotionModalOpen(true);
                    }}>
                    <ArrowUpCircle size={18} className="text-primary" />
                    <Text className="text-xs font-black uppercase tracking-wider text-primary">
                      Promote Session
                    </Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 w-11 rounded-[20px] border-border/80 bg-card p-0"
                    onPress={() => handleOpenEditModal(activeSemester)}>
                    <Pencil size={20} className="text-foreground" />
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-11 w-11 rounded-[20px] p-0"
                    onPress={() => handleDeleteSemester(activeSemester.id)}>
                    <Trash2 size={20} className="text-destructive-foreground" />
                  </Button>
                </View>
              </View>

              <View className="mb-10 flex-col gap-5 sm:flex-row">
                <Card className="flex-1 flex-row items-center gap-5 rounded-[32px] border-border/60 bg-card p-6 shadow-sm">
                  <View className="h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                    <Users size={32} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
                      Enrolled Students
                    </Text>
                    <Text className="text-3xl font-black text-foreground">
                      {activeSemester.students?.length || 0}
                    </Text>
                  </View>
                </Card>
                <Card className="flex-1 flex-row items-center gap-5 rounded-[32px] border-border/60 bg-card p-6 shadow-sm">
                  <View className="h-14 w-14 items-center justify-center rounded-3xl bg-indigo-500/10">
                    <BookOpen size={32} className="text-indigo-600" />
                  </View>
                  <View>
                    <Text className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
                      Active Courses
                    </Text>
                    <Text className="text-3xl font-black text-foreground">
                      {activeSemester.courses?.length || 0}
                    </Text>
                  </View>
                </Card>
              </View>

              <View className={`flex-1 ${width >= 1280 ? 'flex-row' : 'flex-col'} gap-10`}>
                <View className="flex-1 gap-5">
                  <View className="flex-row items-center gap-3 border-b border-border/30 pb-4">
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
                      <BookOpen size={16} className="text-indigo-600" />
                    </View>
                    <Text className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                      Scheduled Courses
                    </Text>
                  </View>
                  <View className="gap-4">
                    {resolvedCourses.length === 0 ? (
                      <Card className="items-center rounded-[32px] border-dashed border-border/60 bg-transparent p-12">
                        <Text className="text-sm font-medium italic text-muted-foreground/60">
                          No courses assigned to this session.
                        </Text>
                      </Card>
                    ) : (
                      resolvedCourses.map(
                        (rc) =>
                          rc && (
                            <Card
                              key={rc.id}
                              className="group relative flex-row items-center justify-between overflow-hidden rounded-[28px] border-border/60 bg-card p-5 shadow-sm">
                              <View className="absolute bottom-0 left-0 top-0 w-1.5 bg-indigo-500/30" />
                              <View className="flex-1 pl-3">
                                <Text className="text-lg font-black leading-tight text-foreground">
                                  {rc.course.code}
                                </Text>
                                <Text
                                  className="mt-0.5 text-xs font-bold text-muted-foreground"
                                  numberOfLines={1}>
                                  {rc.course.title}
                                </Text>
                                <View className="mt-3 flex-row items-center gap-2">
                                  <View className="h-6 w-6 items-center justify-center rounded-full bg-muted/30">
                                    <Users size={12} className="text-muted-foreground" />
                                  </View>
                                  <Text className="text-[11px] font-bold text-muted-foreground">
                                    Instructor: {rc.teacher?.userName || 'No teacher assigned'}
                                  </Text>
                                </View>
                              </View>
                              <Badge
                                variant="secondary"
                                className="rounded-2xl border-indigo-500/10 bg-indigo-500/5 px-4 py-2">
                                <Text className="text-[11px] font-black text-indigo-700">
                                  {(rc.course.credits || '')
                                    .replace('CREDIT_', '')
                                    .replace('_', '.') || '3.0'}{' '}
                                  CR
                                </Text>
                              </Badge>
                            </Card>
                          )
                      )
                    )}
                  </View>
                </View>

                <View className="flex-1 gap-5">
                  <View className="flex-row items-center justify-between border-b border-border/30 pb-4">
                    <View className="flex-row items-center gap-3">
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                        <GraduationCap size={16} className="text-emerald-600" />
                      </View>
                      <Text className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                        Student Roster ({resolvedStudents.length})
                      </Text>
                    </View>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl border-emerald-500/20 bg-emerald-500/5 px-4"
                      onPress={() => handleOpenEditModal(activeSemester)}>
                      <UserPlus size={16} className="mr-2 text-emerald-600" />
                      <Text className="text-[11px] font-black uppercase text-emerald-600">
                        Enroll
                      </Text>
                    </Button>
                  </View>
                  <View className="relative mb-2">
                    <Search
                      size={18}
                      className="absolute left-4 top-3.5 z-10 text-muted-foreground/60"
                    />
                    <Input
                      placeholder="Search roster by name or ID..."
                      value={rosterSearchQuery}
                      onChangeText={setRosterSearchQuery}
                      className="h-12 rounded-2xl border-transparent bg-muted/30 pl-12 pr-5 text-sm font-bold text-foreground"
                    />
                  </View>
                  <View className="gap-3.5">
                    {resolvedStudents.length === 0 ? (
                      <Card className="items-center rounded-[32px] border-dashed border-border/60 bg-transparent p-12">
                        <Text className="text-sm font-medium italic text-muted-foreground/60">
                          {rosterSearchQuery
                            ? 'No students match your search.'
                            : 'No students enrolled in this session.'}
                        </Text>
                      </Card>
                    ) : (
                      resolvedStudents.map((s) => (
                        <Card
                          key={s.id}
                          className="relative flex-row items-center gap-4 overflow-hidden rounded-[28px] border-border/60 bg-card p-5 shadow-sm">
                          <View className="absolute bottom-0 left-0 top-0 w-1.5 bg-emerald-500/30" />
                          <View className="flex-1 pl-3">
                            <Text className="text-base font-black leading-tight text-foreground">
                              {s.userName}
                            </Text>
                            <View className="mt-1.5 flex-row items-center gap-3">
                              <Badge className="rounded-lg border-0 bg-muted/40 px-2.5 py-0.5">
                                <Text className="text-[10px] font-black text-muted-foreground">
                                  ID: {s.studentId}
                                </Text>
                              </Badge>
                              <Text className="text-xs font-bold text-muted-foreground">
                                {s.email}
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            className="h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 active:scale-95 active:bg-destructive/20"
                            onPress={() => handleRemoveStudentFromSemester(s.id)}>
                            <UserMinus size={20} className="text-destructive" />
                          </Pressable>
                        </Card>
                      ))
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center bg-background/50 p-12">
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-[40px] bg-muted/20">
                <GraduationCap size={48} className="text-muted-foreground/30" />
              </View>
              <Text className="text-xl font-black text-foreground">Select an Academic Session</Text>
              <Text className="mt-2 max-w-xs text-center text-sm font-medium leading-relaxed text-muted-foreground">
                Choose a level and semester from the sidebar to manage scheduled courses and student
                enrollment.
              </Text>
            </View>
          )}
        </View>
      </View>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/60 p-4">
          <View className="w-full max-w-5xl overflow-hidden rounded-[40px] border border-border bg-card shadow-2xl">
            <View className="flex-row items-center justify-between border-b border-border/50 bg-muted/5 p-6">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                  Semester Management
                </Text>
                <Text className="text-2xl font-black text-foreground">
                  {editingSemester ? 'Edit Academic Session' : 'Create New Session'}
                </Text>
              </View>
              <Pressable
                className="h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 active:scale-90"
                onPress={() => setModalOpen(false)}>
                <X size={24} className="text-muted-foreground" />
              </Pressable>
            </View>
            <ScrollView className="max-h-[85vh] p-8">
              <View className={`flex-col ${width >= 768 ? 'flex-row gap-10' : 'gap-8'}`}>
                <View className={`gap-6 ${width >= 768 ? 'w-72' : ''}`}>
                  <View className="rounded-[32px] border border-border/60 bg-muted/10 p-6">
                    <Text className="mb-5 text-[11px] font-black uppercase tracking-widest text-primary">
                      Basic Configuration
                    </Text>

                    <View className="mb-5 flex-row gap-4">
                      <View className="flex-1 gap-2">
                        <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          Level
                        </Label>
                        <Dropdown value={level} onValueChange={setLevel} options={LEVELS} />
                      </View>
                      <View className="flex-1 gap-2">
                        <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          Term
                        </Label>
                        <Dropdown
                          value={semester}
                          onValueChange={setSemester}
                          options={SEMESTERS}
                        />
                      </View>
                    </View>

                    <View className="mb-5 gap-2">
                      <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        Start Date
                      </Label>
                      <Pressable
                        onPress={handleOpenStartDatePicker}
                        className="relative justify-center">
                        <Input
                          value={startDateStr}
                          editable={false}
                          className="h-12 rounded-2xl border-border bg-background pr-12 text-sm font-bold text-foreground"
                        />
                        <Calendar size={18} className="absolute right-4 text-muted-foreground/60" />
                      </Pressable>
                    </View>

                    <View className="gap-2">
                      <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        End Date
                      </Label>
                      <Pressable
                        onPress={handleOpenEndDatePicker}
                        className="relative justify-center">
                        <Input
                          value={endDateStr}
                          editable={false}
                          className="h-12 rounded-2xl border-border bg-background pr-12 text-sm font-bold text-foreground"
                        />
                        <Calendar size={18} className="absolute right-4 text-muted-foreground/60" />
                      </Pressable>
                    </View>
                  </View>
                  {error ? (
                    <Text className="rounded-2xl bg-destructive/10 px-2 py-3 text-center text-xs font-black text-destructive">
                      {error}
                    </Text>
                  ) : null}
                </View>

                <View className={`flex-1 gap-8 ${width >= 1024 ? 'flex-row' : 'flex-col'}`}>
                  <View className="flex-1 gap-3">
                    <View className="mb-1 flex-row items-center justify-between px-2">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        Student Roster
                      </Text>
                      <Badge className="bg-primary/10 px-3 py-1">
                        <Text className="text-[10px] font-black text-primary">
                          {selectedStudentIds.length} Selected
                        </Text>
                      </Badge>
                    </View>
                    <StudentSelector
                      students={students}
                      selectedIds={selectedStudentIds}
                      onToggle={toggleStudentSelection}
                      maxHeight={width >= 768 ? 320 : 200}
                    />
                  </View>
                  <View className="flex-1 gap-3">
                    <View className="mb-1 flex-row items-center justify-between px-2">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        Assigned Courses
                      </Text>
                      <Badge className="bg-indigo-500/10 px-3 py-1">
                        <Text className="text-[10px] font-black text-indigo-600">
                          {selectedCourseInfoIds.length} Selected
                        </Text>
                      </Badge>
                    </View>
                    <CourseSelector
                      courses={courses}
                      selectedIds={selectedCourseInfoIds}
                      onToggle={toggleCourseSelection}
                      maxHeight={width >= 768 ? 320 : 200}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
            <View className="flex-row gap-4 border-t border-border/50 bg-muted/5 p-6">
              <Button
                variant="outline"
                className="h-14 flex-1 rounded-[24px] active:scale-95"
                onPress={() => setModalOpen(false)}>
                <Text className="text-sm font-black uppercase tracking-[0.15em] text-foreground">
                  Cancel
                </Text>
              </Button>
              <Button
                className="h-14 flex-[2] rounded-[24px] shadow-xl shadow-primary/20 transition-transform active:scale-95"
                onPress={handleSaveSemester}
                disabled={submitting}>
                <Text className="text-sm font-black uppercase tracking-[0.15em] text-primary-foreground">
                  {submitting
                    ? 'Processing...'
                    : editingSemester
                      ? 'Update Academic Session'
                      : 'Save New Session'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={promotionModalOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 p-6">
          <View className="w-full max-w-md rounded-[40px] border border-border bg-card p-10 shadow-2xl">
            <View className="mb-8 items-center">
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-[32px] bg-primary/10 shadow-sm shadow-primary/10">
                <ArrowUpCircle size={40} className="text-primary" />
              </View>
              <Text className="text-center text-2xl font-black text-foreground">
                Batch Promotion
              </Text>
              <Text className="mt-3 px-4 text-center text-sm font-semibold leading-relaxed text-muted-foreground">
                Create a new academic session for the current roster. This will move all selected
                students to the target level.
              </Text>
            </View>
            <View className="mb-10 gap-6 rounded-[32px] border border-border/50 bg-muted/10 p-6">
              <View className="gap-2">
                <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  Target Level
                </Label>
                <Dropdown
                  value={targetLevel}
                  onValueChange={(v: any) => setTargetLevel(v)}
                  options={LEVELS}
                />
              </View>
              <View className="gap-2">
                <Label className="ml-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  Target Term
                </Label>
                <Dropdown
                  value={targetSemester}
                  onValueChange={(v: any) => setTargetSemester(v)}
                  options={SEMESTERS}
                />
              </View>
            </View>
            <View className="flex-row gap-4">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl active:scale-95"
                onPress={() => setPromotionModalOpen(false)}>
                <Text className="text-sm font-black uppercase tracking-widest text-foreground">
                  Cancel
                </Text>
              </Button>
              <Button
                className="h-12 flex-1 rounded-2xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
                onPress={handlePromoteSession}
                disabled={submitting}>
                <Text className="text-sm font-black uppercase tracking-widest text-primary-foreground">
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
            className="w-full max-w-sm rounded-[40px] border border-border bg-card p-8 shadow-2xl"
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}>
            <View className="mb-6 flex-row items-center justify-between border-b border-border/40 pb-4">
              <Text className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Select {pickerTarget === 'start' ? 'Start' : 'End'} Date
              </Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-xl bg-muted/40"
                onPress={() => setDatePickerOpen(false)}>
                <X size={16} className="text-muted-foreground" />
              </Pressable>
            </View>

            <View className="mb-6 flex-row items-center justify-between px-2">
              <Text className="text-lg font-black text-foreground">
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
                  className="h-9 w-9 rounded-xl border-border/60 bg-muted/20 p-0"
                  onPress={() => {
                    if (pickerMonth === 0) {
                      setPickerMonth(11);
                      setPickerYear((y) => y - 1);
                    } else setPickerMonth((m) => m - 1);
                  }}>
                  <Text className="text-lg font-bold text-foreground">←</Text>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 rounded-xl border-border/60 bg-muted/20 p-0"
                  onPress={() => {
                    if (pickerMonth === 11) {
                      setPickerMonth(0);
                      setPickerYear((y) => y + 1);
                    } else setPickerMonth((m) => m + 1);
                  }}>
                  <Text className="text-lg font-bold text-foreground">→</Text>
                </Button>
              </View>
            </View>

            <View className="mb-3 flex-row border-b border-border/30 pb-2">
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
                      className={`h-11 items-center justify-center rounded-2xl ${isSel ? 'bg-primary shadow-md shadow-primary/20' : 'hover:bg-muted/30'}`}
                      onPress={() => {
                        if (pickerTarget === 'start') setStartDateStr(curr);
                        else setEndDateStr(curr);
                        setDatePickerOpen(false);
                      }}>
                      <Text
                        className={`text-sm font-black ${isSel ? 'text-primary-foreground' : 'text-foreground'}`}>
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
