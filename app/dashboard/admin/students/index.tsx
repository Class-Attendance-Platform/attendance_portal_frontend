import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { FlatList, View, useWindowDimensions, ActivityIndicator, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Search, Plus, X } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { StudentCard } from '@/components/custom/studentcard';
import { Student } from '@/types/student';
import { api } from '@/lib/api';
import { LEVELS, SEMESTERS, Level, SemesterName } from '@/types/common';

const FACULTIES = [
  'COMPUTER_SCIENCE_AND_ENGINEERING',
  'ENGINEERING',
  'AGRICULTURE',
  'BUSINESS_STUDIES'
];
const DEPARTMENTS = [
  'COMPUTER_SCIENCE_AND_ENGINEERING',
  'INFORMATION_AND_COMMUNICATION_TECHNOLOGY',
  'ELECTRICAL_AND_ELECTRONIC_ENGINEERING',
  'AGRICULTURE_CHEMISTRY'
];


export default function StudentsScreen() {
  const { width } = useWindowDimensions();


  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [faculty, setFaculty] = useState('COMPUTER_SCIENCE_AND_ENGINEERING');
  const [department, setDepartment] = useState('COMPUTER_SCIENCE_AND_ENGINEERING');
  const [currentLevel, setCurrentLevel] = useState<Level>('First');
  const [currentSemester, setCurrentSemester] = useState<SemesterName>('I');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/students');
      if (res.success) {
        setStudents(res.students || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const numColumns = useMemo(() => {
    if (width >= 1440) return 5;
    if (width >= 1150) return 4;
    if (width >= 850) return 3;
    if (width >= 580) return 2;
    return 1;
  }, [width]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const nameMatch = student.userName.toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = student.email.toLowerCase().includes(searchQuery.toLowerCase());
      const idMatch = student.studentId.toString().includes(searchQuery);
      
      const matchesFaculty = selectedFaculty === 'ALL' || student.faculty === selectedFaculty;
      const matchesDept = selectedDepartment === 'ALL' || student.department === selectedDepartment;
      const matchesLevel = selectedLevel === 'ALL' || student.currentLevel === selectedLevel;
      const matchesSemester = selectedSemester === 'ALL' || student.currentSemester === selectedSemester;
      
      return (nameMatch || emailMatch || idMatch) && matchesFaculty && matchesDept && matchesLevel && matchesSemester;
    });
  }, [students, searchQuery, selectedFaculty, selectedDepartment, selectedLevel, selectedSemester]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setUserName('');
    setEmail('');
    setStudentId('');
    setFaculty('COMPUTER_SCIENCE_AND_ENGINEERING');
    setDepartment('COMPUTER_SCIENCE_AND_ENGINEERING');
    setCurrentLevel('First');
    setCurrentSemester('I');
    setPassword('');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setUserName(student.userName);
    setEmail(student.email);
    setStudentId(student.studentId.toString());
    setFaculty(student.faculty || 'COMPUTER_SCIENCE_AND_ENGINEERING');
    setDepartment(student.department || 'COMPUTER_SCIENCE_AND_ENGINEERING');
    setCurrentLevel(student.currentLevel || 'First');
    setCurrentSemester(student.currentSemester || 'I');
    setPassword('');
    setError('');
    setModalOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!userName || !email || !studentId) {
      setError('Name, email and Student ID are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let res;
      const body = {
        userName,
        email,
        studentId: parseInt(studentId, 10),
        faculty,
        department,
        currentLevel,
        currentSemester,
        password: password || undefined
      };

      if (editingStudent) {
        res = await api.put(`/api/admin/students/${editingStudent.id}`, body);
      } else {
        res = await api.post('/api/admin/students', body);
      }

      if (res.success) {
        setModalOpen(false);
        fetchStudents();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = (id: string) => {
    Alert.alert(
      'Delete Student',
      'Are you sure you want to delete this student account? This will unenroll them from all course sheets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/api/admin/students/${id}`);
              if (res.success) {
                fetchStudents();
              }
            } catch (err: any) {
              setError(err.message || 'Failed to delete student.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-muted-foreground">Loading students list...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background md:pr-64 lg:pr-64">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row items-center gap-2 px-4 pt-4 pb-2">
          <View className="relative flex-1 justify-center">
            <Search size={18} className="absolute left-3 z-10 text-muted-foreground" />
            <Input
              placeholder="Search students by name, email or ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="h-11 rounded-xl border-transparent bg-muted/50 pl-10 pr-4 focus:border-primary"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Button
            variant="default"
            className="h-11 px-4 rounded-xl flex-row gap-2"
            onPress={handleOpenAddModal}>
            <Plus size={16} />
            <Text className="font-semibold">Add Student</Text>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-3 px-4 pb-3">
          <View className="flex-1 min-w-[140px]">
            <Label className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Faculty</Label>
            <Dropdown
              value={selectedFaculty}
              onValueChange={setSelectedFaculty}
              options={['ALL', ...FACULTIES]}
            />
          </View>
          <View className="flex-1 min-w-[140px]">
            <Label className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Department</Label>
            <Dropdown
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
              options={['ALL', ...DEPARTMENTS]}
            />
          </View>
          <View className="flex-1 min-w-[80px]">
            <Label className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Level</Label>
            <Dropdown
              value={selectedLevel}
              onValueChange={setSelectedLevel}
              options={['ALL', ...LEVELS]}
            />
          </View>
          <View className="flex-1 min-w-[80px]">
            <Label className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-bold">Semester</Label>
            <Dropdown
              value={selectedSemester}
              onValueChange={setSelectedSemester}
              options={['ALL', ...SEMESTERS]}
            />
          </View>
        </View>
      </View>

      {error ? (
        <View className="m-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <Text className="text-destructive text-sm text-center font-medium">{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ flex: 1, padding: 4, maxWidth: `${100 / numColumns}%` }}>
            <StudentCard
              student={item}
              onEdit={() => handleOpenEditModal(item)}
              onDelete={() => handleDeleteStudent(item.id)}
            />
          </View>
        )}
        numColumns={numColumns}
        key={numColumns}
        contentContainerClassName="p-2 pb-8"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-10 flex-1 items-center justify-center p-8">
            <Text className="text-center text-lg font-semibold text-foreground">
              No students found.
            </Text>
          </View>
        }
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl max-h-[90%]">
            <View className="flex-row items-center justify-between border-b border-border/50 pb-3 mb-4">
              <Text className="text-lg font-bold">{editingStudent ? 'Edit Student Details' : 'Register New Student'}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <ScrollView className="gap-4 pr-1" showsVerticalScrollIndicator>
              <View className="gap-1.5 mb-2">
                <Label htmlFor="userName">Full Name</Label>
                <Input
                  id="userName"
                  placeholder="Tasnim Rahman"
                  value={userName}
                  onChangeText={setUserName}
                />
              </View>

              <View className="gap-1.5 mb-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  placeholder="student@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View className="gap-1.5 mb-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  placeholder="2302001"
                  value={studentId}
                  onChangeText={setStudentId}
                  keyboardType="number-pad"
                />
              </View>

              <View className="flex-row gap-2 mb-2">
                <View className="flex-1 gap-1.5">
                  <Label>Level</Label>
                  <Dropdown
                    value={currentLevel}
                    onValueChange={setCurrentLevel}
                    options={LEVELS}
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label>Semester</Label>
                  <Dropdown
                    value={currentSemester}
                    onValueChange={setCurrentSemester}
                    options={SEMESTERS}
                  />
                </View>
              </View>

              <View className="gap-1.5 mb-2">
                <Label>Faculty</Label>
                <Dropdown
                  value={faculty}
                  onValueChange={setFaculty}
                  options={FACULTIES}
                />
              </View>

              <View className="gap-1.5 mb-2">
                <Label>Department</Label>
                <Dropdown
                  value={department}
                  onValueChange={setDepartment}
                  options={DEPARTMENTS}
                />
              </View>

              <View className="gap-1.5 mb-4">
                <Label htmlFor="password">{editingStudent ? 'Reset Password (Optional)' : 'Default Password'}</Label>
                <Input
                  id="password"
                  placeholder={editingStudent ? 'Leave blank to keep current' : '123456'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Button
                className="w-full mb-4"
                onPress={handleSaveStudent}
                disabled={submitting}>
                <Text className="font-semibold text-primary-foreground">{submitting ? 'Saving...' : (editingStudent ? 'Update Details' : 'Register Student')}</Text>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
