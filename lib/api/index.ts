// The API layer. Screens import from here (or the area files) only.
// Contract: attendance_portal_backend/docs/api-v2.md.
export { ApiError, isApiError, API_BASE, WEB_BASE } from './client';
export type { FieldErrors } from './client';
export * from './types';
export * from './auth';
export * from './config';
export * from './student';
export * from './teacher';
export * from './sessions';
export * from './admin';
export * from './faces';
export * from './reports';
