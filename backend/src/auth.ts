import * as crypto from 'crypto';
import { prisma } from './db';

const SALT = "HSTU_CSE_23";

export function encryptPassword(password: string): string {
  const salted = SALT + password;
  return crypto.createHash('sha256').update(salted, 'utf8').digest('hex');
}

export async function getValidUser(usernameOrEmail: string, password: string): Promise<any | null> {
  const encrypted = encryptPassword(password);

  const student = await prisma.student.findFirst({
    where: {
      deleted: false,
      OR: [
        { userName: usernameOrEmail },
        { email: usernameOrEmail }
      ],
      passwordHash: encrypted
    }
  });
  if (student) return { ...student, role: 'STUDENT' };

  const teacher = await prisma.teacher.findFirst({
    where: {
      deleted: false,
      OR: [
        { userName: usernameOrEmail },
        { email: usernameOrEmail }
      ],
      passwordHash: encrypted
    }
  });
  if (teacher) return { ...teacher, role: 'TEACHER' };

  const admin = await prisma.admin.findFirst({
    where: {
      deleted: false,
      OR: [
        { userName: usernameOrEmail },
        { email: usernameOrEmail }
      ],
      passwordHash: encrypted
    }
  });
  if (admin) return { ...admin, role: 'ADMIN' };

  return null;
}

export interface RegisterUserDto {
  userName: string;
  email: string;
  password: string;
  role?: string;
  faculty?: string;
  department?: string;
  currentLevel?: string;
  currentSemester?: string;
  studentId?: string | number;
}

export interface RegisterUserResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    userName: string;
    email: string;
    role: string;
  };
}

export async function registerUser(userData: RegisterUserDto): Promise<RegisterUserResponse> {
  const role = (userData.role || 'student').toLowerCase();

  const validRoles = ['student', 'teacher', 'admin'];
  if (!validRoles.includes(role)) {
    return { success: false, message: "Invalid role specified." };
  }

  const duplicateStudent = await prisma.student.findFirst({
    where: {
      deleted: false,
      OR: [
        { userName: userData.userName },
        { email: userData.email }
      ]
    }
  });

  const duplicateTeacher = await prisma.teacher.findFirst({
    where: {
      deleted: false,
      OR: [
        { userName: userData.userName },
        { email: userData.email }
      ]
    }
  });

  const duplicateAdmin = await prisma.admin.findFirst({
    where: {
      deleted: false,
      OR: [
        { userName: userData.userName },
        { email: userData.email }
      ]
    }
  });

  if (duplicateStudent || duplicateTeacher || duplicateAdmin) {
    return { success: false, message: "Username or Email already exists." };
  }

  const passwordHash = encryptPassword(userData.password);

  switch (role) {
    case 'student': {
      const studentId = typeof userData.studentId === 'number' 
        ? userData.studentId 
        : parseInt(userData.studentId || '0', 10) || 0;

      if (studentId > 0) {
        const duplicateId = await prisma.student.findFirst({
          where: { studentId, deleted: false }
        });
        if (duplicateId) {
          return { success: false, message: "Student ID already exists." };
        }
      }

      const student = await prisma.student.create({
        data: {
          userName: userData.userName,
          email: userData.email,
          passwordHash,
          role: 'student',
          faculty: userData.faculty || '',
          department: userData.department || '',
          currentLevel: userData.currentLevel || 'First',
          currentSemester: userData.currentSemester || 'I',
          studentId
        }
      });

      return { 
        success: true, 
        user: { 
          id: student.id, 
          userName: student.userName, 
          email: student.email, 
          role: 'STUDENT' 
        } 
      };
    }
    case 'teacher': {
      const teacher = await prisma.teacher.create({
        data: {
          userName: userData.userName,
          email: userData.email,
          passwordHash,
          role: 'teacher',
          faculty: userData.faculty || '',
          department: userData.department || ''
        }
      });

      return { 
        success: true, 
        user: { 
          id: teacher.id, 
          userName: teacher.userName, 
          email: teacher.email, 
          role: 'TEACHER' 
        } 
      };
    }
    case 'admin': {
      const admin = await prisma.admin.create({
        data: {
          userName: userData.userName,
          email: userData.email,
          passwordHash,
          role: 'admin',
          faculty: userData.faculty || '',
          department: userData.department || ''
        }
      });

      return { 
        success: true, 
        user: { 
          id: admin.id, 
          userName: admin.userName, 
          email: admin.email, 
          role: 'ADMIN' 
        } 
      };
    }
    default:
      return { success: false, message: "Invalid role specified." };
  }
}