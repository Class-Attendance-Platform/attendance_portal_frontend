import { router } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Dropdown } from '@/components/custom/dropdown';
import { api } from '@/lib/api';

const ROLES = ['Student', 'Teacher', 'Admin'];

const LEVELS = ['First', 'Second', 'Third', 'Fourth'];
const SEMESTERS = ['I', 'II'];

function humanize(str: string): string {
  if (!str) return '';
  return str
    .split('_')
    .map((word) => {
      if (word === 'AND') return 'and';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export default function SignUpScreen() {
  const [userName, setUserName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState('Student');

  const [facultyMap, setFacultyMap] = React.useState<Record<string, string>>({});
  const [deptMap, setDeptMap] = React.useState<Record<string, string>>({});
  const [facultyOptions, setFacultyOptions] = React.useState<string[]>([]);
  const [deptOptions, setDeptOptions] = React.useState<string[]>([]);

  const [selectedFaculty, setSelectedFaculty] = React.useState('');
  const [selectedDept, setSelectedDept] = React.useState('');

  const [studentId, setStudentId] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState('First');
  const [selectedSemester, setSelectedSemester] = React.useState('I');

  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const studentIdInputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    async function loadConfig() {
      try {
        const [facRes, deptRes] = await Promise.all([
          api.get('/api/config/faculties'),
          api.get('/api/config/departments'),
        ]);

        if (facRes.success && facRes.faculties) {
          const map: Record<string, string> = {};
          const options: string[] = [];
          facRes.faculties.forEach((f: string) => {
            const h = humanize(f);
            map[h] = f;
            options.push(h);
          });
          setFacultyMap(map);
          setFacultyOptions(options);
          if (options.length > 0) {
            setSelectedFaculty(options[0]);
          }
        }

        if (deptRes.success && deptRes.departments) {
          const map: Record<string, string> = {};
          const options: string[] = [];
          deptRes.departments.forEach((d: string) => {
            const h = humanize(d);
            map[h] = d;
            options.push(h);
          });
          setDeptMap(map);
          setDeptOptions(options);
          if (options.length > 0) {
            setSelectedDept(options[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load register configuration', err);
      }
    }
    loadConfig();
  }, []);

  async function onSubmit() {
    if (!userName || !email || !password) {
      setError('Please fill in all general fields.');
      return;
    }

    if (selectedRole === 'Student' && !studentId) {
      setError('Please enter your Student ID.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const payload = {
      userName,
      email,
      password,
      role: selectedRole.toLowerCase(),
      faculty: facultyMap[selectedFaculty] || selectedFaculty,
      department: deptMap[selectedDept] || selectedDept,
      studentId: selectedRole === 'Student' ? parseInt(studentId, 10) : undefined,
      currentLevel: selectedRole === 'Student' ? selectedLevel : undefined,
      currentSemester: selectedRole === 'Student' ? selectedSemester : undefined,
    };

    try {
      const res = await api.post('/api/auth/register', payload);
      if (res.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 1500);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="flex-grow items-center justify-center p-4 py-8 sm:p-6 mt-safe"
      keyboardDismissMode="interactive">
      <View className="w-full max-w-sm gap-6">
        <Card className="rounded-2xl border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
          <CardHeader className="mt-4 items-center pb-2">
            <Image
              source={require('@/assets/images/hstu.png')}
              style={{ width: 90, height: 90, marginBottom: 16 }}
              resizeMode="contain"
            />
            <CardTitle className="text-center text-2xl font-bold tracking-tight">
              Create an Account
            </CardTitle>
            <CardDescription className="mt-2 text-center text-base">
              Join us today! Please fill in your details.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-5 pt-4">
            {error ? (
              <View className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                <Text className="text-center text-sm font-medium text-destructive">{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <Text className="text-center text-sm font-medium text-emerald-600">{success}</Text>
              </View>
            ) : null}

            <View className="gap-2">
              <Label nativeID="nameLabel" htmlFor="name">
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={userName}
                onChangeText={setUserName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                submitBehavior="submit"
                editable={!isSubmitting}
              />
            </View>

            <View className="gap-2">
              <Label nativeID="emailLabel" htmlFor="email">
                Email Address
              </Label>
              <Input
                ref={emailInputRef}
                id="email"
                placeholder="m@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                submitBehavior="submit"
                editable={!isSubmitting}
              />
            </View>

            <View className="gap-2">
              <Label nativeID="passwordLabel" htmlFor="password">
                Password
              </Label>
              <Input
                ref={passwordInputRef}
                id="password"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                onSubmitEditing={() =>
                  selectedRole === 'Student' ? studentIdInputRef.current?.focus() : undefined
                }
                editable={!isSubmitting}
              />
            </View>

            <View className="gap-2">
              <Label nativeID="roleLabel">Role</Label>
              <Dropdown value={selectedRole} onValueChange={setSelectedRole} options={ROLES} />
            </View>

            <View className="gap-2">
              <Label nativeID="facultyLabel">Faculty</Label>
              <Dropdown
                value={selectedFaculty}
                onValueChange={setSelectedFaculty}
                options={facultyOptions.length > 0 ? facultyOptions : [selectedFaculty]}
              />
            </View>

            <View className="gap-2">
              <Label nativeID="deptLabel">Department</Label>
              <Dropdown
                value={selectedDept}
                onValueChange={setSelectedDept}
                options={deptOptions.length > 0 ? deptOptions : [selectedDept]}
              />
            </View>

            {selectedRole === 'Student' && (
              <View className="gap-4 border-t border-border/50 pt-4">
                <View className="gap-2">
                  <Label nativeID="studentIdLabel" htmlFor="studentId">
                    Student ID
                  </Label>
                  <Input
                    ref={studentIdInputRef}
                    id="studentId"
                    placeholder="2302000"
                    value={studentId}
                    onChangeText={setStudentId}
                    keyboardType="numeric"
                    returnKeyType="done"
                    editable={!isSubmitting}
                  />
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1 gap-2">
                    <Label nativeID="levelLabel">Level</Label>
                    <Dropdown
                      value={selectedLevel}
                      onValueChange={setSelectedLevel}
                      options={LEVELS}
                    />
                  </View>
                  <View className="flex-1 gap-2">
                    <Label nativeID="semesterLabel">Semester</Label>
                    <Dropdown
                      value={selectedSemester}
                      onValueChange={setSelectedSemester}
                      options={SEMESTERS}
                    />
                  </View>
                </View>
              </View>
            )}

            <Button className="mt-4 w-full" size="lg" onPress={onSubmit} disabled={isSubmitting}>
              <Text className="font-semibold">{isSubmitting ? 'Registering...' : 'Sign Up'}</Text>
            </Button>

            <View className="mt-2 flex-row items-center justify-center">
              <Text className="text-sm text-muted-foreground">Already have an account? </Text>
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                className="p-1 active:opacity-70">
                <Text className="text-sm font-semibold text-primary underline underline-offset-4">
                  Sign in
                </Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
