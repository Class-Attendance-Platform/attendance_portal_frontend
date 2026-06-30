import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  View,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { Search, Plus, X } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { StudentCard } from '@/components/custom/studentcard';
import { Student } from '@/types/student';
import { adminService, configService } from '@/lib/services';
import { LEVELS, SEMESTERS, Level, SemesterName } from '@/types/common';
import { webAlert } from '@/lib/utils';
import { ConfirmDialog } from '@/components/custom/confirm-dialog';

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

export default function StudentsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [students, setStudents] = useState<Student[]>([]);
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

  // Dynamic configuration states
  const [facultyMap, setFacultyMap] = useState<Record<string, string>>({});
  const [revFacultyMap, setRevFacultyMap] = useState<Record<string, string>>({});
  const [facultyOptions, setFacultyOptions] = useState<string[]>([]);

  const [deptMap, setDeptMap] = useState<Record<string, string>>({});
  const [revDeptMap, setRevDeptMap] = useState<Record<string, string>>({});
  const [deptOptions, setDeptOptions] = useState<string[]>([]);

  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [currentLevel, setCurrentLevel] = useState<Level>('First');
  const [currentSemester, setCurrentSemester] = useState<SemesterName>('I');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchConfig = async () => {
    try {
      const [facultiesRes, deptsRes] = await Promise.all([
        configService.getFaculties(),
        configService.getDepartments(),
      ]);
      if (facultiesRes.success && facultiesRes.faculties) {
        const map: Record<string, string> = {};
        const revMap: Record<string, string> = {};
        const options: string[] = [];
        facultiesRes.faculties.forEach((f: string) => {
          const h = humanize(f);
          map[h] = f;
          revMap[f] = h;
          options.push(h);
        });
        setFacultyMap(map);
        setRevFacultyMap(revMap);
        setFacultyOptions(options);
        setFaculty(options[0] || '');
      }
      if (deptsRes.success && deptsRes.departments) {
        const map: Record<string, string> = {};
        const revMap: Record<string, string> = {};
        const options: string[] = [];
        deptsRes.departments.forEach((d: string) => {
          const h = humanize(d);
          map[h] = d;
          revMap[d] = h;
          options.push(h);
        });
        setDeptMap(map);
        setRevDeptMap(revMap);
        setDeptOptions(options);
        setDepartment(options[0] || '');
      }
    } catch (e) {
      console.error('Error fetching config', e);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getStudents();
      if (res.success) {
        const mapped = (res.students || []).map((s: any) => ({
          ...s,
          studentId: s.studentId ?? s.student_id,
        }));
        setStudents(mapped);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = s.userName || '';
      const emailAddr = s.email || '';
      const query = searchQuery.toLowerCase();

      const matchSearch =
        name.toLowerCase().includes(query) ||
        emailAddr.toLowerCase().includes(query) ||
        (s.studentId !== undefined &&
          s.studentId !== null &&
          s.studentId.toString().includes(searchQuery));

      const matchFaculty =
        selectedFaculty === 'ALL' || revFacultyMap[s.faculty || ''] === selectedFaculty;
      const matchDept =
        selectedDepartment === 'ALL' || revDeptMap[s.department || ''] === selectedDepartment;
      const matchLevel = selectedLevel === 'ALL' || s.currentLevel === selectedLevel;
      const matchSemester = selectedSemester === 'ALL' || s.currentSemester === selectedSemester;

      return matchSearch && matchFaculty && matchDept && matchLevel && matchSemester;
    });
  }, [
    students,
    searchQuery,
    selectedFaculty,
    selectedDepartment,
    selectedLevel,
    selectedSemester,
    revFacultyMap,
    revDeptMap,
  ]);

  const numColumns = width >= 1024 ? 5 : width >= 768 ? 2 : 1;

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setUserName('');
    setEmail('');
    setStudentId('');
    setFaculty(facultyOptions[0] || '');
    setDepartment(deptOptions[0] || '');
    setCurrentLevel('First');
    setCurrentSemester('I');
    setPassword('');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (s: Student) => {
    setEditingStudent(s);
    setUserName(s.userName);
    setEmail(s.email);
    setStudentId(s.studentId?.toString() || '');
    setFaculty(revFacultyMap[s.faculty || ''] || facultyOptions[0] || '');
    setDepartment(revDeptMap[s.department || ''] || deptOptions[0] || '');
    setCurrentLevel(s.currentLevel as Level);
    setCurrentSemester(s.currentSemester as SemesterName);
    setPassword('');
    setError('');
    setModalOpen(true);
  };
  const handleSaveStudent = async () => {
    setSubmitting(true);
    setError('');
    const nameParts = userName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const body = {
      username: email,
      email,
      first_name: firstName,
      last_name: lastName,
      faculty: facultyMap[faculty] || faculty,
      department: deptMap[department] || department,
      student_id: studentId ? parseInt(studentId, 10) : undefined,
      current_level: currentLevel,
      current_semester: currentSemester,
      ...(password ? { password } : {}),
    };

    try {
      let res;
      if (editingStudent) {
        res = await adminService.updateStudent(editingStudent.id, body);
      } else {
        res = await adminService.createStudent(body);
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
    showConfirm(
      'Delete Student',
      'Are you sure you want to delete this student? This will remove all their enrollment data.',
      async () => {
        try {
          const res = await adminService.deleteStudent(id);
          if (res.success) {
            fetchStudents();
          }
        } catch (err: any) {
          setError(err.message || 'Failed to delete student.');
        }
      }
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
    <View className="flex-1 bg-background">
      <View className="z-10 border-b border-border bg-card">
        <View className="flex-row items-center gap-2 px-4 pb-2 pt-4">
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
            className="h-11 flex-row gap-2 rounded-xl px-4"
            onPress={handleOpenAddModal}>
            <Plus size={16} className="text-background" />
            <Text className="font-semibold">Add Student</Text>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-2 px-4 pb-3">
          <View className="min-w-[120px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Faculty
            </Label>
            <Dropdown
              value={selectedFaculty}
              onValueChange={setSelectedFaculty}
              options={['ALL', ...facultyOptions]}
            />
          </View>
          <View className="min-w-[120px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Department
            </Label>
            <Dropdown
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
              options={['ALL', ...deptOptions]}
            />
          </View>
          <View className="min-w-[100px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Level
            </Label>
            <Dropdown
              value={selectedLevel}
              onValueChange={setSelectedLevel}
              options={['ALL', ...LEVELS]}
            />
          </View>
          <View className="min-w-[100px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Semester
            </Label>
            <Dropdown
              value={selectedSemester}
              onValueChange={setSelectedSemester}
              options={['ALL', ...SEMESTERS]}
            />
          </View>
        </View>
      </View>

      {error ? (
        <View className="m-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
          <Text className="text-center text-sm font-medium text-destructive">{error}</Text>
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
              No students found matching your filters.
            </Text>
          </View>
        }
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <View className="mb-4 flex-row items-center justify-between border-b border-border/50 pb-3">
              <Text className="text-lg font-bold">
                {editingStudent ? 'Edit Student Details' : 'Register New Student'}
              </Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[70vh] gap-4 pr-1" showsVerticalScrollIndicator={true}>
              <View className="gap-1.5">
                <Label htmlFor="userName">Full Name</Label>
                <Input
                  id="userName"
                  placeholder="John Doe"
                  value={userName}
                  onChangeText={setUserName}
                />
              </View>

              <View className="gap-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  placeholder="john@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="gap-1.5">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  placeholder="2102001"
                  value={studentId}
                  onChangeText={setStudentId}
                  keyboardType="number-pad"
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Label>Faculty</Label>
                  <Dropdown
                    value={faculty}
                    onValueChange={setFaculty}
                    options={facultyOptions.length > 0 ? facultyOptions : [faculty]}
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label>Department</Label>
                  <Dropdown
                    value={department}
                    onValueChange={setDepartment}
                    options={deptOptions.length > 0 ? deptOptions : [department]}
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Label>Current Level</Label>
                  <Dropdown
                    value={currentLevel}
                    onValueChange={(val: any) => setCurrentLevel(val)}
                    options={LEVELS}
                  />
                </View>
                <View className="flex-1 gap-1.5">
                  <Label>Current Semester</Label>
                  <Dropdown
                    value={currentSemester}
                    onValueChange={(val: any) => setCurrentSemester(val)}
                    options={SEMESTERS}
                  />
                </View>
              </View>

              <View className="gap-1.5">
                <Label htmlFor="password">
                  {editingStudent ? 'Change Password (optional)' : 'Account Password'}
                </Label>
                <Input
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Button className="mt-4 w-full" onPress={handleSaveStudent} disabled={submitting}>
                <Text className="font-semibold text-primary-foreground">
                  {submitting
                    ? 'Saving...'
                    : editingStudent
                      ? 'Update Details'
                      : 'Register Student'}
                </Text>
              </Button>
            </ScrollView>
          </View>
        </View>
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
