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
import { TeacherCard } from '@/components/custom/teachercard';
import { Teacher } from '@/types/teacher';
import { adminService, configService } from '@/lib/services';

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

export default function TeachersScreen() {
  const { width } = useWindowDimensions();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');

  // Dynamic configuration states
  const [facultyMap, setFacultyMap] = useState<Record<string, string>>({});
  const [revFacultyMap, setRevFacultyMap] = useState<Record<string, string>>({});
  const [facultyOptions, setFacultyOptions] = useState<string[]>([]);

  const [deptMap, setDeptMap] = useState<Record<string, string>>({});
  const [revDeptMap, setRevDeptMap] = useState<Record<string, string>>({});
  const [deptOptions, setDeptOptions] = useState<string[]>([]);

  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
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
    } catch (err: any) {
      console.error('Failed to load teachers configuration:', err);
    }
  };

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getTeachers();
      if (res.success) {
        setTeachers(res.teachers || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch teachers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchTeachers();
  }, []);

  const numColumns = useMemo(() => {
    if (width >= 1440) return 5;
    if (width >= 1150) return 4;
    if (width >= 850) return 3;
    if (width >= 580) return 2;
    return 1;
  }, [width]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const name = teacher.userName || '';
      const emailAddr = teacher.email || '';
      const query = searchQuery.toLowerCase();

      const nameMatch = name.toLowerCase().includes(query);
      const emailMatch = emailAddr.toLowerCase().includes(query);

      const rawSelFaculty = facultyMap[selectedFaculty] || selectedFaculty;
      const matchesFaculty = selectedFaculty === 'ALL' || teacher.faculty === rawSelFaculty;

      const rawSelDept = deptMap[selectedDepartment] || selectedDepartment;
      const matchesDept = selectedDepartment === 'ALL' || teacher.department === rawSelDept;

      return (nameMatch || emailMatch) && matchesFaculty && matchesDept;
    });
  }, [teachers, searchQuery, selectedFaculty, selectedDepartment, facultyMap, deptMap]);

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setUserName('');
    setEmail('');
    setFaculty(facultyOptions[0] || '');
    setDepartment(deptOptions[0] || '');
    setPassword('');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setUserName(teacher.userName);
    setEmail(teacher.email);
    setFaculty(revFacultyMap[teacher.faculty] || teacher.faculty);
    setDepartment(revDeptMap[teacher.department] || teacher.department);
    setPassword('');
    setError('');
    setModalOpen(true);
  };

  const handleSaveTeacher = async () => {
    if (!userName || !email) {
      setError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let res;
      const body = {
        userName,
        email,
        faculty: facultyMap[faculty] || faculty,
        department: deptMap[department] || department,
        password: password || undefined,
      };

      if (editingTeacher) {
        res = await adminService.updateTeacher(editingTeacher.id, body);
      } else {
        res = await adminService.createTeacher(body);
      }

      if (res.success) {
        setModalOpen(false);
        fetchTeachers();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = (id: string) => {
    Alert.alert('Delete Teacher', 'Are you sure you want to delete this teacher account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await adminService.deleteTeacher(id);
            if (res.success) {
              fetchTeachers();
            }
          } catch (err: any) {
            setError(err.message || 'Failed to delete teacher.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-muted-foreground">Loading teachers list...</Text>
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
              placeholder="Search teachers by name or email..."
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
            <Plus size={16} />
            <Text className="font-semibold">Add Teacher</Text>
          </Button>
        </View>

        <View className="flex-row flex-wrap gap-3 px-4 pb-3">
          <View className="min-w-[140px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Faculty
            </Label>
            <Dropdown
              value={selectedFaculty}
              onValueChange={setSelectedFaculty}
              options={['ALL', ...facultyOptions]}
            />
          </View>
          <View className="min-w-[140px] flex-1">
            <Label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Department
            </Label>
            <Dropdown
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
              options={['ALL', ...deptOptions]}
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
        data={filteredTeachers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ flex: 1, padding: 4, maxWidth: `${100 / numColumns}%` }}>
            <TeacherCard
              teacher={item}
              onEdit={() => handleOpenEditModal(item)}
              onDelete={() => handleDeleteTeacher(item.id)}
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
              No teachers found.
            </Text>
          </View>
        }
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl">
            <View className="mb-4 flex-row items-center justify-between border-b border-border/50 pb-3">
              <Text className="text-lg font-bold">
                {editingTeacher ? 'Edit Teacher Details' : 'Register New Teacher'}
              </Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[60vh] gap-4 pr-1" showsVerticalScrollIndicator>
              <View className="mb-2 gap-1.5">
                <Label htmlFor="userName">Full Name</Label>
                <Input
                  id="userName"
                  placeholder="Dr. Aminul Islam"
                  value={userName}
                  onChangeText={setUserName}
                />
              </View>

              <View className="mb-2 gap-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  placeholder="teacher@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View className="mb-2 gap-1.5">
                <Label>Faculty</Label>
                <Dropdown
                  value={faculty}
                  onValueChange={setFaculty}
                  options={facultyOptions.length > 0 ? facultyOptions : [faculty]}
                />
              </View>

              <View className="mb-2 gap-1.5">
                <Label>Department</Label>
                <Dropdown
                  value={department}
                  onValueChange={setDepartment}
                  options={deptOptions.length > 0 ? deptOptions : [department]}
                />
              </View>

              <View className="mb-4 gap-1.5">
                <Label htmlFor="password">
                  {editingTeacher ? 'Reset Password (Optional)' : 'Default Password'}
                </Label>
                <Input
                  id="password"
                  placeholder={editingTeacher ? 'Leave blank to keep current' : '123456'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Button className="mb-4 w-full" onPress={handleSaveTeacher} disabled={submitting}>
                <Text className="font-semibold text-primary-foreground">
                  {submitting
                    ? 'Saving...'
                    : editingTeacher
                      ? 'Update Details'
                      : 'Register Teacher'}
                </Text>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
