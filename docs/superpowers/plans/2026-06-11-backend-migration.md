# Frontend Migration to Django Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the frontend to communicate with the new Django backend by aligning the backend API responses and adjusting the frontend service layer.

**Architecture:** Backend Alignment (modify Django responses to match frontend expectations) + Targeted Frontend Service Layer updates.

**Tech Stack:** React Native (Expo), Django REST Framework, Axios.

---

### Task 1: Align Authentication API (Backend)

**Files:**
- Modify: `new_backend/apps/users/views/auth.py`
- Modify: `new_backend/apps/users/serializers.py`

- [ ] **Step 1: Update LoginView to include success field and camelCase keys**
Modify `new_backend/apps/users/views/auth.py` to ensure the response includes `success: True` and matches the blueprint.

```python
# in LoginView or CustomTokenObtainPairSerializer
# Update CustomTokenObtainPairSerializer.validate
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['success'] = True  # Add this
        data['user'] = {
            'id': str(user.id),
            'userName': user.get_full_name() or user.username, # Use userName (camelCase)
            'email': user.email,
            'role': user.role.upper(), # Ensure UPPERCASE
            'faculty': user.faculty,
            'department': user.department,
        }
        # Include access/refresh at top level if needed by frontend
        data['access'] = data.get('access')
        data['refresh'] = data.get('refresh')
        return data
```

- [ ] **Step 2: Update RegisterView to include success field and camelCase keys**
Modify `new_backend/apps/users/views/auth.py`.

```python
# In RegisterView.post
            return Response({
                'success': True,
                'user': {
                    'id': str(user.id),
                    'userName': user.get_full_name() or user.username,
                    'email': user.email,
                    'role': user.role.upper(),
                },
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
```

- [ ] **Step 3: Commit backend auth changes**
```bash
git add new_backend/apps/users/views/auth.py
git commit -m "backend: align auth API with frontend expectations"
```

---

### Task 2: Align Teacher Courses API (Backend)

**Files:**
- Modify: `new_backend/apps/academic/views/teacher.py`

- [ ] **Step 1: Rename response keys in TeacherCoursesView**
Modify `new_backend/apps/academic/views/teacher.py`.

```python
# In TeacherCoursesView.get
        return Response({
            'success': True,
            'currentCourses': [serialize(ci) for ci in current], # camelCase
            'previousCourses': [serialize(ci) for ci in previous], # camelCase
        })
```

- [ ] **Step 2: Commit backend teacher courses changes**
```bash
git add new_backend/apps/academic/views/teacher.py
git commit -m "backend: use camelCase for teacher courses response keys"
```

---

### Task 3: Align Student Semesters API (Backend)

**Files:**
- Modify: `new_backend/apps/users/urls/student.py`

- [ ] **Step 1: Change attendance endpoint to semesters**
Modify `new_backend/apps/users/urls/student.py`.

```python
urlpatterns = [
    path('<uuid:uuid>/semesters/', StudentAttendanceView.as_view(), name='student-semesters'), # Changed from attendance/
    path('verify-device/<int:student_id>/', StudentDeviceBindingView.as_view(), name='student-verify-device'),
]
```

- [ ] **Step 2: Commit backend student URL changes**
```bash
git add new_backend/apps/users/urls/student.py
git commit -m "backend: rename student attendance endpoint to semesters"
```

---

### Task 4: Update Frontend Service Layer (Frontend)

**Files:**
- Modify: `lib/services.ts`

- [ ] **Step 1: Update sessionService payloads and studentService endpoint**
Modify `lib/services.ts`.

```typescript
// Student Service
export const studentService = {
  getSemesters: (studentUuid: string) => 
    api.get(`/api/student/${studentUuid}/semesters`), // Ensure trailing slash if not handled by api.ts
};

// Session Service
export const sessionService = {
  startSession: (courseInfoId: string, durationSeconds: number) =>
    api.post('/api/sessions/start/', { // Add trailing slash
      course_info_id: courseInfoId, // Use snake_case for Django
      mode: 'QR_ONLINE',
      duration_seconds: durationSeconds, // Use snake_case
    }),
  // ... update other session methods to ensure trailing slashes if needed
};
```

- [ ] **Step 2: Commit frontend service changes**
```bash
git add lib/services.ts
git commit -m "frontend: update service layer for django compatibility"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Verify Login Flow**
Check that login works and stores tokens correctly in `AuthContext`.

- [ ] **Step 2: Verify Dashboards**
Check Student and Teacher dashboards load their respective lists.

- [ ] **Step 3: Verify Session Start**
Check that starting a session from the teacher dashboard works.
