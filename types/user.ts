export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface BaseUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  isActive: boolean;
  role: Role;
}