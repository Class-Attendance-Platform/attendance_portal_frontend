import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, CheckCircle, Award, RefreshCw, User, Mail, GraduationCap } from 'lucide-react-native';
import TopPanel from '@/components/custom/toppanel';

interface CourseStat {
  id: string;
  course: {
    title: string;
    code: string;
    credits: string;
  };
  teacher: {
    userName: string;
    email: string;
  };
  totalClasses: number;
  presentCount: number;
  percentage: number;
}

interface SemesterData {
  id: string;
  level: string;
  semester: string;
  startDate: any;
  endDate: any;
  courses: CourseStat[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [selectedSemesterIdx, setSelectedSemesterIdx] = useState(0);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStudentData = async (isRef = false) => {
    if (!user) return;
    if (isRef) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/student/${user.id}/semesters`);
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

  const totalCredits = activeSemester?.courses.reduce((acc, c) => {
    const creditsStr = c.course.credits.replace('CREDIT_', '').replace('_', '.');
    const val = parseFloat(creditsStr) || 0.0;
    return acc + val;
  }, 0) || 0;

  const overallAttendance = activeSemester?.courses.length
    ? activeSemester.courses.reduce((acc, c) => acc + c.percentage, 0) / activeSemester.courses.length
    : 0;

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted-foreground">Loading dashboard...</Text>
      </View>
    );
  }

  // Format department name to be readable
  const formatDepartment = (dept?: string) => {
    if (!dept) return 'N/A';
    return dept.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <View className="flex-1 bg-background">
      <TopPanel />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-6xl w-full mx-auto px-4 py-6 gap-6">
          
          {/* Welcome Banner Card */}
          <View className="relative overflow-hidden rounded-3xl bg-card border border-border p-6 shadow-sm flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <GraduationCap size={32} className="text-primary" />
              </View>
              <View>
                <Text className="text-2xl font-black tracking-tight text-foreground">
                  Welcome back, {user?.userName}! 👋
                </Text>
                <Text className="text-sm text-muted-foreground font-medium mt-1">
                  ID: <Text className="font-bold text-foreground">{user?.studentId || 'N/A'}</Text>  |  Dept: <Text className="font-bold text-foreground">{formatDepartment(user?.department)}</Text>
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => fetchStudentData(true)}
              disabled={refreshing}
              className="rounded-xl flex-row items-center gap-2 bg-muted/20"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <Text className="font-semibold">Refresh Portal</Text>
            </Button>
          </View>

          {/* Semesters Selection Navigation Tab Bar */}
          <View className="gap-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Select Semester Session
            </Text>
            {semesters.length === 0 ? (
              <View className="rounded-2xl border border-dashed border-border p-6 bg-card">
                <Text className="text-sm text-muted-foreground italic text-center">No semesters enrolled.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                <View className="flex-row gap-2">
                  {semesters.map((sem, idx) => {
                    const isActive = selectedSemesterIdx === idx;
                    return (
                      <Pressable
                        key={sem.id}
                        onPress={() => setSelectedSemesterIdx(idx)}
                        className={`rounded-2xl px-5 py-3 border active:scale-95 transition-all shadow-sm ${
                          isActive
                            ? 'bg-primary border-primary'
                            : 'bg-card border-border hover:bg-muted/50'
                        }`}
                      >
                        <Text
                          className={`text-sm font-bold ${
                            isActive ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                        >
                          Level {sem.level} Semester {sem.semester}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {error ? (
            <View className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
              <Text className="text-center font-medium text-destructive">{error}</Text>
            </View>
          ) : null}

          {activeSemester ? (
            <View className="gap-6">
              
              {/* Analytics Header Grid */}
              <View className="flex-col gap-4 md:flex-row">
                <Card className="flex-1 rounded-2xl shadow-sm border-border bg-card">
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold text-muted-foreground">Total Enrolled Courses</CardTitle>
                    <View className="p-2 rounded-lg bg-blue-500/10">
                      <BookOpen size={16} className="text-blue-600" />
                    </View>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <Text className="text-3xl font-black tracking-tight">{activeSemester.courses.length}</Text>
                    <Text className="text-xs text-muted-foreground mt-1">Courses in this session</Text>
                  </CardContent>
                </Card>

                <Card className="flex-1 rounded-2xl shadow-sm border-border bg-card">
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold text-muted-foreground">Total Semester Credits</CardTitle>
                    <View className="p-2 rounded-lg bg-purple-500/10">
                      <Award size={16} className="text-purple-600" />
                    </View>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <Text className="text-3xl font-black tracking-tight">{totalCredits.toFixed(2)}</Text>
                    <Text className="text-xs text-muted-foreground mt-1">Earnable academic credits</Text>
                  </CardContent>
                </Card>

                <Card className="flex-1 rounded-2xl shadow-sm border-border bg-card">
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-bold text-muted-foreground">Average Attendance</CardTitle>
                    <View className={`p-2 rounded-lg ${overallAttendance >= 75 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                      <CheckCircle size={16} className={overallAttendance >= 75 ? 'text-emerald-600' : 'text-destructive'} />
                    </View>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <Text className={`text-3xl font-black tracking-tight ${overallAttendance >= 75 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {overallAttendance.toFixed(1)}%
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                      {overallAttendance >= 75 ? 'Meets university minimum (75%)' : 'Below mandatory minimum!'}
                    </Text>
                  </CardContent>
                </Card>
              </View>

              {/* Course breakdown layout */}
              <View className="gap-3">
                <Text className="text-lg font-black tracking-tight text-foreground px-1">
                  Course Sheets & Attendance Breakdown
                </Text>
                
                {activeSemester.courses.length === 0 ? (
                  <View className="rounded-3xl border border-dashed border-border p-12 bg-card items-center justify-center">
                    <Text className="text-muted-foreground font-medium italic">No courses in this semester session.</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap -mx-2">
                    {activeSemester.courses.map((item) => {
                      const creditsStr = item.course.credits.replace('CREDIT_', '').replace('_', '.');
                      const creditsVal = parseFloat(creditsStr) || 0.0;
                      const isLowAttendance = item.percentage < 75;

                      // Get initials for teacher avatar fallback
                      const getTeacherInitials = (tName: string) => {
                        return tName.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'T';
                      };

                      return (
                        <View 
                          key={item.id} 
                          style={{ 
                            width: width >= 1024 ? '33.33%' : width >= 768 ? '50%' : '100%', 
                            padding: 8 
                          }}
                        >
                          <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex-1 flex-col justify-between">
                            
                            {/* Card Header Info */}
                            <View className="p-5 border-b border-border/40">
                              <View className="flex-row justify-between items-start mb-2 gap-2">
                                <View className="rounded-xl bg-muted/60 px-2.5 py-1 border border-border/30">
                                  <Text className="text-[10px] font-bold text-foreground uppercase tracking-wider">{item.course.code}</Text>
                                </View>
                                <Text className="text-xs font-bold text-muted-foreground">{creditsVal.toFixed(2)} Credits</Text>
                              </View>
                              <Text className="text-base font-extrabold text-foreground leading-snug h-12 line-clamp-2" numberOfLines={2}>
                                {item.course.title}
                              </Text>
                            </View>

                            {/* Attendance Visual Details */}
                            <View className="p-5 bg-muted/10 flex-1">
                              <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-xs font-semibold text-muted-foreground">Attendance</Text>
                                <View className={`rounded-full px-2.5 py-0.5 ${isLowAttendance ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                                  <Text className={`text-xs font-bold ${isLowAttendance ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {item.percentage.toFixed(1)}%
                                  </Text>
                                </View>
                              </View>

                              {/* Progress bar */}
                              <View className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <View
                                  className={`h-full rounded-full ${isLowAttendance ? 'bg-destructive' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                                />
                              </View>

                              <Text className="text-xs font-medium text-muted-foreground mt-2">
                                Attended: <Text className="font-bold text-foreground">{item.presentCount}</Text> of <Text className="font-bold text-foreground">{item.totalClasses}</Text> classes
                              </Text>

                              {isLowAttendance && item.totalClasses > 0 ? (
                                <View className="mt-3 rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 flex-row items-start gap-2">
                                  <Text className="text-[11px] text-destructive font-bold leading-tight flex-1">
                                    ⚠️ Shortage Warning: Attend next lectures to make up the minimum 75%.
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Card Footer (Teacher Profile Info) */}
                            <View className="p-4 border-t border-border/40 bg-muted/20 flex-row items-center gap-3">
                              <View className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center">
                                <Text className="text-xs font-black text-primary">{getTeacherInitials(item.teacher.userName)}</Text>
                              </View>
                              <View className="flex-1">
                                <Text className="text-xs font-bold text-foreground leading-none" numberOfLines={1}>
                                  {item.teacher.userName}
                                </Text>
                                <Text className="text-[10px] text-muted-foreground mt-0.5" numberOfLines={1}>
                                  {item.teacher.email}
                                </Text>
                              </View>
                            </View>

                          </Card>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

            </View>
          ) : (
            <View className="rounded-3xl border border-dashed border-border p-12 bg-card items-center justify-center mt-6">
              <Text className="text-lg font-semibold text-muted-foreground italic">No semester data available.</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}