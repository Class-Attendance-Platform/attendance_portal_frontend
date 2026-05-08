export const ROUTES = {
  AdminCourses: "/dashboard/admin/courses",
  AdminStudents: "/dashboard/admin/students",
  AdminTeachers: "/dashboard/admin/teachers",
  AdminSemesters: "/dashboard/admin/semesters",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];