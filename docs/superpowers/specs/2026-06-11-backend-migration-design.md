# Design Spec: Frontend Migration to Django Backend

## 1. Overview
This document outlines the changes required to migrate the React Native/Expo frontend from the Node/Express backend (`old_backend`) to the new Django REST Framework backend (`new_backend`).

The goal is to ensure full compatibility while adhering to the `django.md` blueprint and minimizing changes to the frontend UI components.

## 2. Approach: Backend Alignment
We will prioritize modifying the `new_backend` to match the frontend's expectations and the blueprint. This ensures the backend remains a drop-in replacement where possible.

### 2.1 Backend Changes
- **Authentication**:
  - Update `apps.users.views.auth.LoginView` and `RegisterView` to include `'success': True` in their responses.
  - Ensure roles are returned as UPPERCASE (e.g., `STUDENT`, `TEACHER`, `ADMIN`).
- **Teacher Dashboard**:
  - In `apps.academic.views.teacher.TeacherCoursesView`, rename response keys:
    - `current_courses` -> `currentCourses`
    - `previous_courses` -> `previousCourses`
- **Student Dashboard**:
  - Update `apps.users.urls.student` to change the endpoint from `<uuid>/attendance/` to `<uuid>/semesters/` to match frontend expectations and the blueprint.
- **Consistency**:
  - Ensure all standard API responses include a `success: true/false` field.

### 2.2 Frontend Changes
- **Service Layer (`lib/services.ts`)**:
  - Update payload keys to match Django's snake_case requirements where necessary (e.g., `duration_seconds` in `sessionService`).
  - Sync any minor endpoint path differences.
- **API Helper (`lib/api.ts`)**:
  - (Already handles trailing slashes and JWT tokens).

## 3. Detailed Component Migration

### 3.1 Auth Flow
- The `AuthContext.tsx` is already partially adapted for JWT.
- We will ensure `res.user.role` is consistently handled as UPPERCASE.

### 3.2 Student Attendance
- **Current Frontend**: Calls `/api/student/${studentUuid}/semesters`.
- **Target Backend**: `/api/student/${studentUuid}/semesters/`.

### 3.3 Teacher Courses
- **Current Frontend**: Expects `res.currentCourses` and `res.previousCourses`.
- **Target Backend**: Will be updated to return these keys.

### 3.4 Live Sessions
- **Current Frontend**: Calls `/api/sessions/start`.
- **Target Backend**: `/api/sessions/start/`.
- **Payload**: `duration_seconds` (Django) vs `durationSeconds` (Frontend). Frontend will be updated.

## 4. Verification Plan
1. **Auth**: Verify login/register returns `success: true` and tokens.
2. **Student**: Verify semester/attendance list loading.
3. **Teacher**: Verify course list (current/previous) loading.
4. **Sessions**: Verify session start/stop/status endpoints.
