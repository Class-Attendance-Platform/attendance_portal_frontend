import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle, CheckCircle, QrCode } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/AuthContext';
import { sessionService } from '@/lib/services';

export default function AttendanceSubmitScreen() {
  const params = useLocalSearchParams<{
    courseInfoId?: string | string[];
    sessionId?: string | string[];
    qrToken?: string | string[];
  }>();
  const { user, isLoading } = useAuth();
  const getParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
  const courseInfoId = useMemo(() => getParam(params.courseInfoId), [params.courseInfoId]);
  const sessionId = useMemo(() => {
    return getParam(params.sessionId);
  }, [params.sessionId]);
  const qrToken = useMemo(() => {
    const value = params.qrToken;
    return Array.isArray(value) ? value[0] : value;
  }, [params.qrToken]);

  const [studentId, setStudentId] = useState(user?.studentId?.toString() || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.studentId) {
      setStudentId(user.studentId.toString());
    }
  }, [user?.studentId]);

  const getBrowserDeviceId = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return 'app-0000000000000';
    }

    const key = 'attendance_device_id';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const bytes = new Uint8Array(7);
    window.crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const deviceId = `web${suffix}`;
    window.localStorage.setItem(key, deviceId);
    return deviceId;
  };

  const submitAttendance = async (idOverride?: number) => {
    if (!sessionId || !qrToken) {
      setError('This QR link is missing the course session.');
      return;
    }

    if (!user || user.role !== 'STUDENT') {
      setError('Please sign in with a student account before submitting attendance.');
      return;
    }

    const parsedStudentId = idOverride ?? Number.parseInt(studentId, 10);
    if (!Number.isFinite(parsedStudentId)) {
      setError('Enter a valid student ID.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await sessionService.submitAttendance(sessionId, parsedStudentId, qrToken, getBrowserDeviceId());
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Attendance submission failed. The session may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user?.role === 'STUDENT' && user.studentId && sessionId && qrToken && !submitted && !submitting) {
      submitAttendance(user.studentId);
    }
  }, [isLoading, user?.role, user?.studentId, sessionId, qrToken, submitted, submitting]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="flex-grow items-center justify-center bg-background p-4 py-8"
    >
      <View className="w-full max-w-sm">
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="items-center gap-3 pb-2">
            <View className={`rounded-full p-3 ${submitted ? 'bg-emerald-500/10' : 'bg-primary/10'}`}>
              {submitted ? (
                <CheckCircle size={32} className="text-emerald-600" />
              ) : (
                <QrCode size={32} className="text-primary" />
              )}
            </View>
            <CardTitle className="text-center text-xl font-bold">
              {submitted ? 'Attendance Submitted' : 'Class Check-in'}
            </CardTitle>
          </CardHeader>

          <CardContent className="gap-5 pt-4">
            {submitted ? (
              <View className="gap-4">
                <Text className="text-center text-sm text-muted-foreground">
                  Your attendance was recorded for the active session.
                </Text>
                <Button onPress={() => router.replace('/dashboard/student')}>
                  <Text className="font-semibold">Open Dashboard</Text>
                </Button>
              </View>
            ) : (
              <>
                {isLoading || submitting ? (
                  <View className="items-center gap-3 py-3">
                    <ActivityIndicator size="large" />
                    <Text className="text-sm text-muted-foreground">
                      {isLoading ? 'Checking login status...' : 'Submitting attendance...'}
                    </Text>
                  </View>
                ) : null}

                {error ? (
                  <View className="flex-row gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                    <AlertCircle size={16} className="mt-0.5 text-destructive" />
                    <Text className="flex-1 text-sm font-medium text-destructive">{error}</Text>
                  </View>
                ) : null}

                {!submitting && (
                  <View className="gap-4">
                    <View className="gap-2">
                      <Label nativeID="studentIdLabel" htmlFor="studentId">
                        Student ID
                      </Label>
                      <Input
                        id="studentId"
                        value={studentId}
                        onChangeText={setStudentId}
                        keyboardType="number-pad"
                        placeholder="2302001"
                        editable={!submitting}
                        onSubmitEditing={() => submitAttendance()}
                        submitBehavior="submit"
                      />
                    </View>
                    <Button onPress={() => submitAttendance()} disabled={submitting || !sessionId || !qrToken}>
                      <Text className="font-semibold">Submit Attendance</Text>
                    </Button>
                  </View>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
