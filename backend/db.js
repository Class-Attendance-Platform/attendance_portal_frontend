const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OLD_DB_PATH = path.join(__dirname, '../old/db/data.json');
const NEW_DB_PATH = path.join(__dirname, 'data/data.json');

// In-memory collections
let db = {
  courses: [],
  teachers: [],
  students: [],
  admins: [],
  courseInfos: [],
  attendances: [],
  semesterCourses: []
};

// Salt-based SHA256 hashing for seed passwords
function encryptPassword(password) {
  const salted = "HSTU_CSE_23" + password;
  return crypto.createHash('sha256').update(salted, 'utf8').digest('hex');
}

// Load database
function loadDB() {
  if (fs.existsSync(NEW_DB_PATH)) {
    try {
      const raw = fs.readFileSync(NEW_DB_PATH, 'utf8');
      db = JSON.parse(raw);
      console.log(`Database loaded successfully from ${NEW_DB_PATH}.`);
      console.log(`Stats: ${db.teachers.length} teachers, ${db.students.length} students, ${db.courses.length} courses.`);
      
      // Auto seed if database is missing core seed accounts or is too small
      const hasAdmin = db.admins && db.admins.some(a => a.email === 'admin@gmail.com' && !a.deleted);
      const hasTeacher = db.teachers && db.teachers.some(t => t.email === 'teacher@gmail.com' && !t.deleted);
      const hasStudent = db.students && db.students.some(s => s.email === 'student@gmail.com' && !s.deleted);

      if (!hasAdmin || !hasTeacher || !hasStudent || db.students.length < 15 || db.courses.length === 0) {
        seedDummyData();
      }
      return;
    } catch (err) {
      console.error("Failed to parse active database, falling back to old database.", err);
    }
  }

  const dataDir = path.dirname(NEW_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(OLD_DB_PATH)) {
    try {
      const raw = fs.readFileSync(OLD_DB_PATH, 'utf8');
      const oldData = JSON.parse(raw);
      console.log("Normalizing database from old Jackson-based data.json...");
      normalizeOldData(oldData);
      seedDummyData(); // Add extra dummy data
      saveDB();
      console.log("Normalization & Seeding complete! Saved to local active database.");
    } catch (err) {
      console.error("Failed to parse old database.", err);
      initEmptyDB();
    }
  } else {
    console.warn("No database file found. Initializing empty database.");
    initEmptyDB();
  }
}

function initEmptyDB() {
  db = {
    courses: [],
    teachers: [],
    students: [],
    admins: [],
    courseInfos: [],
    attendances: [],
    semesterCourses: []
  };
  seedDummyData();
  saveDB();
}

function normalizeOldData(old) {
  const courseInfosMap = new Map();
  const attendancesMap = new Map();
  const semesterCoursesMap = new Map();

  db.courses = (old.courses || []).map(c => ({
    id: c.id,
    deleted: !!c.deleted,
    code: c.code || '',
    title: c.title || '',
    content: c.content || '',
    credits: c.credits || 'CREDIT_2_00'
  }));

  db.admins = (old.admins || []).map(a => ({
    id: a.id,
    deleted: !!a.deleted,
    userName: a.userName || '',
    email: a.email || '',
    passwordHash: a.passwordHash || '',
    role: a.role || 'admin',
    faculty: a.faculty || '',
    department: a.department || ''
  }));

  db.teachers = (old.teachers || []).map(t => {
    const currentCourseIds = [];
    const previousCourseIds = [];

    const processCourses = (coursesList, targetIds) => {
      (coursesList || []).forEach(ci => {
        if (!ci || typeof ci !== 'object') return;
        
        let attId = '';
        if (ci.attendance && typeof ci.attendance === 'object') {
          attId = ci.attendance.id;
          attendancesMap.set(attId, {
            id: attId,
            deleted: !!ci.attendance.deleted,
            attendanceMap: ci.attendance.attendanceMap || {},
            totalClasses: ci.attendance.totalClasses || 0,
            history: ci.attendance.history || []
          });
        } else if (typeof ci.attendance === 'string') {
          attId = ci.attendance;
        }

        const courseId = (ci.course && typeof ci.course === 'object') ? ci.course.id : (ci.course || '');
        const teacherId = (ci.teacher && typeof ci.teacher === 'object') ? ci.teacher.id : (ci.teacher || t.id);

        courseInfosMap.set(ci.id, {
          id: ci.id,
          deleted: !!ci.deleted,
          course: courseId,
          teacher: teacherId,
          attendance: attId
        });

        targetIds.push(ci.id);
      });
    };

    processCourses(t.currentCourses, currentCourseIds);
    processCourses(t.previousCourses, previousCourseIds);

    return {
      id: t.id,
      deleted: !!t.deleted,
      userName: t.userName || '',
      email: t.email || '',
      passwordHash: t.passwordHash || '',
      role: t.role || 'teacher',
      faculty: t.faculty || '',
      department: t.department || '',
      currentCourses: currentCourseIds,
      previousCourses: previousCourseIds
    };
  });

  (old.students || []).forEach(s => {
    (s.semesterCourses || []).forEach(sc => {
      if (!sc || typeof sc !== 'object') return;
      
      const studentIds = (sc.students || []).map(std => {
        return (std && typeof std === 'object') ? std.id : std;
      });

      const courseInfoIds = (sc.courses || []).map(ci => {
        return (ci && typeof ci === 'object') ? ci.id : ci;
      });

      semesterCoursesMap.set(sc.id, {
        id: sc.id,
        deleted: !!sc.deleted,
        level: sc.level || '',
        semester: sc.semester || '',
        startDate: sc.startDate || null,
        endDate: sc.endDate || null,
        students: studentIds,
        courses: courseInfoIds
      });
    });
  });

  db.students = (old.students || []).map(s => {
    const scIds = (s.semesterCourses || []).map(sc => {
      return (sc && typeof sc === 'object') ? sc.id : sc;
    });

    return {
      id: s.id,
      deleted: !!s.deleted,
      userName: s.userName || '',
      email: s.email || '',
      passwordHash: s.passwordHash || '',
      role: s.role || 'student',
      faculty: s.faculty || '',
      department: s.department || '',
      currentLevel: s.currentLevel || '',
      currentSemester: s.currentSemester || '',
      studentId: s.studentId || 0,
      semesterCourses: scIds
    };
  });

  db.courseInfos = Array.from(courseInfosMap.values());
  db.attendances = Array.from(attendancesMap.values());
  db.semesterCourses = Array.from(semesterCoursesMap.values());
}

// Seeder for dummy data
function seedDummyData() {
  console.log("Seeding extra realistic dummy data into database...");

  // Clean initialization
  db.courses = [];
  db.teachers = [];
  db.students = [];
  db.admins = [];
  db.courseInfos = [];
  db.attendances = [];
  db.semesterCourses = [];

  const defaultPasswordHash = encryptPassword("123456");

  // 1. Create admin
  db.admins.push({
    id: "admin-id-1",
    deleted: false,
    userName: "Administrator",
    email: "admin@gmail.com",
    passwordHash: defaultPasswordHash,
    role: "admin",
    faculty: "COMPUTER_SCIENCE_AND_ENGINEERING",
    department: "COMPUTER_SCIENCE_AND_ENGINEERING"
  });

  // 2. Create courses
  const courseData = [
    // Level First Semester I
    { code: "CSE 101", title: "Structured Programming Language", content: "Introduction to programming concepts, control structures, functions, arrays, pointers, and structures in C.", credits: "CREDIT_3_00" },
    { code: "CSE 102", title: "Structured Programming Language Lab", content: "Laboratory sessions for Structured Programming Language (C programming).", credits: "CREDIT_1_50" },
    // Level First Semester II
    { code: "CSE 151", title: "Discrete Mathematics", content: "Sets, logic, relations, functions, graphs, trees, combinatorics, and algebraic structures.", credits: "CREDIT_3_00" },
    { code: "CSE 152", title: "Digital Logic Design", content: "Number systems, Boolean algebra, logic gates, combinational and sequential circuit design.", credits: "CREDIT_3_00" },
    // Level Second Semester I
    { code: "CSE 201", title: "Object Oriented Programming", content: "Object-oriented principles, classes, objects, inheritance, polymorphism, templates, and exception handling in C++.", credits: "CREDIT_3_00" },
    { code: "CSE 202", title: "Object Oriented Programming Lab", content: "Hands-on lab in OOP using C++.", credits: "CREDIT_1_50" },
    // Level Second Semester II
    { code: "CSE 251", title: "Data Structures", content: "Arrays, linked lists, stacks, queues, trees, graphs, hashing, sorting, and searching algorithms.", credits: "CREDIT_3_00" },
    { code: "CSE 252", title: "Data Structures Lab", content: "Hands-on implementation of core data structures.", credits: "CREDIT_1_00" },
    // Level Third Semester I (Active)
    { code: "CSE 301", title: "Database Management Systems", content: "Introduction to databases, SQL, relational algebra, normalization, transactions, indexing, and NoSQL databases.", credits: "CREDIT_3_00" },
    { code: "CSE 302", title: "Database Management Systems Lab", content: "Hands-on lab exercises in SQL programming, database schema design, and backend database connectivity.", credits: "CREDIT_1_50" },
    { code: "CSE 303", title: "Software Engineering", content: "Software development lifecycles, Agile/Scrum, software design patterns, testing, UML modeling, and DevOps practices.", credits: "CREDIT_3_00" },
    { code: "CSE 304", title: "Software Engineering Lab", content: "Practical team project designing, developing, and deploying a modern web/mobile application.", credits: "CREDIT_1_00" },
    { code: "CSE 305", title: "Computer Networks", content: "Network architecture, OSI model layers, TCP/IP protocol suite, routing algorithms, socket programming, and security.", credits: "CREDIT_3_00" },
    { code: "CSE 306", title: "Computer Networks Lab", content: "Network configuration, packet analysis using Wireshark, socket programming, and Cisco packet tracer labs.", credits: "CREDIT_1_00" },
    { code: "CSE 307", title: "Operating Systems", content: "Processes, threads, CPU scheduling, synchronization, deadlocks, memory management, and file systems.", credits: "CREDIT_3_00" },
    { code: "CSE 308", title: "Operating Systems Lab", content: "Shell scripting, system call programming, CPU scheduling algorithm simulation, and thread synchronization.", credits: "CREDIT_1_00" },
    { code: "CSE 309", title: "Theory of Computation", content: "Finite automata, regular expressions, context-free grammars, Turing machines, and computational complexity.", credits: "CREDIT_3_00" },
    { code: "CSE 310", title: "Microprocessors & Assembly Language", content: "8086 architecture, assembly language programming, memory interfacing, and hardware peripherals.", credits: "CREDIT_2_00" }
  ];

  courseData.forEach(c => {
    db.courses.push({
      id: crypto.randomUUID(),
      deleted: false,
      code: c.code,
      title: c.title,
      content: c.content,
      credits: c.credits,
      faculty: "COMPUTER_SCIENCE_AND_ENGINEERING",
      department: "COMPUTER_SCIENCE_AND_ENGINEERING"
    });
  });

  // 3. Create teachers
  const teachersData = [
    { name: "Dr. Aminul Islam", email: "teacher@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" },
    { name: "Prof. Farhana Yasmin", email: "cse_teacher1@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" },
    { name: "Dr. Mahbubur Rahman", email: "cse_teacher2@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" },
    { name: "Sharmin Akter", email: "cse_teacher3@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" }
  ];

  const seededTeachers = teachersData.map((t, index) => {
    const teacherObj = {
      id: `teacher-id-${index + 1}`,
      deleted: false,
      userName: t.name,
      email: t.email,
      passwordHash: defaultPasswordHash,
      role: "teacher",
      faculty: "COMPUTER_SCIENCE_AND_ENGINEERING",
      department: t.dept,
      currentCourses: [],
      previousCourses: []
    };
    db.teachers.push(teacherObj);
    return teacherObj;
  });

  // 4. Create Students
  const studentNames = [
    "Sadia Afrin", "Tasnim Rahman", "Md. Rafiqul Islam", "Nusrat Jahan", "Arifur Rahman",
    "Jannatul Ferdous", "Asif Iqbal", "Tahmina Akter", "Md. Abu Bakar", "Sumaiya Jahan",
    "Tanvir Ahmed", "Rashedul Islam", "Zarin Tasnim", "Fahmida Chowdhury", "Md. Al-Amin",
    "Shamima Nasrin", "Kamrul Hasan", "Nishat Tasnim", "Rayhan Chowdhury", "Sabiha Sultana",
    "Imran Khan", "Ayesha Siddiqua", "Mustafizur Rahman", "Farhana Khan", "Tariqul Islam",
    "Tanjila Akter", "Mustafa Kamal", "Nabila Chowdhury", "Rubel Hossain", "Mehedi Hasan"
  ];

  const seededStudents = studentNames.map((name, index) => {
    const studentIdVal = index === 0 ? 2302001 : 2302060 + index;
    const emailVal = index === 0 ? "student@gmail.com" : `${name.toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`;
    const studObj = {
      id: `student-id-${index + 1}`,
      deleted: false,
      userName: name,
      email: emailVal,
      passwordHash: defaultPasswordHash,
      role: 'student',
      faculty: 'COMPUTER_SCIENCE_AND_ENGINEERING',
      department: 'COMPUTER_SCIENCE_AND_ENGINEERING',
      currentLevel: 'Third',
      currentSemester: 'I',
      studentId: studentIdVal,
      semesterCourses: []
    };
    db.students.push(studObj);
    return studObj;
  });

  // 5. Connect teachers to courses mapping for different semesters
  const courseTeacherMap = {
    "CSE 101": 0, "CSE 102": 0, "CSE 301": 0, "CSE 302": 0,
    "CSE 151": 1, "CSE 152": 1, "CSE 303": 1, "CSE 304": 1,
    "CSE 201": 2, "CSE 202": 2, "CSE 305": 2, "CSE 306": 2,
    "CSE 251": 3, "CSE 252": 3, "CSE 307": 3, "CSE 308": 3, "CSE 309": 3, "CSE 310": 3
  };

  const semesterDefinitions = [
    { level: "First", semester: "I", codeSuffix: "1-1", courseCodes: ["CSE 101", "CSE 102"], year: 2024 },
    { level: "First", semester: "II", codeSuffix: "1-2", courseCodes: ["CSE 151", "CSE 152"], year: 2024 },
    { level: "Second", semester: "I", codeSuffix: "2-1", courseCodes: ["CSE 201", "CSE 202"], year: 2025 },
    { level: "Second", semester: "II", codeSuffix: "2-2", courseCodes: ["CSE 251", "CSE 252"], year: 2025 },
    { level: "Third", semester: "I", codeSuffix: "3-1", courseCodes: ["CSE 301", "CSE 302", "CSE 303", "CSE 304", "CSE 305", "CSE 306", "CSE 307", "CSE 308"], year: 2026 }
  ];

  semesterDefinitions.forEach((semDef) => {
    const semId = `semester-id-${semDef.codeSuffix}`;
    const semesterObj = {
      id: semId,
      deleted: false,
      level: semDef.level,
      semester: semDef.semester,
      startDate: [semDef.year, 2, 20],
      endDate: [semDef.year, 8, 20],
      students: seededStudents.map(s => s.id),
      courses: []
    };

    semDef.courseCodes.forEach(code => {
      const course = db.courses.find(c => c.code === code);
      if (course) {
        const attendanceId = `attendance-id-${course.code.replace(' ', '-')}-${semDef.codeSuffix}`;
        const courseInfoId = `courseinfo-id-${course.code.replace(' ', '-')}-${semDef.codeSuffix}`;

        // Create attendance
        const attendanceObj = {
          id: attendanceId,
          deleted: false,
          totalClasses: 15,
          attendanceMap: {},
          history: []
        };

        // Seed realistic student attendances
        const presentCounts = {};
        seededStudents.forEach(student => {
          const presentCount = Math.floor(Math.random() * 8) + 8; // 8 to 15
          presentCounts[student.studentId] = presentCount;
          attendanceObj.attendanceMap[student.studentId] = presentCount;
        });

        // Create 15 classes history dates
        const dates = [];
        let currentDate = new Date(semDef.year, 2, 2);
        for (let i = 0; i < 15; i++) {
          const dateString = currentDate.toISOString().split('T')[0];
          dates.push(dateString);
          currentDate.setDate(currentDate.getDate() + (currentDate.getDay() === 1 ? 3 : 4));
        }

        attendanceObj.history = dates.map(date => ({
          date,
          presentStudents: []
        }));

        // Distribute student presence
        seededStudents.forEach(student => {
          const P = presentCounts[student.studentId];
          const shuffledIndices = [...Array(15).keys()].sort(() => Math.random() - 0.5);
          const chosenIndices = shuffledIndices.slice(0, P);
          chosenIndices.forEach(idx => {
            attendanceObj.history[idx].presentStudents.push(student.studentId);
          });
        });

        db.attendances.push(attendanceObj);

        // Create CourseInfo
        const courseInfoObj = {
          id: courseInfoId,
          deleted: false,
          course: course.id,
          teacher: seededTeachers[courseTeacherMap[code]].id,
          attendance: attendanceId
        };
        db.courseInfos.push(courseInfoObj);

        // Connect to teacher
        const teacher = seededTeachers[courseTeacherMap[code]];
        if (semDef.year === 2026) {
          teacher.currentCourses.push(courseInfoId);
        } else {
          teacher.previousCourses.push(courseInfoId);
        }

        // Add to semester
        semesterObj.courses.push(courseInfoId);
      }
    });

    db.semesterCourses.push(semesterObj);

    // Link semester to students
    seededStudents.forEach(s => {
      s.semesterCourses.push(semId);
    });
  });

  saveDB();
  console.log(`Rich seeding complete! Created 1 admin, ${db.teachers.length} teachers, ${db.students.length} students, ${db.courses.length} courses, ${db.courseInfos.length} course mappings.`);
}

// Save database
function saveDB() {
  try {
    fs.writeFileSync(NEW_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to save database to disk.", err);
  }
}

// Initialize database on import
loadDB();

module.exports = {
  get: () => db,
  save: saveDB,
  reload: loadDB,
  
  getCourses: () => db.courses.filter(item => !item.deleted),
  getTeachers: () => db.teachers.filter(item => !item.deleted),
  getStudents: () => db.students.filter(item => !item.deleted),
  getAdmins: () => db.admins.filter(item => !item.deleted),
  getCourseInfos: () => db.courseInfos.filter(item => !item.deleted),
  getAttendances: () => db.attendances.filter(item => !item.deleted),
  getSemesterCourses: () => db.semesterCourses.filter(item => !item.deleted)
};
