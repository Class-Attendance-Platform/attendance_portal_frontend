import {
  BookOpen,
  CalendarRange,
  CircleUserRound,
  ClipboardCheck,
  GraduationCap,
  House,
  LayoutDashboard,
  ScanFace,
  ScanLine,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import type { Role } from '@/lib/api/types';

export type NavItem = {
  label: string;
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  also?: string[];
  tab?: boolean;
  phoneHidden?: boolean;
};

const ACCOUNT: NavItem = { label: 'Account', href: '/account', icon: CircleUserRound, tab: true };

export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { label: 'Home', href: '/student', icon: House, exact: true, tab: true },
    { label: 'Check in', href: '/student/check-in', icon: ScanLine, tab: true, also: ['/check-in'] },
    { label: 'Courses', href: '/student/courses', icon: BookOpen, tab: true },
    { label: 'Face registration', shortLabel: 'Face', href: '/student/face', icon: ScanFace, phoneHidden: true },
    ACCOUNT,
  ],
  TEACHER: [{ label: 'My courses', shortLabel: 'Courses', href: '/teacher', icon: BookOpen, tab: true }, ACCOUNT],
  ADMIN: [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true, tab: true },
    { label: 'Approvals', href: '/admin/approvals', icon: UserCheck, tab: true },
    { label: 'Students', href: '/admin/students', icon: GraduationCap, tab: true },
    { label: 'Teachers', href: '/admin/teachers', icon: Users },
    { label: 'Courses', href: '/admin/courses', icon: BookOpen },
    { label: 'Semesters', href: '/admin/semesters', icon: CalendarRange, tab: true },
    { label: 'Attendance', href: '/admin/attendance', icon: ClipboardCheck },
    { ...ACCOUNT, tab: false },
  ],
};

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.also?.some((path) => pathname === path || pathname === `${path}/`)) return true;
  if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function activeItem(items: NavItem[], pathname: string): NavItem | undefined {
  return items
    .filter((item) => isActive(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
