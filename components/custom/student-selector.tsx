import * as React from 'react';
import { useState, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Search, Check, Users } from 'lucide-react-native';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Student } from '@/types/student';

interface StudentSelectorProps {
  students: Student[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxHeight?: number;
}

export function StudentSelector({ students, selectedIds, onToggle, maxHeight = 128 }: StudentSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.userName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toString().includes(search) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [students, search]);

  return (
    <View className="gap-2">
      <View className="flex-row items-center bg-muted/20 border border-border/60 rounded-xl px-2.5 py-1.5">
        <Search size={14} className="text-muted-foreground mr-2" />
        <Input
          placeholder="Search students..."
          value={search}
          onChangeText={setSearch}
          className="text-xs font-semibold text-foreground p-0 h-6 border-0 bg-transparent flex-1"
        />
      </View>
      
      <View style={{ maxHeight }} className="border border-border rounded-2xl p-2 bg-muted/5">
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {filteredStudents.length === 0 ? (
            <Text className="text-[10px] text-muted-foreground italic text-center py-4">No students found</Text>
          ) : (
            filteredStudents.map(s => {
              const isSelected = selectedIds.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => onToggle(s.id)}
                  className={`p-2.5 rounded-xl mb-1.5 flex-row justify-between items-center border ${
                    isSelected ? 'bg-primary/10 border-primary/25' : 'bg-card border-transparent'
                  }`}
                >
                  <View>
                    <Text className="text-xs font-bold text-foreground">
                      {s.userName}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      ID: {s.studentId} • {s.department?.split('_').map(w => w[0]).join('') || 'N/A'}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="bg-primary rounded-full p-0.5">
                      <Check size={10} className="text-primary-foreground" />
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[10px] text-muted-foreground font-bold">
          {selectedIds.length} students selected
        </Text>
        <Pressable onPress={() => {
           // Toggle all filtered students? Maybe just a clear button.
        }}>
           {/* <Text className="text-[10px] text-primary font-bold">Select All</Text> */}
        </Pressable>
      </View>
    </View>
  );
}
