import type { BaseUser } from "./user";

export interface Teacher extends BaseUser {
  role: 'TEACHER';
  employeeId: string;
  designation: string;
}