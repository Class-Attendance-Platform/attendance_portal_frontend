# Blueprint: Class Attendance Portal Backend (Django Implementation Guide)

This document contains the complete database schemas, encryption logic, API routes, payload formats, and expected JSON structures required to replace the Node/Express backend with a **Django/Django REST Framework** backend without breaking the React Native/Expo frontend.

---

## 🔒 1. Password Hashing Strategy

To maintain backward compatibility with existing seeded database accounts, Django should mirror the Express hashing logic instead of using default PBKDF2:
- **Salt**: `"HSTU_CSE_23"`
- **Hash function**: SHA-256
- **Formula**: `hash = sha256( "HSTU_CSE_23" + plain_text_password )` (expressed in hex)

---

## 🗄️ 2. Database Models & Schema Design

Django models should mirror the following relational columns.

### Course
- `id` (UUID / Primary Key)
- `deleted` (Boolean, default: `False`)
- `code` (String, unique, e.g. `"CSE 301"`)
- `title` (String)
- `content` (String, nullable)
- `credits` (String, e.g. `"CREDIT_3_00"`)
- `faculty` (String, default: `"COMPUTER_SCIENCE_AND_ENGINEERING"`)
- `department` (String, default: `"COMPUTER_SCIENCE_AND_ENGINEERING"`)

### Teacher
- `id` (UUID / Primary Key)
- `deleted` (Boolean, default: `False`)
- `userName` (String)
- `email` (String, unique)
- `passwordHash` (String)
- `role` (String, default: `"teacher"`)
- `faculty` (String)
- `department` (String)

### Student
- `id` (UUID / Primary Key)
- `deleted` (Boolean, default: `False`)
- `userName` (String)
- `email` (String, unique)
- `passwordHash` (String)
- `role` (String, default: `"student"`)
- `faculty` (String)
- `department` (String)
- `currentLevel` (String, e.g. `"Third"`)
- `currentSemester` (String, e.g. `"I"`)
- `studentId` (Integer, unique, e.g. `2302001`)

### Admin
- `id` (UUID / Primary Key)
- `deleted` (Boolean, default: `False`)
- `userName` (String)
- `email` (String, unique)
- `passwordHash` (String)
- `role` (String, default: `"admin"`)
- `faculty` (String, nullable)
- `department` (String, nullable)

### Attendance
- `id` (UUID / Primary Key)
- `deleted` (Boolean, default: `False`)
- `totalClasses` (Integer, default: `0`)
- `attendanceMap` (Text / JSON String, default: `"{}"`)
  - *Format*: `{"<studentId_int>": <classesPresent_int>, ...}`
  - *Example*: `{"2302001": 12, "2302061": 10}`
- `history` (Text / JSON String, default: `"[]"`)
  - *Format*: `[{"date": "YYYY-MM-DD", "presentStudents": [<studentId_int>, ...]}, ...]`
  - *Example*: `[{"date": "2026-05-18", "presentStudents": [2302001, 2302061]}]`

### CourseInfo (Binds Course, Teacher, and Attendance)
- `id` (UUID / Primary Key)
- `deleted` (Boolean, default: `False`)
- `course` (ForeignKey -> Course)
- `teacher` (ForeignKey -> Teacher)
- `attendance` (OneToOneField -> Attendance, unique)

### Semester
- `id` (UUID / Primary Key)
- `deleted` (Boolean, default: `False`)
- `level` (String, e.g. `"Third"`)
- `semester` (String, e.g. `"I"`)
- `startDate` (String / JSON String, nullable, e.g. `"[2026,2,20]"`)
- `endDate` (String / JSON String, nullable, e.g. `"[2026,8,20]"`)
- `students` (ManyToManyField -> Student, through `StudentSemester`)
- `courses` (ManyToManyField -> CourseInfo, through `SemesterCourseInfo`)

### StudentSemester (Join Table)
- `student` (ForeignKey -> Student)
- `semester` (ForeignKey -> Semester)
- *Primary Key*: `(student_id, semester_id)`

### SemesterCourseInfo (Join Table)
- `semester` (ForeignKey -> Semester)
- `courseInfo` (ForeignKey -> CourseInfo)
- *Primary Key*: `(semester_id, course_info_id)`

---

## 🔌 3. API Route Configurations & Payloads

The React Native frontend communicates with the server through the following HTTP JSON APIs.

### 🔑 3.1 Auth API

#### login
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Payload**:
  ```json
  { "email": "student@gmail.com", "password": "plain_password" }
  ```
- **Response (Success - Role must be UPPERCASE in response)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "student-uuid",
      "userName": "Sadia Afrin",
      "email": "student@gmail.com",
      "role": "STUDENT",
      "faculty": "COMPUTER_SCIENCE_AND_ENGINEERING",
      "department": "COMPUTER_SCIENCE_AND_ENGINEERING"
    }
  }
  ```

#### register
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Payload**:
  ```json
  {
    "userName": "Tasnim Rahman",
    "email": "tasnim@gmail.com",
    "password": "plain_password",
    "role": "student",
    "faculty": "COMPUTER_SCIENCE_AND_ENGINEERING",
    "department": "COMPUTER_SCIENCE_AND_ENGINEERING",
    "currentLevel": "First",
    "currentSemester": "I",
    "studentId": 2302061
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "user": { "id": "new-uuid", "userName": "Tasnim", "email": "tasnim@gmail.com", "role": "STUDENT" }
  }
  ```

---

### 🎓 3.2 Student Dashboard API

#### Get Semesters & Attendance
- **Method**: `GET`
- **URL**: `/api/student/:student_uuid/semesters`
- **Response**:
  ```json
  {
    "success": true,
    "semesters": [
      {
        "id": "semester-uuid-1",
        "level": "Third",
        "semester": "I",
        "startDate": [2026, 2, 20],
        "endDate": [2026, 8, 20],
        "courses": [
          {
            "id": "course_info_uuid",
            "course": {
              "id": "course-uuid",
              "code": "CSE 301",
              "title": "Database Management Systems",
              "content": "Description",
              "credits": "CREDIT_3_00"
            },
            "teacher": { "userName": "Dr. Aminul Islam", "email": "teacher@gmail.com" },
            "totalClasses": 15,
            "presentCount": 12,
            "percentage": 80.0,
            "history": [
              { "date": "2026-05-18", "present": true },
              { "date": "2026-05-20", "present": false }
            ]
          }
        ]
      }
    ]
  }
  ```

---

### 🏫 3.3 Teacher Dashboard API

#### Get Teacher Courses
- **Method**: `GET`
- **URL**: `/api/teacher/:teacher_uuid/courses`
- **Response (Splits current academic semester `Third I` from previous historical semesters)**:
  ```json
  {
    "success": true,
    "currentCourses": [
      {
        "id": "course_info_uuid",
        "course": { "id": "course-uuid", "code": "CSE 301", "title": "Database Systems" },
        "totalClasses": 15
      }
    ],
    "previousCourses": []
  }
  ```

#### Get Course Details (Student Roster + History)
- **Method**: `GET`
- **URL**: `/api/teacher/course-info/:course_info_uuid`
- **Response**:
  ```json
  {
    "success": true,
    "courseInfo": {
      "id": "course_info_uuid",
      "course": { "id": "c-uuid", "code": "CSE 301", "title": "Database Systems", "credits": "CREDIT_3_00" },
      "teacher": { "id": "t-uuid", "userName": "Aminul", "email": "teacher@gmail.com" },
      "attendance": {
        "id": "att-uuid",
        "totalClasses": 15,
        "attendanceMap": { "2302001": 12, "2302061": 10 },
        "history": [
          { "date": "2026-05-18", "presentStudents": [2302001, 2302061] }
        ]
      },
      "students": [
        { "id": "s-uuid-1", "userName": "Sadia", "studentId": 2302001, "email": "student@gmail.com" }
      ]
    }
  }
  ```

#### Update Total Classes Conducted
- **Method**: `POST`
- **URL**: `/api/teacher/course-info/:course_info_uuid/update-classes`
- **Payload**:
  ```json
  { "delta": 1 }  // Increment by 1 or decrement by -1
  ```
- **Response**:
  ```json
  { "success": true, "totalClasses": 16 }
  ```

#### Mark Single Student Attendance Count
- **Method**: `POST`
- **URL**: `/api/teacher/course-info/:course_info_uuid/mark`
- **Payload**:
  ```json
  { "studentId": 2302001, "delta": 1 }  // Adjust presence by delta
  ```
- **Response**:
  ```json
  { "success": true, "attendanceMap": { "2302001": 13, "2302061": 10 } }
  ```

#### Save Attendance Roster for Specific Date (Add or Edit Log)
- **Method**: `POST`
- **URL**: `/api/teacher/course-info/:course_info_uuid/history-session`
- **Payload**:
  ```json
  {
    "date": "2026-05-21",
    "presentStudentIds": [2302001, 2302061]  // IDs must be integers
  }
  ```
- **Response (Triggers recalculation of totalClasses and attendanceMap based on history array length)**:
  ```json
  {
    "success": true,
    "attendance": {
      "id": "att-uuid",
      "totalClasses": 16,
      "attendanceMap": { "2302001": 13, "2302061": 11 },
      "history": [
        { "date": "2026-05-18", "presentStudents": [2302001, 2302061] },
        { "date": "2026-05-21", "presentStudents": [2302001, 2302061] }
      ]
    }
  }
  ```

#### Delete Attendance Roster for Specific Date
- **Method**: `DELETE`
- **URL**: `/api/teacher/course-info/:course_info_uuid/history-session/:date`  // Date format: YYYY-MM-DD
- **Response (Triggers recalculation)**:
  ```json
  {
    "success": true,
    "attendance": {
      "id": "att-uuid",
      "totalClasses": 15,
      "attendanceMap": { "2302001": 12, "2302061": 10 },
      "history": [
        { "date": "2026-05-18", "presentStudents": [2302001, 2302061] }
      ]
    }
  }
  ```

---

### ⏱️ 3.4 Live Class Attendance Session API

During class check-in, the backend stores a temporary cache in memory mapping `course_info_uuid` to active check-ins.

#### Start Live Check-in Session
- **Method**: `POST`
- **URL**: `/api/teacher/course-info/:course_info_uuid/session/start`
- **Payload**:
  ```json
  { "duration": 300000 }  // Session duration in milliseconds (e.g. 5 minutes)
  ```
- **Response**:
  ```json
  {
    "success": true,
    "session": { "courseInfoId": "ci-uuid", "endTime": 1780000000000, "timeLeft": 300000 }
  }
  ```

#### Stop Live Check-in Session (Commits check-ins to History log & Attendance map)
- **Method**: `POST`
- **URL**: `/api/teacher/course-info/:course_info_uuid/session/stop`
- **Response**:
  ```json
  { "success": true, "message": "Session stopped and attendance applied." }
  ```

#### Get Current Session Status & Live Student Check-ins
- **Method**: `GET`
- **URL**: `/api/teacher/course-info/:course_info_uuid/session/status`
- **Response**:
  ```json
  {
    "success": true,
    "active": true,
    "session": {
      "courseInfoId": "ci-uuid",
      "endTime": 1780000000000,
      "timeLeft": 240000,
      "submissions": [
        { "studentId": 2302001, "userName": "Sadia Afrin" }
      ]
    }
  }
  ```

---

### 🌐 3.5 Student Check-in Portals (Web & Hardware Device)

#### Web Browser Form Route
- **Method**: `GET`
- **URL**: `/attendance/submit?courseInfoId=<course_info_uuid>`
- **Behavior**: Serves static HTML containing a text input for `student_id`. Replace form submit action in HTML dynamically to post to the handler:
  ```html
  <form action="/attendance/submit?courseInfoId=<course_info_uuid>" method="POST">
  ```

#### Web Browser Form Submission Handlers
- **Method**: `POST`
- **URL**: `/attendance/submit?courseInfoId=<course_info_uuid>`
- **Payload**: Form URL-encoded: `student_id=2302001`
- **Behavior**: Checks if session is active. Adds student to active check-ins set. Redirects:
  - If successful: Redirects browser to `/success.html`
  - If student/session invalid: Redirects browser to `/not-found.html`

#### ESP32 RFID Reader Webhook
- **Method**: `POST`
- **URL**: `/api/esp32/attendance`
- **Payload**:
  ```json
  { "courseInfoId": "course_info_uuid", "studentId": 2302001 }
  ```
- **Behavior**: If check-in session is active, adds student ID to the active session submissions log.
- **Response**:
  ```json
  { "success": true, "message": "Student Sadia Afrin registered." }
  ```

---

### 📊 3.6 Report Export Exporter

#### Get Export Report File Stream
- **Method**: `GET`
- **URL**: `/api/teacher/course-info/:course_info_uuid/export?format=<pdf|csv|xlsx>&date=<YYYY-MM-DD>`
- **Parameters**:
  - `format`: Specifies output format. Accept values: `pdf`, `csv`, `xlsx` (case-insensitive).
  - `date` (Optional): If provided, filters report presence status exclusively for that day. If omitted, exports total presence rate ratios and averages.
- **Expected Stream Return**:
  - `csv`: returns `text/csv` attachment file header.
  - `xlsx`: returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` stream.
  - `pdf`: returns `application/pdf` attachment.

---

### 🛡️ 3.7 Admin CRUD Operations

#### Courses
- `GET /api/admin/courses` -> returns `{ "success": true, "courses": [...] }`
- `POST /api/admin/courses` -> returns `{ "success": true, "course": {...} }`
- `PUT /api/admin/courses/:uuid` -> returns `{ "success": true, "course": {...} }`
- `DELETE /api/admin/courses/:uuid` (Logical delete, sets `deleted=True`)

#### Students
- `GET /api/admin/students` -> returns `{ "success": true, "students": [...] }`
- `POST /api/admin/students` (calls auth strategy register)
- `PUT /api/admin/students/:uuid` -> returns `{ "success": true, "student": {...} }`
- `DELETE /api/admin/students/:uuid` (Logical delete, sets `deleted=True`)

#### Teachers
- `GET /api/admin/teachers` -> returns `{ "success": true, "teachers": [...] }`
- `POST /api/admin/teachers` (calls auth strategy register)
- `PUT /api/admin/teachers/:uuid` -> returns `{ "success": true, "teacher": {...} }`
- `DELETE /api/admin/teachers/:uuid` (Logical delete, sets `deleted=True`)

#### Semesters
- `GET /api/admin/semesters` -> returns Semester list with relations formatted:
  ```json
  {
    "success": true,
    "semesters": [
      {
        "id": "sem-uuid",
        "level": "Third",
        "semester": "I",
        "startDate": [2026, 2, 20],
        "endDate": [2026, 8, 20],
        "students": ["student-uuid-1", "student-uuid-2"],  // Array of UUID strings
        "courses": ["course-info-uuid-1", "course-info-uuid-2"]  // Array of CourseInfo UUIDs
      }
    ]
  }
  ```
- `POST /api/admin/semesters` -> creates semester and join records for provided student/course UUIDs.
- `PUT /api/admin/semesters/:uuid` -> updates attributes and resets join links.
- `DELETE /api/admin/semesters/:uuid` (Logical delete, sets `deleted=True`)
