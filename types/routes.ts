export const ROUTES = {
  AdminCourses: "/dashboard/admin/courses",
  AdminStudents: "/dashboard/admin/students",
  AdminTeachers: "/dashboard/admin/teachers",
  AdminSemesters: "/dashboard/admin/semesters",
  StudentDashboard: "/dashboard/student",
  TeacherDashboard: "/dashboard/teacher",
  Login: "/(auth)/login",
  Register: "/(auth)/register",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];