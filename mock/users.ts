import type { Teacher } from "@/types/teacher";
import type { Student } from "@/types/student";

export const MOCK_TEACHERS: Teacher[] = [
  {
    id: 't1',
    employeeId: 'EMP-001',
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan.turing@university.edu',
    department: 'CSE',
    designation: 'Professor',
    isActive: true,
    role: 'TEACHER',
  },
  {
    id: 't2',
    employeeId: 'EMP-002',
    firstName: 'Marie',
    lastName: 'Curie',
    email: 'marie.curie@university.edu',
    department: 'Physics',
    designation: 'Associate Professor',
    isActive: true,
    role: 'TEACHER',
  },
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: 's1',
    studentId: 'S-2024-001',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice.smith@student.edu',
    department: 'CSE',
    batchYear: 2024,
    isActive: true,
    role: 'STUDENT',
  },
  {
    id: 's2',
    studentId: 'S-2025-042',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@student.edu',
    department: 'Mathematics',
    batchYear: 2025,
    isActive: true,
    role: 'STUDENT',
  },
];