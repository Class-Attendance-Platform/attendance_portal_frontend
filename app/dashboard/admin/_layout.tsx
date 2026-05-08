
import DashboardLayout from "@/components/layout/dashboard";
import { Slot } from "expo-router";
import {
    BookOpen,
    GraduationCap,
    School,
    Users,
} from "lucide-react-native";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout
            title="Admin Dashboard"
            logo={require("@/assets/images/hstu.png")}
            navItems={[
                {
                    label: "Courses",
                    route: "AdminCourses",
                    icon: BookOpen,
                },
                {
                    label: "Students",
                    route: "AdminStudents",
                    icon: GraduationCap,
                },
                {
                    label: "Teachers",
                    route: "AdminTeachers",
                    icon: Users,
                },
                {
                    label: "Semesters",
                    route: "AdminSemesters",
                    icon: School,
                },
            ]}
        >
            <Slot />
        </DashboardLayout>
    );
}