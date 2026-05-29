export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface BaseUser {
  id: string;
  userName: string;
  email: string;
  role: Role;
  faculty: string;
  department: string;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
}