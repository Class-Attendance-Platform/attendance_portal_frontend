import * as crypto from 'crypto';
import { prisma } from './db';

// Password encryption helper using SHA256 and the application's salt
export function encryptPassword(password: string): string {
  const salted = "HSTU_CSE_23" + password;
  return crypto.createHash('sha256').update(salted, 'utf8').digest('hex');
}

/**
 * Seeds a clean, production-ready set of mock academic records into SQLite using Prisma ORM.
 */
export async function seedDummyData(): Promise<void> {
  console.log("Seeding extra realistic dummy data into database via Prisma ORM...");

  // 1. Clean existing records in dependency order to prevent foreign key errors
  await prisma.studentSemester.deleteMany({});
  await prisma.semesterCourseInfo.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.courseInfo.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.admin.deleteMany({});

  const defaultPasswordHash = encryptPassword("123456");

  // 2. Seed Admin account
  await prisma.admin.create({
    data: {
      id: "admin-id-1",
      userName: "Administrator",
      email: "admin@gmail.com",
      passwordHash: defaultPasswordHash,
      role: "admin",
      faculty: "COMPUTER_SCIENCE_AND_ENGINEERING",
      department: "COMPUTER_SCIENCE_AND_ENGINEERING"
    }
  });

  // 3. Seed Course catalog
  const courseData = [
    { code: "CSE 101", title: "Structured Programming Language", content: "Introduction to programming concepts, control structures, functions, arrays, pointers, and structures in C.", credits: "CREDIT_3_00" },
    { code: "CSE 102", title: "Structured Programming Language Lab", content: "Laboratory sessions for Structured Programming Language (C programming).", credits: "CREDIT_1_50" },
    { code: "CSE 151", title: "Discrete Mathematics", content: "Sets, logic, relations, functions, graphs, trees, combinatorics, and algebraic structures.", credits: "CREDIT_3_00" },
    { code: "CSE 152", title: "Digital Logic Design", content: "Number systems, Boolean algebra, logic gates, combinational and sequential circuit design.", credits: "CREDIT_3_00" },
    { code: "CSE 201", title: "Object Oriented Programming", content: "Object-oriented principles, classes, objects, inheritance, polymorphism, templates, and exception handling in C++.", credits: "CREDIT_3_00" },
    { code: "CSE 202", title: "Object Oriented Programming Lab", content: "Hands-on lab in OOP using C++.", credits: "CREDIT_1_50" },
    { code: "CSE 251", title: "Data Structures", content: "Arrays, linked lists, stacks, queues, trees, graphs, hashing, sorting, and searching algorithms.", credits: "CREDIT_3_00" },
    { code: "CSE 252", title: "Data Structures Lab", content: "Hands-on implementation of core data structures.", credits: "CREDIT_1_00" },
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

  const courses = [];
  for (const c of courseData) {
    const created = await prisma.course.create({
      data: {
        code: c.code,
        title: c.title,
        content: c.content,
        credits: c.credits,
        faculty: "COMPUTER_SCIENCE_AND_ENGINEERING",
        department: "COMPUTER_SCIENCE_AND_ENGINEERING"
      }
    });
    courses.push(created);
  }

  // 4. Seed Teachers
  const teachersData = [
    { name: "Dr. Aminul Islam", email: "teacher@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" },
    { name: "Prof. Yasmin Yasmin", email: "cse_teacher1@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" },
    { name: "Dr. Mahbubur Rahman", email: "cse_teacher2@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" },
    { name: "Sharmin Akter", email: "cse_teacher3@gmail.com", dept: "COMPUTER_SCIENCE_AND_ENGINEERING" }
  ];

  const seededTeachers = [];
  for (const t of teachersData) {
    const created = await prisma.teacher.create({
      data: {
        userName: t.name,
        email: t.email,
        passwordHash: defaultPasswordHash,
        role: "teacher",
        faculty: "COMPUTER_SCIENCE_AND_ENGINEERING",
        department: t.dept
      }
    });
    seededTeachers.push(created);
  }

  // 5. Seed Students
  const studentNames = [
    "Sadia Afrin", "Tasnim Rahman", "Md. Rafiqul Islam", "Nusrat Jahan", "Arifur Rahman",
    "Jannatul Ferdous", "Asif Iqbal", "Tahmina Akter", "Md. Abu Bakar", "Sumaiya Jahan",
    "Tanvir Ahmed", "Rashedul Islam", "Zarin Tasnim", "Fahmida Chowdhury", "Md. Al-Amin",
    "Shamima Nasrin", "Kamrul Hasan", "Nishat Tasnim", "Rayhan Chowdhury", "Sabiha Sultana",
    "Imran Khan", "Ayesha Siddiqua", "Mustafizur Rahman", "Farhana Khan", "Tariqul Islam",
    "Tanjila Akter", "Mustafa Kamal", "Nabila Chowdhury", "Rubel Hossain", "Mehedi Hasan"
  ];

  const seededStudents = [];
  for (let index = 0; index < studentNames.length; index++) {
    const name = studentNames[index];
    const studentIdVal = index === 0 ? 2302001 : 2302060 + index;
    const emailVal = index === 0 ? "student@gmail.com" : `${name.toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`;
    
    const created = await prisma.student.create({
      data: {
        userName: name,
        email: emailVal,
        passwordHash: defaultPasswordHash,
        role: 'student',
        faculty: 'COMPUTER_SCIENCE_AND_ENGINEERING',
        department: 'COMPUTER_SCIENCE_AND_ENGINEERING',
        currentLevel: 'Third',
        currentSemester: 'I',
        studentId: studentIdVal
      }
    });
    seededStudents.push(created);
  }

  // Course-to-Teacher index mapping
  const courseTeacherMap: Record<string, number> = {
    "CSE 101": 0, "CSE 102": 0, "CSE 301": 0, "CSE 302": 0,
    "CSE 151": 1, "CSE 152": 1, "CSE 303": 1, "CSE 304": 1,
    "CSE 201": 2, "CSE 202": 2, "CSE 305": 2, "CSE 306": 2,
    "CSE 251": 3, "CSE 252": 3, "CSE 307": 3, "CSE 308": 3, "CSE 309": 3, "CSE 310": 3
  };

  // Define structured semester groups to mock student progress histories
  const semesterDefinitions = [
    { level: "First", semester: "I", codeSuffix: "1-1", courseCodes: ["CSE 101", "CSE 102"], year: 2024 },
    { level: "First", semester: "II", codeSuffix: "1-2", courseCodes: ["CSE 151", "CSE 152"], year: 2024 },
    { level: "Second", semester: "I", codeSuffix: "2-1", courseCodes: ["CSE 201", "CSE 202"], year: 2025 },
    { level: "Second", semester: "II", codeSuffix: "2-2", courseCodes: ["CSE 251", "CSE 252"], year: 2025 },
    { level: "Third", semester: "I", codeSuffix: "3-1", courseCodes: ["CSE 301", "CSE 302", "CSE 303", "CSE 304", "CSE 305", "CSE 306", "CSE 307", "CSE 308"], year: 2026 }
  ];

  for (const semDef of semesterDefinitions) {
    const semId = `semester-id-${semDef.codeSuffix}`;
    const semester = await prisma.semester.create({
      data: {
        id: semId,
        level: semDef.level,
        semester: semDef.semester,
        startDate: JSON.stringify([semDef.year, 2, 20]),
        endDate: JSON.stringify([semDef.year, 8, 20])
      }
    });

    // Link students to semester
    for (const s of seededStudents) {
      await prisma.studentSemester.create({
        data: {
          studentId: s.id,
          semesterId: semester.id
        }
      });
    }

    for (const code of semDef.courseCodes) {
      const course = courses.find(c => c.code === code);
      if (course) {
        const attendanceId = `attendance-id-${code.replace(' ', '-')}-${semDef.codeSuffix}`;
        const courseInfoId = `courseinfo-id-${code.replace(' ', '-')}-${semDef.codeSuffix}`;

        // Determine random attendance count for each student (between 8 and 15 classes present)
        const presentCounts: Record<number, number> = {};
        const attendanceMap: Record<number, number> = {};
        seededStudents.forEach(student => {
          const presentCount = Math.floor(Math.random() * 8) + 8; // 8 to 15
          presentCounts[student.studentId] = presentCount;
          attendanceMap[student.studentId] = presentCount;
        });

        // Generate class dates
        const dates: string[] = [];
        let currentDate = new Date(semDef.year, 2, 2);
        for (let i = 0; i < 15; i++) {
          const dateString = currentDate.toISOString().split('T')[0];
          dates.push(dateString);
          currentDate.setDate(currentDate.getDate() + (currentDate.getDay() === 1 ? 3 : 4)); // Mon -> Thu -> Mon
        }

        // Fill history dates
        const history = dates.map(date => ({
          date,
          presentStudents: [] as number[]
        }));

        // Shuffle present dates per student to create realistic random rosters
        seededStudents.forEach(student => {
          const P = presentCounts[student.studentId];
          const shuffledIndices = [...Array(15).keys()].sort(() => Math.random() - 0.5);
          const chosenIndices = shuffledIndices.slice(0, P);
          chosenIndices.forEach(idx => {
            history[idx].presentStudents.push(student.studentId);
          });
        });

        await prisma.attendance.create({
          data: {
            id: attendanceId,
            totalClasses: 15,
            attendanceMap: JSON.stringify(attendanceMap),
            history: JSON.stringify(history)
          }
        });

        // Course Info binds Course, Teacher, and Attendance records
        const teacher = seededTeachers[courseTeacherMap[code]];
        await prisma.courseInfo.create({
          data: {
            id: courseInfoId,
            courseId: course.id,
            teacherId: teacher.id,
            attendanceId: attendanceId
          }
        });

        // Link CourseInfo to Semester
        await prisma.semesterCourseInfo.create({
          data: {
            semesterId: semester.id,
            courseInfoId: courseInfoId
          }
        });
      }
    }
  }

  console.log("Mock data generated successfully via Prisma!");
}

// Standalone execution wrapper for direct script usage (npm run seed)
if (require.main === module) {
  seedDummyData()
    .then(() => {
      console.log("Database seeded successfully via direct execution!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Direct seeding execution failed:", err);
      process.exit(1);
    });
}
