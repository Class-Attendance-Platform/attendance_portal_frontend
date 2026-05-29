import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { FlatList, View, useWindowDimensions, ActivityIndicator, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Search, Plus, Trash2, X, Calendar, BookOpen, Users, Pencil, GraduationCap, ChevronRight, UserPlus, UserMinus, ArrowUpCircle } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Semester } from '@/types/semester';
import { Student } from '@/types/student';
import { CourseInfo } from '@/types/course';
import { LEVELS, SEMESTERS, Level, SemesterName, formatDateArray, parseDateString } from '@/types/common';
import { StudentSelector } from '@/components/custom/student-selector';
import { CourseSelector } from '@/components/custom/course-selector';

export default function SemestersScreen() {
  const { width } = useWindowDimensions();

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

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const semRes = await api.get('/api/admin/semesters');
      const studRes = await api.get('/api/admin/students');
      const teachRes = await api.get('/api/admin/teachers');

      if (semRes.success) {
        setSemesters(semRes.semesters || []);
        if (semRes.semesters && semRes.semesters.length > 0) {
          setActiveSemesterId(prev => {
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
            const tCoursesRes = await api.get(`/api/teacher/${t.id}/courses`);
            if (tCoursesRes.success) {
              const currentList = tCoursesRes.currentCourses || [];
              const prevList = tCoursesRes.previousCourses || [];
              [...currentList, ...prevList].forEach(c => {
                if (!ciList.some(item => item.id === c.id)) {
                  ciList.push({
                    id: c.id,
                    course: {
                      id: c.course.id,
                      code: c.course.code,
                      title: c.course.title,
                      content: c.course.content || '',
                      credits: c.course.credits,
                      faculty: c.course.faculty || '',
                      department: c.course.department || ''
                    },
                    teacher: { userName: t.userName, id: t.id },
                    attendance: c.attendance,
                    students: c.students || []
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

  const activeSemester = useMemo(() => {
    return semesters.find(s => s.id === activeSemesterId);
  }, [semesters, activeSemesterId]);

  // Resolve courses in semester
  const resolvedCourses = useMemo(() => {
    if (!activeSemester) return [];
    return (activeSemester.courses || []).map(ciId => {
      return courseInfos.find(ci => ci.id === ciId);
    }).filter(Boolean);
  }, [activeSemester, courseInfos]);

  // Resolve students in semester with search filter
  const resolvedStudents = useMemo(() => {
    if (!activeSemester) return [];
    return (activeSemester.students || []).map(sid => {
      return students.find(s => s.id === sid);
    }).filter((s): s is Student => !!s).filter(s => {
      if (!rosterSearchQuery) return true;
      return s.userName.toLowerCase().includes(rosterSearchQuery.toLowerCase()) ||
             (s.studentId && s.studentId.toString().includes(rosterSearchQuery)) ||
             s.email.toLowerCase().includes(rosterSearchQuery.toLowerCase());
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
                if (activeSemesterId === id) {
                  setActiveSemesterId('');
                }
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
              const updatedStudents = activeSemester.students.filter(id => id !== studentId);
              const res = await api.put(`/api/admin/semesters/${activeSemester.id}`, {
                students: updatedStudents
              });
              if (res.success) {
                fetchData();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove student');
            }
          }
        }
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
        courses: [] // Courses should be selected for new semester
      };

      const res = await api.post('/api/admin/semesters', body);
      if (res.success) {
        setPromotionModalOpen(false);
        fetchData();
        Alert.alert('Success', `Students promoted to Level ${targetLevel} Semester ${targetSemester}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to promote session');
    } finally {
      setSubmitting(false);
    }
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
    <View className="flex-1 bg-background">
      <View className="flex-1 flex-col md:flex-row">
        
        {/* Sidebar: Semester Selection */}
        <View className="w-full border-b border-border bg-card md:w-80 md:border-b-0 md:border-r">
          <View className="p-4 flex-1">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Semester Sessions
              </Text>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl px-2.5 bg-primary/10 border-primary/20 flex-row gap-1"
                onPress={handleOpenAddModal}
              >
                <Plus size={12} className="text-primary" />
                <Text className="text-[10px] font-bold text-primary">Add New</Text>
              </Button>
            </View>

            {semesters.length === 0 ? (
              <Text className="text-xs text-muted-foreground italic mt-4 px-2">No semesters configured.</Text>
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
                      className={`rounded-2xl px-4 py-3 mb-2.5 w-full border ${
                        isSelected
                          ? 'bg-primary/10 border-primary/20'
                          : 'bg-muted/10 border-transparent hover:bg-muted/20'
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-sm font-extrabold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          Level {sem.level} • Semester {sem.semester}
                        </Text>
                        {isSelected && (
                          <View className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </View>
                      
                      <Text className="text-[10px] text-muted-foreground mt-1 flex-row items-center gap-1">
                        {start} - {end}
                      </Text>

                      <View className="flex-row gap-3 mt-2 border-t border-border/40 pt-2">
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
        <View className="flex-1 bg-background/30 min-w-0">
          {activeSemester ? (
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              
              {/* Header with Title and Control Buttons */}
              <View className="flex-col gap-4 border-b border-border/45 pb-5 sm:flex-row sm:items-center sm:justify-between mb-6">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-black tracking-tight text-foreground">
                      Level {activeSemester.level} Semester {activeSemester.semester}
                    </Text>
                    <View className="bg-primary/10 rounded-full px-2.5 py-0.5">
                      <Text className="text-[10px] font-bold text-primary">Active Session</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground mt-1.5 flex-row items-center gap-1">
                    <Calendar size={12} className="text-muted-foreground" />
                    Session Dates: {Array.isArray(activeSemester.startDate) ? activeSemester.startDate.join('/') : activeSemester.startDate} to {Array.isArray(activeSemester.endDate) ? activeSemester.endDate.join('/') : activeSemester.endDate}
                  </Text>
                </View>

                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl px-4 flex-row gap-1.5 border-primary/20 bg-primary/5 active:scale-95 transition-transform"
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
                    }}
                  >
                    <ArrowUpCircle size={14} className="text-primary" />
                    <Text className="font-bold text-xs text-primary">Promote Session</Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl px-4 flex-row gap-1.5 border-border/80 bg-card active:scale-95 transition-transform"
                    onPress={() => handleOpenEditModal(activeSemester)}
                  >
                    <Pencil size={14} className="text-foreground" />
                    <Text className="font-bold text-xs text-foreground">Edit Config</Text>
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-10 rounded-xl px-4 flex-row gap-1.5 active:scale-95 transition-transform"
                    onPress={() => handleDeleteSemester(activeSemester.id)}
                  >
                    <Trash2 size={14} className="text-destructive-foreground" />
                    <Text className="font-bold text-xs text-destructive-foreground">Delete</Text>
                  </Button>
                </View>
              </View>

              {/* Stat Cards Row */}
              <View className="flex-col sm:flex-row gap-4 mb-6">
                <Card className="flex-1 rounded-3xl border border-border/80 p-4 bg-card shadow-sm flex-row items-center gap-3.5">
                  <View className="h-11 w-11 rounded-2xl bg-primary/10 items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Enrolled Students</Text>
                    <Text className="text-lg font-black text-foreground">{activeSemester.students ? activeSemester.students.length : 0} Enrolled</Text>
                  </View>
                </Card>

                <Card className="flex-1 rounded-3xl border border-border/80 p-4 bg-card shadow-sm flex-row items-center gap-3.5">
                  <View className="h-11 w-11 rounded-2xl bg-primary/10 items-center justify-center">
                    <BookOpen size={20} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Courses</Text>
                    <Text className="text-lg font-black text-foreground">{activeSemester.courses ? activeSemester.courses.length : 0} Courses</Text>
                  </View>
                </Card>
              </View>

              {/* Split Workspace Sections */}
              <View className="flex-col lg:flex-row gap-6">
                
                {/* Left pane: Active Courses List */}
                <View className="flex-1 gap-4">
                  <View className="flex-row items-center gap-2 border-b border-border/40 pb-2">
                    <BookOpen size={16} className="text-muted-foreground" />
                    <Text className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                      Active Courses
                    </Text>
                  </View>
                  
                  {resolvedCourses.length === 0 ? (
                    <Card className="rounded-3xl border border-border/85 p-6 bg-card justify-center items-center">
                      <Text className="text-xs text-muted-foreground italic">No courses scheduled for this session.</Text>
                    </Card>
                  ) : (
                    resolvedCourses.map((rc, idx) => rc && (
                      <Card key={rc.id} className="rounded-3xl border border-border/80 p-4 bg-card shadow-sm flex-row items-center justify-between relative overflow-hidden">
                        {/* Course visual accent line */}
                        <View className="absolute left-0 top-0 bottom-0 w-1 bg-primary/30" />
                        
                        <View className="flex-1 pr-4 pl-2">
                          <Text className="text-sm font-extrabold text-foreground">
                            {rc.course.code}
                          </Text>
                          <Text className="text-xs font-semibold text-foreground/80 mt-0.5" numberOfLines={1}>
                            {rc.course.title}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground mt-1.5">
                            Instructor: {rc.teacher.userName}
                          </Text>
                        </View>
                        
                        <View className="bg-secondary px-3 py-1 rounded-full border border-border/80 flex-none">
                          <Text className="text-[10px] font-bold text-foreground">
                            {rc.course.credits ? rc.course.credits.replace('CREDIT_', '').replace('_', '.') : '2.00'} CR
                          </Text>
                        </View>
                      </Card>
                    ))
                  )}
                </View>

                {/* Right pane: Student Roster List with search filter */}
                <View className="flex-1 gap-4">
                  <View className="flex-col gap-3 border-b border-border/40 pb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <GraduationCap size={18} className="text-muted-foreground" />
                        <Text className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                          Roster ({resolvedStudents.length})
                        </Text>
                      </View>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl px-2.5 bg-emerald-500/10 border-emerald-500/20 flex-row gap-1"
                        onPress={() => handleOpenEditModal(activeSemester)}
                      >
                        <UserPlus size={12} className="text-emerald-600" />
                        <Text className="text-[10px] font-bold text-emerald-600">Add Student</Text>
                      </Button>
                    </View>
                    
                    {/* Search bar */}
                    <View className="flex-row items-center bg-muted/40 border border-border/70 rounded-xl px-2.5 py-1.5 flex-1 max-w-[200px]">
                      <Search size={12} className="text-muted-foreground mr-1.5" />
                      <Input
                        placeholder="Search roster..."
                        value={rosterSearchQuery}
                        onChangeText={setRosterSearchQuery}
                        className="text-[10px] font-semibold text-foreground p-0 h-4 border-0 bg-transparent flex-1"
                      />
                    </View>
                  </View>

                  {resolvedStudents.length === 0 ? (
                    <Card className="rounded-3xl border border-border/85 p-6 bg-card justify-center items-center">
                      <Text className="text-xs text-muted-foreground italic">No students matching search.</Text>
                    </Card>
                  ) : (
                    <View className="gap-2 max-h-[420px] overflow-y-auto pr-1">
                      {resolvedStudents.map((stud) => (
                        <Card key={stud.id} className="rounded-2xl border border-border/80 p-3 bg-card shadow-sm flex-row items-center justify-between relative overflow-hidden">
                          {/* Student visual accent line */}
                          <View className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/20" />
                          
                          <View className="flex-row items-center flex-1 pl-2">
                            <View className="flex-1">
                              <Text className="text-xs font-bold text-foreground">
                                {stud.userName}
                              </Text>
                              <Text className="text-[10px] text-muted-foreground/80 mt-0.5">
                                ID: {stud.studentId} • {stud.email}
                              </Text>
                            </View>
                            
                            <View className="bg-primary/5 rounded-full px-2.5 py-0.5 border border-primary/10 mr-2">
                              <Text className="text-[9px] font-bold text-primary">
                                {stud.department ? stud.department.split('_').map(w => w[0]).join('') : 'N/A'}
                              </Text>
                            </View>

                            <Pressable 
                              onPress={() => handleRemoveStudentFromSemester(stud.id)}
                              className="h-8 w-8 rounded-full items-center justify-center bg-destructive/10 active:bg-destructive/20"
                            >
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
            <View className="flex-1 items-center justify-center p-8 bg-card border border-dashed border-border rounded-3xl min-h-[400px]">
              <GraduationCap size={48} className="text-muted-foreground/35 mb-3" />
              <Text className="text-center text-lg font-bold text-foreground">
                No Academic Session Selected
              </Text>
              <Text className="text-center text-xs text-muted-foreground mt-1 max-w-[280px] leading-normal">
                Select a level and semester configuration from the sidebar list on the left to view scheduled courses, student roster list, and session details.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Form Modal for Add/Edit Semester */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-xl max-h-[85%]">
            <View className="flex-row items-center justify-between border-b border-border/50 pb-3.5 mb-4">
              <Text className="text-lg font-extrabold text-foreground">{editingSemester ? 'Edit Semester Session' : 'Create Semester Session'}</Text>
              <Pressable onPress={() => setModalOpen(false)} className="h-7 w-7 rounded-full bg-muted/30 items-center justify-center active:scale-90">
                <X size={15} className="text-muted-foreground" />
              </Pressable>
            </View>

            <ScrollView className="gap-4 pr-1" showsVerticalScrollIndicator={false}>
              
              <View className="flex-row gap-3.5 mb-2.5">
                <View className="flex-1 gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Level</Label>
                  <Dropdown
                    value={level}
                    onValueChange={setLevel}
                    options={LEVELS}
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">Semester</Label>
                  <Dropdown
                    value={semester}
                    onValueChange={setSemester}
                    options={SEMESTERS}
                  />
                </View>
              </View>

              <View className="gap-1.5 mb-2.5">
                <Label htmlFor="startDate" className="text-xs font-bold text-muted-foreground">Start Date</Label>
                <Input
                  id="startDate"
                  placeholder="YYYY-MM-DD"
                  value={startDateStr}
                  onChangeText={setStartDateStr}
                  className="rounded-xl h-11 border-border/80 focus:border-primary"
                />
              </View>

              <View className="gap-1.5 mb-3.5">
                <Label htmlFor="endDate" className="text-xs font-bold text-muted-foreground">End Date</Label>
                <Input
                  id="endDate"
                  placeholder="YYYY-MM-DD"
                  value={endDateStr}
                  onChangeText={setEndDateStr}
                  className="rounded-xl h-11 border-border/80 focus:border-primary"
                />
              </View>

              <View className="gap-1.5 mb-3">
                <Label className="text-xs font-bold text-muted-foreground">Select Enrolled Students</Label>
                <StudentSelector
                  students={students}
                  selectedIds={selectedStudentIds}
                  onToggle={toggleStudentSelection}
                  maxHeight={160}
                />
              </View>

              <View className="gap-1.5 mb-4">
                <Label className="text-xs font-bold text-muted-foreground">Select Semester Courses</Label>
                <CourseSelector
                  courseInfos={courseInfos}
                  selectedIds={selectedCourseInfoIds}
                  onToggle={toggleCourseSelection}
                  maxHeight={160}
                />
              </View>

              <Button
                className="w-full mb-4 rounded-xl h-11 active:scale-95 transition-transform"
                onPress={handleSaveSemester}
                disabled={submitting}>
                <Text className="font-bold text-sm text-primary-foreground">{submitting ? 'Saving...' : (editingSemester ? 'Save Changes' : 'Create Semester')}</Text>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Promotion Modal */}
      <Modal visible={promotionModalOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-xl">
            <View className="items-center mb-6">
              <View className="h-14 w-14 rounded-full bg-primary/10 items-center justify-center mb-4">
                <ArrowUpCircle size={32} className="text-primary" />
              </View>
              <Text className="text-lg font-black text-foreground text-center">Promote Session</Text>
              <Text className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
                This will create a new academic session with the current roster. You can then assign new courses to this session.
              </Text>
            </View>

            <View className="gap-4 mb-6">
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
                className="flex-1 rounded-xl h-11"
                onPress={() => setPromotionModalOpen(false)}
              >
                <Text className="font-bold text-sm text-foreground">Cancel</Text>
              </Button>
              <Button
                className="flex-1 rounded-xl h-11 active:scale-95 transition-transform"
                onPress={handlePromoteSession}
                disabled={submitting}
              >
                <Text className="font-bold text-sm text-primary-foreground">
                  {submitting ? 'Processing...' : 'Promote Now'}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}