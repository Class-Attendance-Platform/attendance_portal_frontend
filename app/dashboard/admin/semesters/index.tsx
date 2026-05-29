import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { FlatList, View, useWindowDimensions, ActivityIndicator, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Search, Plus, Trash2, X, Calendar, BookOpen, Users, Pencil, GraduationCap } from 'lucide-react-native';

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

const LEVELS = ['First', 'Second', 'Third', 'Fourth'];
const SEMESTERS = ['I', 'II'];

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
        if (semRes.semesters && semRes.semesters.length > 0) {
          setActiveSemesterId(prev => prev || semRes.semesters[0].id);
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
                // Clear active selection if deleted
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
    <View className="flex-1 bg-background md:pr-0 lg:pr-0">
      <View className="flex-1 flex-col md:flex-row lg:flex-row">
        
        {/* Sidebar: Semester Selection */}
        <View className="w-full border-b border-border bg-card p-4 md:w-80 md:border-b-0 md:border-r">
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
                const start = Array.isArray(sem.startDate) ? sem.startDate.join('/') : sem.startDate;
                const end = Array.isArray(sem.endDate) ? sem.endDate.join('/') : sem.endDate;
                
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

        {/* Right Workspace: Selected Semester Details */}
        <View className="flex-1 bg-background/30 p-6">
          {activeSemester ? (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              
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
                    <Text className="font-bold text-xs text-destructive-foreground">Delete Session</Text>
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
                  <View className="flex-row items-center justify-between border-b border-border/40 pb-2">
                    <View className="flex-row items-center gap-2">
                      <GraduationCap size={18} className="text-muted-foreground" />
                      <Text className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                        Roster ({resolvedStudents.length})
                      </Text>
                    </View>
                    
                    {/* Search bar */}
                    <View className="flex-row items-center bg-muted/40 border border-border/70 rounded-xl px-2.5 py-1.5 w-44">
                      <Search size={12} className="text-muted-foreground mr-1.5" />
                      <Input
                        placeholder="Search student..."
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
                          
                          <View className="pl-2">
                            <Text className="text-xs font-bold text-foreground">
                              {stud.userName}
                            </Text>
                            <Text className="text-[10px] text-muted-foreground/80 mt-0.5">
                              ID: {stud.studentId} • {stud.email}
                            </Text>
                          </View>
                          
                          <View className="bg-primary/5 rounded-full px-2.5 py-0.5 border border-primary/10">
                            <Text className="text-[9px] font-bold text-primary">
                              {stud.department ? stud.department.split('_').map(w => w[0]).join('') : 'N/A'}
                            </Text>
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
                <Label className="text-xs font-bold text-muted-foreground">Select Enrolled Students ({selectedStudentIds.length})</Label>
                <View className="h-32 border border-border rounded-2xl p-2 bg-muted/10">
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {students.map(s => (
                      <Pressable
                        key={s.id}
                        onPress={() => toggleStudentSelection(s.id)}
                        className={`p-2 rounded-xl mb-1.5 flex-row justify-between items-center ${
                          selectedStudentIds.includes(s.id) ? 'bg-primary/10 border border-primary/25' : 'bg-card border border-transparent'
                        }`}
                      >
                        <Text className="text-xs font-bold text-foreground">
                          {s.studentId} - {s.userName}
                        </Text>
                        {selectedStudentIds.includes(s.id) && <Text className="text-primary text-[10px] font-black">Selected</Text>}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View className="gap-1.5 mb-4">
                <Label className="text-xs font-bold text-muted-foreground">Select Semester Courses ({selectedCourseInfoIds.length})</Label>
                <View className="h-32 border border-border rounded-2xl p-2 bg-muted/10">
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {courseInfos.map(ci => (
                      <Pressable
                        key={ci.id}
                        onPress={() => toggleCourseSelection(ci.id)}
                        className={`p-2 rounded-xl mb-1.5 flex-row justify-between items-center ${
                          selectedCourseInfoIds.includes(ci.id) ? 'bg-primary/10 border border-primary/25' : 'bg-card border border-transparent'
                        }`}
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-xs font-extrabold text-foreground">
                            {ci.course.code}
                          </Text>
                          <Text className="text-[10px] text-muted-foreground line-clamp-1" numberOfLines={1}>
                            {ci.course.title} ({ci.teacher.userName})
                          </Text>
                        </View>
                        {selectedCourseInfoIds.includes(ci.id) && <Text className="text-primary text-[10px] font-black flex-none">Selected</Text>}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
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
    </View>
  );
}