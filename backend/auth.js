const crypto = require('crypto');
const dbManager = require('./db');

const SALT = "HSTU_CSE_23";

function encryptPassword(password) {
  const salted = SALT + password;
  return crypto.createHash('sha256').update(salted, 'utf8').digest('hex');
}

function getValidUser(usernameOrEmail, password) {
  const encrypted = encryptPassword(password);
  const db = dbManager.get();

  const searchInList = (list) => {
    return list.find(u => 
      !u.deleted && 
      (u.userName === usernameOrEmail || u.email === usernameOrEmail) && 
      u.passwordHash === encrypted
    );
  };

  let user = searchInList(db.students);
  if (user) return { ...user, role: 'STUDENT' };

  user = searchInList(db.teachers);
  if (user) return { ...user, role: 'TEACHER' };

  user = searchInList(db.admins);
  if (user) return { ...user, role: 'ADMIN' };

  return null;
}

function registerUser(userData) {
  const db = dbManager.get();
  
  const isDuplicate = (list) => {
    return list.some(u => 
      !u.deleted && 
      (u.userName === userData.userName || u.email === userData.email)
    );
  };

  if (isDuplicate(db.students) || isDuplicate(db.teachers) || isDuplicate(db.admins)) {
    return { success: false, message: "Username or Email already exists." };
  }

  const newId = crypto.randomUUID();
  const passwordHash = encryptPassword(userData.password);

  const role = (userData.role || 'student').toLowerCase();

  const baseUser = {
    id: newId,
    deleted: false,
    userName: userData.userName,
    email: userData.email,
    passwordHash: passwordHash,
    role: role,
    faculty: userData.faculty || '',
    department: userData.department || ''
  };

  if (role === 'student') {
    const student = {
      ...baseUser,
      currentLevel: userData.currentLevel || 'First',
      currentSemester: userData.currentSemester || 'I',
      studentId: parseInt(userData.studentId, 10) || 0,
      semesterCourses: []
    };
    db.students.push(student);
  } else if (role === 'teacher') {
    const teacher = {
      ...baseUser,
      currentCourses: [],
      previousCourses: []
    };
    db.teachers.push(teacher);
  } else if (role === 'admin') {
    db.admins.push(baseUser);
  } else {
    return { success: false, message: "Invalid role specified." };
  }

  dbManager.save();
  return { success: true, user: { id: newId, userName: userData.userName, email: userData.email, role: role.toUpperCase() } };
}

module.exports = {
  encryptPassword,
  getValidUser,
  registerUser
};
