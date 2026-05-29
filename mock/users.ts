import type { Teacher } from "@/types/teacher";
import type { Student } from "@/types/student";

export const MOCK_TEACHERS: Teacher[] = [
  {
    id: 't1',
    userName: 'Alan Turing',
    email: 'alan.turing@university.edu',
    department: 'CSE',
    faculty: 'COMPUTER_SCIENCE_AND_ENGINEERING',
    designation: 'Professor',
    isActive: true,
    role: 'TEACHER',
  },
  {
    id: 't2',
    userName: 'Marie Curie',
    email: 'marie.curie@university.edu',
    department: 'Physics',
    faculty: 'COMPUTER_SCIENCE_AND_ENGINEERING',
    designation: 'Associate Professor',
    isActive: true,
    role: 'TEACHER',
  },
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: 's1',
    studentId: 2402001,
    userName: 'Alice Smith',
    email: 'alice.smith@student.edu',
    department: 'CSE',
    faculty: 'COMPUTER_SCIENCE_AND_ENGINEERING',
    batchYear: 2024,
    currentLevel: 'First',
    currentSemester: 'I',
    isActive: true,
    role: 'STUDENT',
  },
  {
    id: 's2',
    studentId: 2502042,
    userName: 'Bob Johnson',
    email: 'bob.johnson@student.edu',
    department: 'Mathematics',
    faculty: 'COMPUTER_SCIENCE_AND_ENGINEERING',
    batchYear: 2025,
    currentLevel: 'First',
    currentSemester: 'I',
    isActive: true,
    role: 'STUDENT',
  },
];