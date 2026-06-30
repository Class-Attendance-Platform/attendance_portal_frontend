import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/AuthContext';
import { studentService, sessionService } from '@/lib/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dropdown } from '@/components/custom/dropdown';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Award,
  RefreshCw,
  GraduationCap,
  X,
  Check,
  Clock,
  AlertCircle,
  Search,
  QrCode,
} from 'lucide-react-native';
import TopPanel from '@/components/custom/toppanel';
import { CourseStat } from '@/types/attendance';
import { SemesterData } from '@/types/semester';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<'courses' | 'logs' | 'calendar'>('courses');
  const [selectedSemesterIdx, setSelectedSemesterIdx] = useState(0);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentMonth, setCurrentMonth] = useState(4);
  const [currentYear, setCurrentYear] = useState(2026);

  const fetchStudentData = async (isRef = false) => {
    if (!user) return;
    if (isRef) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await studentService.getSemesters(user.id);
      if (res.success) {
        setSemesters(res.semesters || []);
      } else {
        setError('Failed to fetch data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const activeSemester = semesters[selectedSemesterIdx];

  useEffect(() => {
    if (activeSemester && activeSemester.courses.length > 0) {
      setActiveCourseId(activeSemester.courses[0].id);
    } else {
      setActiveCourseId('');
    }
    setSearchQuery('');
  }, [selectedSemesterIdx, semesters]);

  const totalCredits =
    activeSemester?.courses.reduce((acc, c) => {
      const creditsStr = c.course.credits.replace('CREDIT_', '').replace('_', '.');
      const val = parseFloat(creditsStr) || 0.0;
      return acc + val;
    }, 0) || 0;

  const overallAttendance = activeSemester?.courses.length
    ? activeSemester.courses.reduce((acc, c) => acc + c.percentage, 0) /
      activeSemester.courses.length
    : 0;

  const activeCourse = activeSemester?.courses.find((c) => c.id === activeCourseId);

  const formatDepartment = (dept?: string) => {
    if (!dept) return 'N/A';
    return dept
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderStudentCalendar = (course: CourseStat) => {
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
    };

    const nextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    };

    return (
      <Card className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <View className="mb-4 flex-row items-center justify-between px-2">
          <Text className="text-base font-extrabold text-foreground">
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-border/80 bg-muted/20 px-3"
              onPress={prevMonth}>
              <Text className="text-xs font-bold text-foreground">←</Text>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-border/80 bg-muted/20 px-3"
              onPress={nextMonth}>
              <Text className="text-xs font-bold text-foreground">→</Text>
            </Button>
          </View>
        </View>

        <View className="mb-2 flex-row border-b border-border/40 pb-2">
          {daysOfWeek.map((d) => (
            <View key={d} className="flex-1 items-center py-1">
              <Text className="text-[10px] font-bold uppercase text-muted-foreground">{d}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {calendarCells.map((cell) => {
            const isDayEmpty = !cell.day;
            const historyItem = course.history?.find((h) => h.date === cell.dateString);
            const hasClass = !!historyItem;
            const isPresent = historyItem?.present;

            return (
              <View
                key={cell.key}
                style={{ width: `${100 / 7}%` }}
                className={`min-h-[42px] items-center justify-center rounded-xl border p-2 ${
                  isDayEmpty ? 'border-transparent opacity-0' : ''
                } ${
                  hasClass
                    ? isPresent
                      ? 'border-emerald-500/25 bg-emerald-500/10'
                      : 'border-destructive/25 bg-destructive/10'
                    : 'border-transparent'
                }`}>
                {!isDayEmpty && (
                  <View className="relative h-full w-full items-center justify-center">
                    <Text
                      className={`text-xs font-semibold ${
                        hasClass
                          ? isPresent
                            ? 'font-bold text-emerald-600'
                            : 'font-bold text-destructive'
                          : 'text-foreground'
                      }`}>
                      {cell.day}
                    </Text>
                    {hasClass && (
                      <View
                        className={`absolute bottom-[-3px] h-1.5 w-1.5 rounded-full ${
                          isPresent ? 'bg-emerald-500' : 'bg-destructive'
                        }`}
                      />
                    )}
                  </View>
                )}
              </View>
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
        <Text className="mt-4 text-muted-foreground">Loading dashboard...</Text>
      </View>
    );
  }

  if (isMobile) {
    return (
      <View className="flex-1 bg-background">
        <TopPanel />

        {activeTab === 'courses' && (
          <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
            {error ? (
              <View className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                <Text className="text-center font-medium text-destructive">{error}</Text>
              </View>
            ) : null}

            {/* Academic Session picker */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Academic Session
            </Text>
            {semesters.length > 0 && (
              <View className="mb-4">
                <Dropdown
                  value={`Level ${activeSemester?.level} Sem ${activeSemester?.semester}`}
                  onValueChange={(val) => {
                    const idx = semesters.findIndex(
                      (s) => `Level ${s.level} Sem ${s.semester}` === val
                    );
                    if (idx !== -1) {
                      setSelectedSemesterIdx(idx);
                    }
                  }}
                  options={semesters.map((s) => `Level ${s.level} Sem ${s.semester}`)}
                />
              </View>
            )}

            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Courses
            </Text>

            {semesters.length === 0 || !activeSemester || activeSemester.courses.length === 0 ? (
              <Text className="text-xs italic text-muted-foreground mb-4">
                No courses in this session.
              </Text>
            ) : (
              <View className="flex-col gap-2.5 mb-6">
                {activeSemester.courses.map((item) => {
                  const isSelected = item.id === activeCourseId;
                  const isLow = item.percentage < 75;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setActiveCourseId(item.id)}
                      className={`w-full flex-row items-center justify-between rounded-xl px-4 py-3 active:opacity-75 ${
                        isSelected ? 'bg-primary' : 'bg-card border border-border/60'
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <Text
                          className={`text-sm font-semibold ${
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                          numberOfLines={1}
                        >
                          {item.course.code}
                        </Text>
                        <Text
                          className={`mt-0.5 text-xs ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                          numberOfLines={1}
                        >
                          {item.course.title}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-2 py-0.5 ${
                          isSelected
                            ? 'bg-primary-foreground/20'
                            : isLow
                              ? 'bg-destructive/10'
                              : 'bg-emerald-500/10'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected
                              ? 'text-primary-foreground'
                              : isLow
                                ? 'text-destructive'
                                : 'text-emerald-600'
                          }`}
                        >
                          {item.percentage.toFixed(0)}%
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {activeCourse ? (
              <View className="gap-4">
                {/* Active Course Card */}
                <Card className="rounded-2xl border border-border p-4 bg-card shadow-sm">
                  <Text className="text-lg font-bold text-foreground">{activeCourse.course.title}</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Code: {activeCourse.course.code} | Credits: {parseFloat(activeCourse.course.credits.replace('CREDIT_', '').replace('_', '.')) || 0}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Instructor: <Text className="font-bold text-foreground">{activeCourse.teacher.userName}</Text>
                  </Text>

                  {/* Give Attendance Button */}
                  <Button
                    onPress={async () => {
                      setCheckingAttendance(true);
                      setError('');
                      try {
                        const res = await sessionService.getActiveSession(activeCourseId);
                        if (res.success && res.session_id && res.qr_token) {
                          router.push(
                            `/attendance/submit?courseInfoId=${activeCourseId}&sessionId=${res.session_id}&qrToken=${res.qr_token}`
                          );
                        } else {
                          setError('No active session found for this course.');
                        }
                      } catch (err: any) {
                        setError(err.message || 'Failed to check active session.');
                      } finally {
                        setCheckingAttendance(false);
                      }
                    }}
                    disabled={checkingAttendance}
                    className="flex-row items-center justify-center gap-2 mt-4 w-full rounded-xl"
                  >
                    {checkingAttendance ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <QrCode size={18} color="#fff" />
                    )}
                    <Text className="font-semibold text-primary-foreground">Give Attendance</Text>
                  </Button>
                </Card>

                {/* Warning Card */}
                {activeCourse.percentage < 75 && activeCourse.totalClasses > 0 && (
                  <View className="flex-row items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                    <AlertCircle size={20} className="text-destructive" />
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-destructive">
                        Attendance Shortage Warning
                      </Text>
                      <Text className="mt-0.5 text-xs leading-normal text-muted-foreground">
                        Your attendance rate is below 75%. Please attend upcoming lectures to qualify for exams.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Stats Row */}
                <View className="flex-row gap-3">
                  <Card className="flex-1 rounded-2xl border border-border bg-card p-3 items-center">
                    <Text className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Lectures</Text>
                    <Text className="mt-0.5 text-xl font-black text-foreground">{activeCourse.totalClasses}</Text>
                  </Card>
                  <Card className="flex-1 rounded-2xl border border-border bg-card p-3 items-center">
                    <Text className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Attended</Text>
                    <Text className="mt-0.5 text-xl font-black text-emerald-600">{activeCourse.presentCount}</Text>
                  </Card>
                  <Card className="flex-1 rounded-2xl border border-border bg-card p-3 items-center">
                    <Text className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Rate</Text>
                    <Text className={`mt-0.5 text-xl font-black ${activeCourse.percentage >= 75 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {activeCourse.percentage.toFixed(0)}%
                    </Text>
                  </Card>
                </View>
              </View>
            ) : (
              <Text className="text-sm text-center text-muted-foreground mt-8">
                Please select a course to view details.
              </Text>
            )}
          </ScrollView>
        )}

        {activeTab === 'logs' && (
          <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
            {activeCourse ? (
              <View className="gap-4">
                <View className="flex-row justify-between items-center bg-card border border-border p-3.5 rounded-xl">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Course</Text>
                    <Text className="text-sm font-bold text-foreground mt-0.5" numberOfLines={1}>{activeCourse.course.title}</Text>
                  </View>
                </View>

                {/* Lecture Logs list */}
                <Card className="rounded-2xl border border-border bg-card p-4">
                  <View className="mb-3.5 flex-col gap-2">
                    <Text className="text-sm font-extrabold text-foreground">
                      Lecture Attendance Sheet
                    </Text>
                    <View className="relative w-full justify-center">
                      <Search
                        size={14}
                        className="absolute left-3 z-10 text-muted-foreground"
                      />
                      <Input
                        placeholder="Filter by date..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="h-8.5 rounded-xl border-transparent bg-muted/40 pl-9 pr-3 text-xs focus:bg-muted/70"
                        clearButtonMode="while-editing"
                      />
                    </View>
                  </View>

                  {!activeCourse.history || activeCourse.history.length === 0 ? (
                    <Text className="py-6 text-center text-xs italic text-muted-foreground">
                      No lecture logs found for this course.
                    </Text>
                  ) : (
                    <View className="overflow-hidden rounded-xl border border-border/50 bg-card">
                      <View className="flex-row items-center border-b border-border/50 bg-muted/20 px-3 py-2">
                        <Text className="w-10 text-[9px] font-extrabold text-muted-foreground">LEC.</Text>
                        <Text className="flex-1 text-[9px] font-extrabold text-muted-foreground">DATE</Text>
                        <Text className="w-20 text-center text-[9px] font-extrabold text-muted-foreground">STATUS</Text>
                      </View>

                      {activeCourse.history
                        .filter((h) => h.date.includes(searchQuery))
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((session, index, arr) => {
                          const lectureNo = arr.length - index;
                          return (
                            <View
                              key={session.date}
                              className="flex-row items-center border-b border-border/40 px-3 py-2 last:border-0"
                            >
                              <Text className="w-10 text-xs font-bold text-muted-foreground">#{lectureNo}</Text>
                              <Text className="flex-1 text-xs font-semibold text-foreground">{session.date}</Text>
                              <View className="w-20 items-center">
                                <View
                                  className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${
                                    session.present
                                      ? 'border-emerald-500/25 bg-emerald-500/10'
                                      : 'border-destructive/25 bg-destructive/10'
                                  }`}
                                >
                                  <Text
                                    className={`text-[8px] font-extrabold uppercase ${session.present ? 'text-emerald-600' : 'text-destructive'}`}
                                  >
                                    {session.present ? 'Present' : 'Absent'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}
                </Card>
              </View>
            ) : (
              <Text className="text-sm text-center text-muted-foreground mt-8">
                Please select a course on the Courses tab.
              </Text>
            )}
          </ScrollView>
        )}

        {activeTab === 'calendar' && (
          <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
            {activeCourse ? (
              <View className="gap-4">
                <View className="flex-row justify-between items-center bg-card border border-border p-3.5 rounded-xl">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Course</Text>
                    <Text className="text-sm font-bold text-foreground mt-0.5" numberOfLines={1}>{activeCourse.course.title}</Text>
                  </View>
                </View>

                {renderStudentCalendar(activeCourse)}

                {/* Calendar Legend */}
                <View className="flex-row items-center justify-center gap-4 px-2 mt-1">
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full bg-emerald-500/80" />
                    <Text className="text-[10px] font-semibold text-muted-foreground">Present</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full bg-destructive/80" />
                    <Text className="text-[10px] font-semibold text-muted-foreground">Absent</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text className="text-sm text-center text-muted-foreground mt-8">
                Please select a course on the Courses tab.
              </Text>
            )}
          </ScrollView>
        )}

        {/* Bottom Nav Bar like Admin Panel */}
        <View className="flex-row items-center border-t border-border bg-background py-3 w-full">
          <Pressable
            onPress={() => setActiveTab('courses')}
            className="flex-1 flex-col h-auto gap-1 px-1 py-1 items-center justify-center bg-transparent active:bg-transparent"
          >
            <BookOpen size={20} className={activeTab === 'courses' ? 'text-foreground' : 'text-muted-foreground'} />
            <Text className={`text-[11px] font-bold text-center ${activeTab === 'courses' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Courses
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('logs')}
            className="flex-1 flex-col h-auto gap-1 px-1 py-1 items-center justify-center bg-transparent active:bg-transparent"
          >
            <CheckCircle size={20} className={activeTab === 'logs' ? 'text-foreground' : 'text-muted-foreground'} />
            <Text className={`text-[11px] font-bold text-center ${activeTab === 'logs' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Logs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('calendar')}
            className="flex-1 flex-col h-auto gap-1 px-1 py-1 items-center justify-center bg-transparent active:bg-transparent"
          >
            <Calendar size={20} className={activeTab === 'calendar' ? 'text-foreground' : 'text-muted-foreground'} />
            <Text className={`text-[11px] font-bold text-center ${activeTab === 'calendar' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Calendar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <TopPanel />

      <View className="flex-1 flex-row">
        {/* Sidebar: Semester Selection & Enrolled Courses */}
        <View
          className="border-border bg-card p-4 w-64 border-r">
          <View className="mb-6 flex-col items-center">
            <Image
              source={require('@/assets/images/hstu.png')}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
            <Text className="mt-3 px-4 text-center text-lg font-bold tracking-tight text-foreground">
              Student Dashboard
            </Text>
            {user?.studentId ? (
              <Text className="mb-4 mt-1 text-center text-sm font-semibold text-muted-foreground">
                ID: {user.studentId}
              </Text>
            ) : (
              <View className="mb-4" />
            )}
            <View className="mb-4 h-px w-full bg-border/60" />
          </View>
          <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Academic Session
          </Text>

          {/* Semester dropdown/picker */}
          {semesters.length > 0 && (
            <View className="mb-4">
              <Dropdown
                value={`Level ${activeSemester?.level} Sem ${activeSemester?.semester}`}
                onValueChange={(val) => {
                  const idx = semesters.findIndex(
                    (s) => `Level ${s.level} Sem ${s.semester}` === val
                  );
                  if (idx !== -1) {
                    setSelectedSemesterIdx(idx);
                  }
                }}
                options={semesters.map((s) => `Level ${s.level} Sem ${s.semester}`)}
              />
            </View>
          )}

          <Text className="mb-2 border-t border-border/40 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your Courses
          </Text>

          {semesters.length === 0 || !activeSemester || activeSemester.courses.length === 0 ? (
            <Text className="text-xs italic text-muted-foreground">
              No courses in this session.
            </Text>
          ) : (
            <View className="flex-col gap-2">
              {activeSemester.courses.map((item) => {
                const isSelected = item.id === activeCourseId;
                const isLow = item.percentage < 75;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setActiveCourseId(item.id)}
                    className={`w-full flex-row items-center justify-between rounded-xl px-4 py-3 active:opacity-75 ${
                      isSelected ? 'bg-primary' : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <View className="flex-1 pr-2">
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                        numberOfLines={1}
                      >
                        {item.course.code}
                      </Text>
                      <Text
                        className={`mt-0.5 line-clamp-1 text-xs ${
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}
                        numberOfLines={1}
                      >
                        {item.course.title}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-1.5 py-0.5 ${
                        isSelected
                          ? 'bg-primary-foreground/20'
                          : isLow
                            ? 'bg-destructive/10'
                            : 'bg-emerald-500/10'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          isSelected
                            ? 'text-primary-foreground'
                            : isLow
                              ? 'text-destructive'
                              : 'text-emerald-600'
                        }`}
                      >
                        {item.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Main Content Area */}
        <View className="min-w-0 flex-1">
          {activeCourse ? (
            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
              {error ? (
                <View className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                  <Text className="text-center font-medium text-destructive">{error}</Text>
                </View>
              ) : null}

              {/* Selected Course Header */}
              <View className="flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <View className="flex-1">
                  <Text className="text-2xl font-bold tracking-tight">
                    {activeCourse.course.title}
                  </Text>
                  <Text className="mt-1 text-sm text-muted-foreground">
                    Course Code: {activeCourse.course.code} | Credits:{' '}
                    {parseFloat(
                      activeCourse.course.credits.replace('CREDIT_', '').replace('_', '.')
                    ) || 0}
                  </Text>
                  <Text className="mt-1 flex-row items-center gap-1 text-xs font-semibold text-muted-foreground">
                    Instructor:{' '}
                    <Text className="font-bold text-foreground">
                      {activeCourse.teacher.userName}
                    </Text>{' '}
                    ({activeCourse.teacher.email})
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Button
                    onPress={async () => {
                      setCheckingAttendance(true);
                      setError('');
                      try {
                        const res = await sessionService.getActiveSession(activeCourseId);
                        if (res.success && res.session_id && res.qr_token) {
                          router.push(
                            `/attendance/submit?courseInfoId=${activeCourseId}&sessionId=${res.session_id}&qrToken=${res.qr_token}`
                          );
                        } else {
                          setError('No active session found for this course.');
                        }
                      } catch (err: any) {
                        setError(err.message || 'Failed to check active session.');
                      } finally {
                        setCheckingAttendance(false);
                      }
                    }}
                    disabled={checkingAttendance}
                    className="flex-row items-center gap-2">
                    {checkingAttendance ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <QrCode size={18} color="#fff" />
                    )}
                    <Text className="font-semibold text-primary-foreground">Give Attendance</Text>
                  </Button>
                </View>
              </View>

              {/* Overall Attendance shortage warning */}
              {activeCourse.percentage < 75 && activeCourse.totalClasses > 0 && (
                <View className="mt-6 flex-row items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <AlertCircle size={20} className="text-destructive" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-destructive">
                      Attendance Shortage Warning
                    </Text>
                    <Text className="mt-0.5 text-xs leading-normal text-muted-foreground">
                      Your attendance rate ({activeCourse.percentage.toFixed(0)}%) is currently
                      below the university's mandatory minimum requirement of 75%. Please attend
                      upcoming lectures to qualify for exams.
                    </Text>
                  </View>
                </View>
              )}

              {/* Attendance Management Workspace Heading */}
              <View className="mb-4 pt-6">
                <Text className="text-base font-extrabold tracking-tight">
                  Your Attendance Console
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Track your check-ins and missed lecture logs for the semester.
                </Text>
              </View>

              {/* Two-Column Responsive Workspace Grid */}
              <View className="flex flex-col gap-6 lg:flex-row">
                {/* Column 1: Calendar View Card */}
                <View className="w-full gap-4 lg:w-[350px]">
                  {renderStudentCalendar(activeCourse)}

                  {/* Calendar Legend */}
                  <View className="flex-row items-center gap-4 px-2">
                    <View className="flex-row items-center gap-1.5">
                      <View className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      <Text className="text-[10px] font-semibold text-muted-foreground">
                        Present (Attended)
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <View className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                      <Text className="text-[10px] font-semibold text-muted-foreground">
                        Absent (Missed)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Column 2: Lecture Logs list */}
                <View className="flex-1">
                  <View className="gap-4">
                    {/* Quick Course Stats Row */}
                    <View className="flex-row flex-wrap gap-3">
                      <Card className="min-w-[120px] flex-1 rounded-2xl border border-border bg-card p-3.5">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Lectures Held
                        </Text>
                        <Text className="mt-1 text-2xl font-black text-foreground">
                          {activeCourse.totalClasses}
                        </Text>
                      </Card>
                      <Card className="min-w-[120px] flex-1 rounded-2xl border border-border bg-card p-3.5">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Lectures Attended
                        </Text>
                        <Text className="mt-1 text-2xl font-black text-emerald-600">
                          {activeCourse.presentCount}
                        </Text>
                      </Card>
                      <Card className="min-w-[120px] flex-1 rounded-2xl border border-border bg-card p-3.5">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Attendance Rate
                        </Text>
                        <Text
                          className={`mt-1 text-2xl font-black ${activeCourse.percentage >= 75 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {activeCourse.percentage.toFixed(0)}%
                        </Text>
                      </Card>
                    </View>

                    {/* Table of Lecture Logs */}
                    <Card className="rounded-2xl border border-border bg-card p-4">
                      <View className="mb-3.5 flex-row flex-wrap items-center justify-between gap-2">
                        <Text className="text-sm font-extrabold text-foreground">
                          Lecture Attendance Sheet
                        </Text>
                        <View className="relative w-full justify-center sm:w-52">
                          <Search
                            size={14}
                            className="absolute left-3 z-10 text-muted-foreground"
                          />
                          <Input
                            placeholder="Filter by date..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="h-8.5 rounded-xl border-transparent bg-muted/40 pl-9 pr-3 text-xs focus:bg-muted/70"
                            clearButtonMode="while-editing"
                          />
                        </View>
                      </View>

                      {!activeCourse.history || activeCourse.history.length === 0 ? (
                        <Text className="py-6 text-center text-xs italic text-muted-foreground">
                          No lecture logs found for this course.
                        </Text>
                      ) : (
                        <View className="overflow-hidden rounded-xl border border-border/50 bg-card">
                          <View className="flex-row items-center border-b border-border/50 bg-muted/20 px-4 py-2">
                            <Text className="w-12 text-[10px] font-extrabold text-muted-foreground">
                              LEC.
                            </Text>
                            <Text className="flex-1 text-[10px] font-extrabold text-muted-foreground">
                              CONDUCTED DATE
                            </Text>
                            <Text className="w-24 text-center text-[10px] font-extrabold text-muted-foreground">
                              STATUS
                            </Text>
                          </View>

                          {activeCourse.history
                            .filter((h) => h.date.includes(searchQuery))
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((session, index, arr) => {
                              const lectureNo = arr.length - index;
                              return (
                                <View
                                  key={session.date}
                                  className="flex-row items-center border-b border-border/40 px-4 py-2.5 last:border-0">
                                  <Text className="w-12 text-xs font-bold text-muted-foreground">
                                    #{lectureNo}
                                  </Text>
                                  <Text className="flex-1 text-xs font-semibold text-foreground">
                                    {session.date}
                                  </Text>
                                  <View className="w-24 items-center">
                                    <View
                                      className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${
                                        session.present
                                          ? 'border-emerald-500/25 bg-emerald-500/10'
                                          : 'border-destructive/25 bg-destructive/10'
                                      }`}>
                                      <View
                                        className={`h-1.5 w-1.5 rounded-full ${session.present ? 'bg-emerald-500' : 'bg-destructive'}`}
                                      />
                                      <Text
                                        className={`text-[9px] font-extrabold uppercase ${session.present ? 'text-emerald-600' : 'text-destructive'}`}>
                                        {session.present ? 'Present' : 'Absent'}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                        </View>
                      )}
                    </Card>
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center bg-background p-6">
              <Text className="text-lg font-semibold text-muted-foreground">
                Select a course to view your records.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
