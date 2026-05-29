import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { FlatList, View, useWindowDimensions, ActivityIndicator, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Search, Plus, X } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Dropdown } from '@/components/custom/dropdown';
import { TeacherCard } from '@/components/custom/teachercard';
import { Teacher } from '@/types/teacher';
import { api } from '@/lib/api';

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
  const [faculty, setFaculty] = useState('COMPUTER_SCIENCE_AND_ENGINEERING');
  const [department, setDepartment] = useState('COMPUTER_SCIENCE_AND_ENGINEERING');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/teachers');
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
      const nameMatch = teacher.userName.toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFaculty = selectedFaculty === 'ALL' || teacher.faculty === selectedFaculty;
      const matchesDept = selectedDepartment === 'ALL' || teacher.department === selectedDepartment;
      
      return (nameMatch || emailMatch) && matchesFaculty && matchesDept;
    });
  }, [teachers, searchQuery, selectedFaculty, selectedDepartment]);

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setUserName('');
    setEmail('');
    setFaculty('COMPUTER_SCIENCE_AND_ENGINEERING');
    setDepartment('COMPUTER_SCIENCE_AND_ENGINEERING');
    setPassword('');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setUserName(teacher.userName);
    setEmail(teacher.email);
    setFaculty(teacher.faculty || 'COMPUTER_SCIENCE_AND_ENGINEERING');
    setDepartment(teacher.department || 'COMPUTER_SCIENCE_AND_ENGINEERING');
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
        faculty,
        department,
        password: password || undefined
      };

      if (editingTeacher) {
        res = await api.put(`/api/admin/teachers/${editingTeacher.id}`, body);
      } else {
        res = await api.post('/api/admin/teachers', body);
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
    Alert.alert(
      'Delete Teacher',
      'Are you sure you want to delete this teacher account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/api/admin/teachers/${id}`);
              if (res.success) {
                fetchTeachers();
              }
            } catch (err: any) {
              setError(err.message || 'Failed to delete teacher.');
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
        <Text className="mt-2 text-muted-foreground">Loading teachers list...</Text>
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
            className="h-11 px-4 rounded-xl flex-row gap-2"
            onPress={handleOpenAddModal}>
            <Plus size={16} />
            <Text className="font-semibold">Add Teacher</Text>
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
        </View>
      </View>

      {error ? (
        <View className="m-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
          <Text className="text-destructive text-sm text-center font-medium">{error}</Text>
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
          <View className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl">
            <View className="flex-row items-center justify-between border-b border-border/50 pb-3 mb-4">
              <Text className="text-lg font-bold">{editingTeacher ? 'Edit Teacher Details' : 'Register New Teacher'}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[60vh] gap-4 pr-1" showsVerticalScrollIndicator>
              <View className="gap-1.5 mb-2">
                <Label htmlFor="userName">Full Name</Label>
                <Input
                  id="userName"
                  placeholder="Dr. Aminul Islam"
                  value={userName}
                  onChangeText={setUserName}
                />
              </View>

              <View className="gap-1.5 mb-2">
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
                <Label htmlFor="password">{editingTeacher ? 'Reset Password (Optional)' : 'Default Password'}</Label>
                <Input
                  id="password"
                  placeholder={editingTeacher ? 'Leave blank to keep current' : '123456'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Button
                className="w-full mb-4"
                onPress={handleSaveTeacher}
                disabled={submitting}>
                <Text className="font-semibold text-primary-foreground">{submitting ? 'Saving...' : (editingTeacher ? 'Update Details' : 'Register Teacher')}</Text>
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
