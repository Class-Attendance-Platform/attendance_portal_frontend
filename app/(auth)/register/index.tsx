import { router } from 'expo-router';
import * as React from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Dropdown } from '@/components/custom/dropdown';
import { api } from '@/lib/api';

const ROLES = ['Student', 'Teacher', 'Admin'];

const FACULTIES = [
  'Computer Science and Engineering',
  'Business Studies',
  'Science',
  'Engineering',
  'Agriculture',
  'Fisheries',
  'Postgraduate Studies',
  'Social Science and Humanities',
  'Veterinary and Animal Science'
];

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Accounting',
  'Agricultural & Industrial Engineering',
  'Agricultural Chemistry',
  'Agronomy',
  'Animal Science & Nutrition',
  'Aquaculture',
  'Architecture',
  'Biochemistry & Molecular Biology',
  'Management',
  'Chemistry',
  'Civil Engineering',
  'Economics',
  'Electrical and Electronic Engineering',
  'Electronics and Communication Engineering',
  'English',
  'Fisheries Management',
  'Food Engineering & Technology',
  'Horticulture',
  'Marketing',
  'Mathematics',
  'Physics',
  'Sociology',
  'Statistics'
];

const LEVELS = ['First', 'Second', 'Third', 'Fourth'];
const SEMESTERS = ['I', 'II'];

const FACULTY_MAP: Record<string, string> = {
  'Agriculture': 'Agri',
  'Business Studies': 'BUSINESS_STUDIES',
  'Computer Science and Engineering': 'COMPUTER_SCIENCE_AND_ENGINEERING',
  'Engineering': 'ENGINEERING',
  'Fisheries': 'FISHERIES',
  'Postgraduate Studies': 'POSTGRADUATE_STUDIES',
  'Science': 'SCIENCE',
  'Social Science and Humanities': 'SOCIAL_SCIENCE_AND_HUMANITIES',
  'Veterinary and Animal Science': 'VETERINARY_AND_ANIMAL_SCIENCE'
};

const DEPT_MAP: Record<string, string> = {
  'Accounting': 'ACCOUNTING',
  'Agricultural & Industrial Engineering': 'AGRICULTURAL_AND_INDUSTRIAL_ENGINEERING',
  'Agricultural Chemistry': 'AGRICULTURAL_CHEMISTRY',
  'Agronomy': 'AGRONOMY',
  'Animal Science & Nutrition': 'ANIMAL_SCIENCE_AND_NUTRITION',
  'Aquaculture': 'AQUACULTURE',
  'Architecture': 'ARCHITECTURE',
  'Biochemistry & Molecular Biology': 'BIOCHEMISTRY_AND_MOLECULAR_BIOLOGY',
  'Management': 'BUSINESS_MANAGEMENT',
  'Chemistry': 'CHEMISTRY',
  'Civil Engineering': 'CIVIL_ENGINEERING',
  'Computer Science and Engineering': 'COMPUTER_SCIENCE_AND_ENGINEERING',
  'Economics': 'ECONOMICS',
  'Electrical and Electronic Engineering': 'ELECTRICAL_AND_ELECTRONIC_ENGINEERING',
  'Electronics and Communication Engineering': 'ELECTRONICS_AND_COMMUNICATION_ENGINEERING',
  'English': 'ENGLISH',
  'Fisheries Management': 'FISHERIES_MANAGEMENT',
  'Food Engineering & Technology': 'FOOD_ENGINEERING_AND_TECHNOLOGY',
  'Horticulture': 'HORTICULTURE',
  'Marketing': 'MARKETING',
  'Mathematics': 'MATHEMATICS',
  'Physics': 'PHYSICS',
  'Sociology': 'SOCIOLOGY',
  'Statistics': 'STATISTICS'
};

export default function SignUpScreen() {
  const [userName, setUserName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState('Student');
  const [selectedFaculty, setSelectedFaculty] = React.useState('Computer Science and Engineering');
  const [selectedDept, setSelectedDept] = React.useState('Computer Science and Engineering');
  
  const [studentId, setStudentId] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState('First');
  const [selectedSemester, setSelectedSemester] = React.useState('I');

  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const studentIdInputRef = React.useRef<TextInput>(null);

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
      faculty: FACULTY_MAP[selectedFaculty] || selectedFaculty,
      department: DEPT_MAP[selectedDept] || selectedDept,
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
      keyboardDismissMode="interactive"
    >
      <View className="w-full max-w-sm gap-6">
        <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5 rounded-2xl">
          <CardHeader className="items-center pb-2 mt-4">
            <Image
              source={require('@/assets/images/hstu.png')}
              style={{ width: 90, height: 90, marginBottom: 16 }}
              resizeMode="contain"
            />
            <CardTitle className="text-center text-2xl font-bold tracking-tight">
              Create an Account
            </CardTitle>
            <CardDescription className="text-center text-base mt-2">
              Join us today! Please fill in your details.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-5 pt-4">
            {error ? (
              <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                <Text className="text-destructive text-sm text-center font-medium">{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Text className="text-emerald-600 text-sm text-center font-medium">{success}</Text>
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
                onSubmitEditing={() => selectedRole === 'Student' ? studentIdInputRef.current?.focus() : undefined}
                editable={!isSubmitting}
              />
            </View>

            <View className="gap-2">
              <Label nativeID="roleLabel">Role</Label>
              <Dropdown
                value={selectedRole}
                onValueChange={setSelectedRole}
                options={ROLES}
              />
            </View>

            <View className="gap-2">
              <Label nativeID="facultyLabel">Faculty</Label>
              <Dropdown
                value={selectedFaculty}
                onValueChange={setSelectedFaculty}
                options={FACULTIES}
              />
            </View>

            <View className="gap-2">
              <Label nativeID="deptLabel">Department</Label>
              <Dropdown
                value={selectedDept}
                onValueChange={setSelectedDept}
                options={DEPARTMENTS}
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

            <Button 
              className="w-full mt-4" 
              size="lg" 
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text className="font-semibold">{isSubmitting ? 'Registering...' : 'Sign Up'}</Text>
            </Button>

            <View className="flex-row justify-center items-center mt-2">
              <Text className="text-sm text-muted-foreground">
                Already have an account?{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/login')}
                className="p-1 active:opacity-70"
              >
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