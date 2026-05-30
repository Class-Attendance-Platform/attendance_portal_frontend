import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View, Modal, Image, Linking, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/AuthContext';
import { api, API_BASE } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { BookOpen, Check, X, QrCode, FileText, Save, Plus, Minus, RefreshCw, Clock, Calendar, Trash2, Edit, CheckSquare, Square, ChevronRight, ArrowLeft, Search } from 'lucide-react-native';
import TopPanel from '@/components/custom/toppanel';

import { StudentRow } from '@/types/student';
import { CourseInfo, TeacherCourseListItem } from '@/types/course';

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState<TeacherCourseListItem[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected date log detail state
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Calendar state (defaults to May 2026, the seeder month)
  const [currentMonth, setCurrentMonth] = useState(4); // May
  const [currentYear, setCurrentYear] = useState(2026);

  // Live session state
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(300);
  const [sessionSubmissions, setSessionSubmissions] = useState<Array<{ studentId: number; userName: string }>>([]);
  const [sessionRunning, setSessionRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCoursesList = async (selectFirst = true) => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/teacher/${user.id}/courses`);
      if (res.success) {
        const list = [...(res.currentCourses || []), ...(res.previousCourses || [])];
        setCourses(list);
        if (selectFirst && list.length > 0) {
          setActiveCourseId(list[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch courses list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (id: string) => {
    if (!id) return;
    setDetailsLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/teacher/course-info/${id}`);
      if (res.success) {
        const ci: CourseInfo = res.courseInfo;
        const total = ci.attendance.totalClasses;
        ci.students = (ci.students || []).map(s => {
          const count = ci.attendance.attendanceMap[s.studentId] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return {
            ...s,
            attendanceCount: count,
            percentage: parseFloat(pct.toFixed(2))
          };
        });
        setCourseInfo(ci);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch course details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesList();
  }, [user]);

  useEffect(() => {
    if (activeCourseId) {
      fetchCourseDetails(activeCourseId);
      setSelectedHistoryDate(null);
      setSearchQuery('');
    }
  }, [activeCourseId]);

  // Toggle present/absent state directly inside the date sheet panel
  const handleTogglePresenceOnDate = async (studentId: number) => {
    if (!selectedHistoryDate || !activeCourseId || !courseInfo) return;
    const session = (courseInfo.attendance.history || []).find(h => h.date === selectedHistoryDate);
    if (!session) return;

    let newPresentIds = [...(session.presentStudents || [])];
    if (newPresentIds.includes(studentId)) {
      newPresentIds = newPresentIds.filter(id => id !== studentId);
    } else {
      newPresentIds.push(studentId);
    }

    try {
      const res = await api.post(`/api/teacher/course-info/${activeCourseId}/history-session`, {
        date: selectedHistoryDate,
        presentStudentIds: newPresentIds
      });
      if (res.success) {
        fetchCourseDetails(activeCourseId);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update student attendance status.');
    }
  };

  const handleDeleteHistorySession = (date: string) => {
    Alert.alert(
      'Delete Class Attendance',
      `Are you sure you want to delete all attendance records for date ${date}? This will update the student attendance counts accordingly.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!activeCourseId) return;
            try {
              const res = await api.delete(`/api/teacher/course-info/${activeCourseId}/history-session/${date}`);
              if (res.success) {
                if (selectedHistoryDate === date) {
                  setSelectedHistoryDate(null);
                }
                fetchCourseDetails(activeCourseId);
              }
            } catch (err: any) {
              setError(err.message || 'Failed to delete class session.');
            }
          }
        }
      ]
    );
  };
  const startAttendanceSession = async () => {
    if (!activeCourseId) return;
    setError('');
    try {
      const durationMs = 300000;
      const res = await api.post(`/api/teacher/course-info/${activeCourseId}/session/start`, { duration: durationMs });
      if (res.success && res.session) {
        const secondsLeft = Math.ceil(res.session.timeLeft / 1000);
        setSessionTimeLeft(secondsLeft);
        setSessionModalOpen(true);
        setSessionRunning(true);
        setSessionSubmissions([]);
        startSessionTimers(secondsLeft);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start attendance session.');
    }
  };

  const startSessionTimers = (initSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);

    let secs = initSeconds;
    timerRef.current = setInterval(() => {
      secs--;
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          stopSessionTimers();
          setSessionRunning(false);
          finalizeSessionOnServer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollSessionStatus();
    pollRef.current = setInterval(pollSessionStatus, 2000);
  };

  const stopSessionTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const pollSessionStatus = async () => {
    if (!activeCourseId) return;
    try {
      const res = await api.get(`/api/teacher/course-info/${activeCourseId}/session/status`);
      if (res.success) {
        if (res.active) {
          setSessionSubmissions(res.session.submissions || []);
        } else {
          stopSessionTimers();
          setSessionRunning(false);
          fetchCourseDetails(activeCourseId);
        }
      }
    } catch (e) {
      console.error("Error polling session status:", e);
    }
  };

  const finalizeSessionOnServer = async () => {
    if (!activeCourseId) return;
    try {
      await api.post(`/api/teacher/course-info/${activeCourseId}/session/stop`);
      fetchCourseDetails(activeCourseId);
    } catch (e) {
      console.error("Error finalizing session:", e);
    }
  };

  const handleStopSessionManually = () => {
    stopSessionTimers();
    setSessionRunning(false);
    finalizeSessionOnServer();
    setSessionModalOpen(false);
  };

  const handleExport = (format: 'pdf' | 'xlsx' | 'csv') => {
    if (!activeCourseId) return;
    const url = `${API_BASE}/api/teacher/course-info/${activeCourseId}/export?format=${format}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleExportDate = (format: 'pdf' | 'xlsx' | 'csv') => {
    if (!activeCourseId || !selectedHistoryDate) return;
    const url = `${API_BASE}/api/teacher/course-info/${activeCourseId}/export?format=${format}&date=${selectedHistoryDate}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const submissionUrl = `${API_BASE}/attendance/submit?courseInfoId=${activeCourseId}`;

  // Custom Month Calendar Rendering
  const renderCalendar = () => {
    if (!courseInfo) return null;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    const calendarCells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      calendarCells.push({ key: `empty-${i}`, day: null, dateString: '' });
    }

    for (let day = 1; day <= totalDays; day++) {
      const monthStr = (currentMonth + 1).toString().padStart(2, '0');
      const dayStr = day.toString().padStart(2, '0');
      const dateString = `${currentYear}-${monthStr}-${dayStr}`;
      calendarCells.push({ key: `day-${day}`, day, dateString });
    }

    const prevMonth = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
      setSelectedHistoryDate(null);
    };

    const nextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
      setSelectedHistoryDate(null);
    };

    return (
      <Card className="rounded-3xl border border-border p-4 bg-card shadow-sm">
        <View className="flex-row items-center justify-between mb-4 px-2">
          <Text className="text-base font-extrabold text-foreground">
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <View className="flex-row gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 bg-muted/20 border-border/80" onPress={prevMonth}>
              <Text className="font-bold text-xs text-foreground">←</Text>
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-xl px-3 bg-muted/20 border-border/80" onPress={nextMonth}>
              <Text className="font-bold text-xs text-foreground">→</Text>
            </Button>
          </View>
        </View>

        <View className="flex-row mb-2 border-b border-border/40 pb-2">
          {daysOfWeek.map(d => (
            <View key={d} className="flex-1 items-center py-1">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase">{d}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {calendarCells.map((cell) => {
            const hasClass = (courseInfo.attendance.history || []).some(h => h.date === cell.dateString);
            const isSelected = selectedHistoryDate === cell.dateString;
            const isDayEmpty = !cell.day;

            return (
              <Pressable
                key={cell.key}
                disabled={isDayEmpty}
                onPress={() => {
                  setSelectedHistoryDate(cell.dateString);
                }}
                style={{ width: `${100 / 7}%` }}
                className={`items-center justify-center p-2 rounded-xl border min-h-[42px] ${
                  isDayEmpty ? 'opacity-0 border-transparent' : 'active:scale-95'
                } ${
                  isSelected 
                    ? 'bg-primary border-primary' 
                    : hasClass 
                      ? 'bg-emerald-500/10 border-emerald-500/20' 
                      : 'border-transparent hover:bg-muted/30'
                }`}
              >
                {!isDayEmpty && (
                  <View className="items-center justify-center relative w-full h-full">
                    <Text className={`text-xs font-semibold ${
                      isSelected 
                        ? 'text-primary-foreground font-black' 
                        : hasClass 
                          ? 'text-emerald-600 font-bold' 
                          : 'text-foreground'
                    }`}>
                      {cell.day}
                    </Text>
                    {hasClass && (
                      <View className={`absolute bottom-[-3px] h-1.5 w-1.5 rounded-full ${
                        isSelected ? 'bg-primary-foreground' : 'bg-emerald-500'
                      }`} />
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted-foreground">Loading teacher dashboard...</Text>
      </View>
    );
  }

  const activeSessionDetails = selectedHistoryDate 
    ? (courseInfo?.attendance.history || []).find(h => h.date === selectedHistoryDate) 
    : null;

  // Filter students based on search query
  const filteredStudents = courseInfo?.students.filter(student => {
    const query = searchQuery.toLowerCase();
    return student.userName.toLowerCase().includes(query) || student.studentId.toString().includes(query) || student.email.toLowerCase().includes(query);
  }) || [];

  // Overall statistics for the summary view
  const overallConducted = courseInfo?.attendance.totalClasses || 0;
  const overallAvgRate = courseInfo?.students.length 
    ? (courseInfo.students.reduce((acc, s) => acc + s.percentage, 0) / courseInfo.students.length) 
    : 0;
  const overallLowAttendance = courseInfo?.students.filter(s => s.percentage < 75).length || 0;

  return (
    <View className="flex-1 bg-background">
      <TopPanel />

      <View className="flex-1 flex-col md:flex-row lg:flex-row">
        {/* Sidebar for courses */}
        <View className="w-full border-b border-border bg-card p-4 md:w-64 md:border-b-0 md:border-r">
          <Text className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your Courses
          </Text>
          {courses.length === 0 ? (
            <Text className="text-sm text-muted-foreground italic">No courses assigned.</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2 md:flex-col">
              {courses.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setActiveCourseId(c.id)}
                  className={`rounded-xl px-4 py-3 active:opacity-75 ${
                    activeCourseId === c.id
                      ? 'bg-primary'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      activeCourseId === c.id ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {c.course.code}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 line-clamp-1 ${
                      activeCourseId === c.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {c.course.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Selected Course Content Area */}
        <View className="flex-1 md:pr-64 lg:pr-64">
          {detailsLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" />
              <Text className="mt-2 text-muted-foreground">Fetching course stats...</Text>
            </View>
          ) : courseInfo ? (
            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
              {error ? (
                <View className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                  <Text className="text-center font-medium text-destructive">{error}</Text>
                </View>
              ) : null}

              {/* Course Info Header */}
              <View className="flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <View className="flex-1">
                  <Text className="text-2xl font-bold tracking-tight">{courseInfo.course.title}</Text>
                  <Text className="text-sm text-muted-foreground mt-1">
                    Course Code: {courseInfo.course.code} | Credits:{' '}
                    {parseFloat(courseInfo.course.credits.replace('CREDIT_', '').replace('_', '.')) || 0}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Dropdown
                    value="Export Course Data"
                    onValueChange={(val) => {
                      if (val === 'PDF Document') handleExport('pdf');
                      else if (val === 'Excel Sheet') handleExport('xlsx');
                      else if (val === 'CSV File') handleExport('csv');
                    }}
                    options={['PDF Document', 'Excel Sheet', 'CSV File']}
                  />
                </View>
              </View>

              {/* Core Attendance Scanner Tools (QR Code & ESP32 Device Info) */}
              <View className="flex-col gap-4 md:flex-row mt-6">
                {/* Tool 1: QR Code Scanner */}
                <Card className="flex-1 rounded-3xl shadow-sm border border-border bg-card p-5">
                  <View className="flex-row items-center gap-3 mb-2">
                    <View className="p-2.5 rounded-2xl bg-primary/10">
                      <QrCode size={20} className="text-primary" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-foreground">QR Scanner Session</Text>
                      <Text className="text-[10px] text-muted-foreground uppercase font-semibold">Web Check-in Portal</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground leading-normal mb-4">
                    Generate a dynamic screen QR code. Students scan the code with their mobile devices to check themselves in automatically.
                  </Text>
                  <Button
                    variant="default"
                    size="sm"
                    onPress={startAttendanceSession}
                    className="rounded-xl self-start px-5 shadow-sm"
                  >
                    <Text className="font-semibold text-primary-foreground text-xs">Start QR Session</Text>
                  </Button>
                </Card>

                {/* Tool 2: ESP32 Hardware IoT Device integration */}
                <Card className="flex-1 rounded-3xl shadow-sm border border-border bg-card p-5">
                  <View className="flex-row items-center gap-3 mb-2">
                    <View className="p-2.5 rounded-2xl bg-emerald-500/10">
                      <BookOpen size={20} className="text-emerald-600" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-foreground">ESP32 IoT Sync</Text>
                        <View className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                          <View className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <Text className="text-[8px] font-extrabold text-emerald-600 uppercase">Active</Text>
                        </View>
                      </View>
                      <Text className="text-[10px] text-muted-foreground uppercase font-semibold">RFID Device Integration</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground leading-normal mb-4">
                    Students scan their RFID ID cards on the esp32 receiver node. The hardware connects over Wi-Fi to sync scans with active sessions.
                  </Text>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      Alert.alert(
                        'ESP32 IoT Syncer Specs',
                        `ESP32 Hardware RFID receiver is active and listening.\n\nLocal Endpoint:\nPOST /api/esp32/attendance\n\nEnsure card scanned logs contain studentId and courseInfoId in POST request bodies.`,
                        [{ text: 'Close' }]
                      );
                    }}
                    className="rounded-xl self-start px-5 bg-muted/20 border-border/80"
                  >
                    <Text className="font-semibold text-foreground text-xs">View API Docs</Text>
                  </Button>
                </Card>
              </View>

              {/* Attendance Management Workspace Heading */}
              <View className="border-t border-border/50 pt-6 mt-6 mb-4">
                <Text className="text-base font-extrabold tracking-tight">Attendance Record Dashboard</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">View cumulative records or select specific dates from the calendar to inspect, edit, and export logs.</Text>
              </View>

              {/* Two-Column Responsive Workspace Grid */}
              <View className="flex flex-col lg:flex-row gap-6">
                {/* Column 1: Calendar View Panel */}
                <View className="w-full lg:w-[350px] gap-4">
                  {renderCalendar()}
                  
                  {/* Calendar Legend and helper buttons */}
                  <View className="flex-row items-center justify-between px-2">
                    <View className="flex-row items-center gap-2">
                      <View className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      <Text className="text-[10px] font-semibold text-muted-foreground">Class Conducted</Text>
                    </View>
                    
                    {selectedHistoryDate && (
                      <Pressable 
                        onPress={() => setSelectedHistoryDate(null)}
                        className="bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg active:scale-95"
                      >
                        <Text className="text-[10px] font-bold text-primary">Reset to Course Sheet</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Column 2: Selected Details Panel */}
                <View className="flex-1">
                  {selectedHistoryDate === null ? (
                    /* CUMULATIVE SHEETS VIEW */
                    <View className="gap-4">
                      {/* Stats Row */}
                      <View className="flex-row gap-3 flex-wrap">
                        <Card className="flex-1 min-w-[120px] rounded-2xl border border-border p-3.5 bg-card">
                          <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conducted Classes</Text>
                          <Text className="text-2xl font-black text-foreground mt-1">{overallConducted}</Text>
                        </Card>
                        <Card className="flex-1 min-w-[120px] rounded-2xl border border-border p-3.5 bg-card">
                          <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Class Average Rate</Text>
                          <Text className="text-2xl font-black text-emerald-600 mt-1">{overallAvgRate.toFixed(1)}%</Text>
                        </Card>
                        <Card className="flex-1 min-w-[120px] rounded-2xl border border-border p-3.5 bg-card">
                          <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Low Attendance Warning</Text>
                          <Text className={`text-2xl font-black mt-1 ${overallLowAttendance > 0 ? 'text-destructive animate-pulse' : 'text-emerald-600'}`}>
                            {overallLowAttendance}
                          </Text>
                        </Card>
                      </View>

                      {/* Cumulative Student Table Card */}
                      <Card className="rounded-2xl border border-border bg-card p-4">
                        <View className="flex-row items-center justify-between mb-3.5 flex-wrap gap-2">
                          <Text className="text-sm font-extrabold text-foreground">Students Sheet (Cumulative)</Text>
                          <View className="relative justify-center w-full sm:w-56">
                            <Search size={14} className="absolute left-3 z-10 text-muted-foreground" />
                            <Input
                              placeholder="Search student ID/name..."
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                              className="h-8.5 rounded-xl border-transparent bg-muted/40 pl-9 pr-3 text-xs focus:bg-muted/70"
                              clearButtonMode="while-editing"
                            />
                          </View>
                        </View>

                        {filteredStudents.length === 0 ? (
                          <Text className="text-muted-foreground italic text-center py-6 text-xs">No matching students enrolled.</Text>
                        ) : (
                          <View className="border border-border/50 rounded-xl bg-card overflow-hidden">
                            <View className="hidden md:flex flex-row items-center border-b border-border/50 bg-muted/20 px-4 py-2">
                              <Text className="w-20 text-[10px] font-extrabold text-muted-foreground">ID</Text>
                              <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground">Student Name</Text>
                              <Text className="w-20 text-center text-[10px] font-extrabold text-muted-foreground">Attended</Text>
                              <Text className="w-20 text-center text-[10px] font-extrabold text-muted-foreground">Rate</Text>
                              <Text className="w-24 text-center text-[10px] font-extrabold text-muted-foreground">Status</Text>
                            </View>

                            {filteredStudents.map((student) => {
                              const isLow = student.percentage < 75;
                              return (
                                <View key={student.id} className="flex-col border-b border-border/40 last:border-0 px-4 py-3 md:flex-row md:items-center md:py-2">
                                  <View className="md:w-20 mb-0.5 md:mb-0">
                                    <Text className="text-xs font-bold text-foreground">{student.studentId}</Text>
                                  </View>
                                  <View className="flex-1 mb-1 md:mb-0">
                                    <Text className="text-xs font-semibold text-foreground">{student.userName}</Text>
                                    <Text className="text-[10px] text-muted-foreground/75 md:hidden">{student.email}</Text>
                                  </View>
                                  
                                  <View className="flex-row items-center justify-between border-t border-border/30 pt-1.5 mt-1.5 md:border-0 md:pt-0 md:mt-0 md:w-60">
                                    <View className="md:w-20">
                                      <Text className="text-xs text-foreground text-left md:text-center">
                                        {student.attendanceCount} / {overallConducted}
                                      </Text>
                                    </View>
                                    <View className="md:w-20">
                                      <Text className={`text-xs font-bold text-left md:text-center ${isLow ? 'text-destructive' : 'text-emerald-600'}`}>
                                        {student.percentage.toFixed(0)}%
                                      </Text>
                                    </View>
                                    <View className="md:w-24 flex-row justify-end md:justify-center">
                                      <View className={`rounded-full px-2 py-0.5 ${isLow ? 'bg-destructive/10 border border-destructive/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                                        <Text className={`text-[9px] font-extrabold uppercase ${isLow ? 'text-destructive' : 'text-emerald-600'}`}>
                                          {isLow ? 'Low (<75%)' : 'Good'}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </Card>
                    </View>
                  ) : activeSessionDetails ? (
                    /* DATE ATTENDANCE DETAIL SHEET */
                    <View className="gap-4">
                      {/* Date details statistics header */}
                      <Card className="rounded-2xl border border-border bg-card p-4">
                        <View className="flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/50 gap-2 mb-3.5">
                          <View>
                            <View className="flex-row items-center gap-1.5">
                              <Calendar size={14} className="text-primary" />
                              <Text className="text-sm font-extrabold text-foreground">Class Attendance Log</Text>
                            </View>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                              Date: <Text className="font-bold text-foreground">{selectedHistoryDate}</Text>
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2 self-start sm:self-auto">
                            <Dropdown
                              value="Export Date Data"
                              onValueChange={(val) => {
                                if (val === 'PDF Document') handleExportDate('pdf');
                                else if (val === 'Excel Sheet') handleExportDate('xlsx');
                                else if (val === 'CSV File') handleExportDate('csv');
                              }}
                              options={['PDF Document', 'Excel Sheet', 'CSV File']}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8.5 rounded-xl flex-row items-center gap-1 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 px-2.5"
                              onPress={() => handleDeleteHistorySession(selectedHistoryDate)}
                            >
                              <Trash2 size={12} className="text-destructive" />
                              <Text className="text-[10px] font-bold text-destructive">Delete Date</Text>
                            </Button>
                          </View>
                        </View>

                        {/* Quick Stats Grid */}
                        <View className="flex-row gap-3 mb-3.5">
                          <View className="flex-1 bg-muted/20 border border-border/40 rounded-xl p-2.5 items-center">
                            <Text className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Present</Text>
                            <Text className="text-xl font-black text-emerald-600 mt-0.5">{activeSessionDetails.presentStudents?.length || 0}</Text>
                          </View>
                          <View className="flex-1 bg-muted/20 border border-border/40 rounded-xl p-2.5 items-center">
                            <Text className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Absent</Text>
                            <Text className="text-xl font-black text-destructive mt-0.5">
                              {Math.max(0, courseInfo.students.length - (activeSessionDetails.presentStudents?.length || 0))}
                            </Text>
                          </View>
                          <View className="flex-1 bg-muted/20 border border-border/40 rounded-xl p-2.5 items-center">
                            <Text className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Present Rate</Text>
                            <Text className="text-xl font-black text-primary mt-0.5">
                              {((activeSessionDetails.presentStudents?.length || 0) / (courseInfo.students.length || 1) * 100).toFixed(0)}%
                            </Text>
                          </View>
                        </View>

                        {/* Student Presence Checklist Grid */}
                        <View className="flex-row items-center justify-between mb-3 flex-wrap gap-2">
                          <Text className="text-xs font-bold text-foreground">Mark Attendance manually only when necessary:</Text>
                          <View className="relative justify-center w-full sm:w-48">
                            <Search size={12} className="absolute left-2.5 z-10 text-muted-foreground" />
                            <Input
                              placeholder="Filter students..."
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                              className="h-8 rounded-xl border-transparent bg-muted/40 pl-8 pr-3 text-xs focus:bg-muted/70"
                              clearButtonMode="while-editing"
                            />
                          </View>
                        </View>

                        <View className="border border-border/60 rounded-xl bg-card overflow-hidden">
                          <View className="flex-row items-center border-b border-border/60 bg-muted/30 px-3.5 py-2">
                            <Text className="w-20 text-[9px] font-extrabold text-muted-foreground">ID</Text>
                            <Text className="flex-1 text-[9px] font-extrabold text-muted-foreground">Student Name</Text>
                            <Text className="w-16 text-center text-[9px] font-extrabold text-muted-foreground">Status</Text>
                            <Text className="w-16 text-center text-[9px] font-extrabold text-muted-foreground">Toggle</Text>
                          </View>

                          {filteredStudents.map((s) => {
                            const isPresent = activeSessionDetails.presentStudents?.includes(s.studentId);
                            return (
                              <View key={s.id} className="flex-row items-center px-3.5 py-1.5 border-b border-border/40 last:border-0">
                                <Text className="w-20 text-xs font-bold text-foreground">{s.studentId}</Text>
                                <Text className="flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>{s.userName}</Text>
                                <View className="w-16 items-center">
                                  <View className={`rounded-full px-2 py-0.5 ${isPresent ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                                    <Text className={`text-[8px] font-extrabold uppercase ${isPresent ? 'text-emerald-600' : 'text-destructive'}`}>
                                      {isPresent ? 'Present' : 'Absent'}
                                    </Text>
                                  </View>
                                </View>
                                <View className="w-16 items-center">
                                  <Pressable
                                    onPress={() => handleTogglePresenceOnDate(s.studentId)}
                                    className="active:scale-90"
                                  >
                                    {isPresent ? (
                                      <CheckSquare size={18} className="text-emerald-600" />
                                    ) : (
                                      <Square size={18} className="text-muted-foreground/50" />
                                    )}
                                  </Pressable>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </Card>
                    </View>
                  ) : (
                    /* DATE SELECTED BUT NO CLASS RECORDED (EMPTY STATE) */
                    <Card className="rounded-2xl border border-border border-dashed p-6 bg-card items-center justify-center min-h-[260px]">
                      <View className="p-3 rounded-full bg-muted/40 mb-3 border border-border">
                        <Calendar size={28} className="text-muted-foreground/75" />
                      </View>
                      <Text className="text-sm font-extrabold text-foreground text-center">No Conducted Class Session</Text>
                      <Text className="text-xs text-muted-foreground/85 text-center mt-1.5 max-w-sm leading-normal">
                        No class session was recorded on <Text className="font-bold text-foreground">{selectedHistoryDate}</Text>. Class logs are created automatically when sessions run. Manual log creation is disabled.
                      </Text>
                      
                      <View className="flex-row gap-3 mt-5 flex-wrap justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onPress={() => setSelectedHistoryDate(null)}
                          className="rounded-xl bg-muted/20 border-border/80"
                        >
                          <Text className="font-semibold text-foreground text-xs">Back to Summary</Text>
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onPress={startAttendanceSession}
                          className="rounded-xl px-4 shadow-sm"
                        >
                          <Text className="font-semibold text-primary-foreground text-xs">Start QR Session</Text>
                        </Button>
                      </View>
                    </Card>
                  )}
                </View>
              </View>
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center p-6 bg-background">
              <Text className="text-lg font-semibold text-muted-foreground">Select a course from the sidebar to view details.</Text>
            </View>
          )}
        </View>
      </View>

      {/* Live QR session modal */}
      <Modal visible={sessionModalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full max-w-xl rounded-3xl bg-card border border-border shadow-2xl p-6 overflow-hidden">
            <View className="flex-row items-center justify-between border-b border-border/50 pb-4 mb-4">
              <View className="flex-row items-center gap-2">
                <Clock size={20} className="text-primary" />
                <Text className="text-xl font-bold">Attendance Session</Text>
              </View>
              <View className="bg-primary/10 rounded-full px-3 py-1 flex-row items-center gap-1.5">
                <Clock size={12} className="text-primary animate-pulse" />
                <Text className="text-sm font-bold text-primary">{formatTime(sessionTimeLeft)}</Text>
              </View>
            </View>

            <View className="flex-col sm:flex-row items-center gap-6 py-4">
              <View className="w-48 h-48 bg-white items-center justify-center rounded-2xl border border-border shadow-inner p-2">
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(submissionUrl)}` }}
                  style={{ width: 170, height: 170 }}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Instructions</Text>
                <Text className="text-sm text-foreground mt-2 font-medium">
                  Have students scan this QR code or browse to:
                </Text>
                <Text className="text-xs text-primary bg-muted p-2 rounded-xl mt-1 select-all font-semibold break-all border border-border/50">
                  {submissionUrl}
                </Text>
                <Text className="text-xs text-muted-foreground mt-3 italic">
                  Keep this window open. Attendance logs will sync in real-time.
                </Text>
              </View>
            </View>

            <View className="border-t border-border/50 pt-4 mt-4">
              <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Submissions ({sessionSubmissions.length})
              </Text>
              <View className="h-32 bg-muted/40 rounded-2xl border border-border/50 p-2">
                {sessionSubmissions.length === 0 ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="small" />
                    <Text className="text-xs text-muted-foreground mt-2">Waiting for student check-ins...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={sessionSubmissions}
                    keyExtractor={(item) => item.studentId.toString()}
                    renderItem={({ item }) => (
                      <View className="flex-row items-center gap-2 px-3 py-1.5 border-b border-border/20 last:border-0 bg-card rounded-lg mb-1 shadow-sm">
                        <View className="h-2 w-2 rounded-full bg-emerald-500" />
                        <Text className="text-xs font-semibold text-foreground">
                          {item.studentId} - {item.userName}
                        </Text>
                      </View>
                    )}
                  />
                )}
              </View>
            </View>

            <View className="flex-row justify-end gap-3 border-t border-border/50 pt-4 mt-6">
              <Button
                variant={sessionRunning ? 'destructive' : 'default'}
                size="sm"
                onPress={handleStopSessionManually}
                className="rounded-xl px-5 font-semibold"
              >
                <Text className="font-semibold text-destructive-foreground">{sessionRunning ? 'Stop and Apply' : 'Close'}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}