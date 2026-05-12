import type { BaseUser } from "./user";

export interface Student extends BaseUser {
  role: 'STUDENT';
  studentId: string;
  batchYear: number;
}