import React, { useState } from "react";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View, Modal, Platform } from "react-native";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { cn } from "./nav";
import { useAuth } from "@/hooks/AuthContext";
import { useRouter } from "expo-router";
import { Button } from "../ui/button";
import { X, User, Settings as SettingsIcon, LogOut } from "lucide-react-native";

export default function TopPanel() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user, logout } = useAuth();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.replace('/(auth)/login');
  };

  const name = user?.userName || 'Anonymous User';
  const studentId = user?.studentId ?? (user as any)?.student_profile?.student_id ?? (user as any)?.student_id;
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US';

  return (
    <View
      accessibilityRole="header"
      className={cn(
        "flex-row items-center justify-between px-4 py-3 bg-card border-b border-border/60"
      )}
    >
      <View>
        <Text className="text-lg font-extrabold tracking-tight text-foreground">
          HSTU <Text className="text-primary">Attendance Portal</Text>
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={toggleColorScheme}
          accessibilityRole="switch"
          accessibilityState={{ checked: isDark }}
          accessibilityLabel="Toggle colour scheme"
          className="p-2.5 rounded-full bg-secondary active:opacity-75"
        >
          <Text className="text-sm">
            {isDark ? "🌙" : "☀️"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMenuOpen(true)}
          className="rounded-full overflow-hidden active:scale-95 transition-transform"
        >
          <Avatar alt="User Profile Image" className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10">
              <Text className="text-xs font-bold text-primary">{initials}</Text>
            </AvatarFallback>
          </Avatar>
        </Pressable>
      </View>

      <Modal
        visible={menuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/10"
          onPress={() => setMenuOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: Platform.OS === 'web' ? 56 : 70,
              right: 16,
              zIndex: 1000
            }}
            className="w-56 rounded-2xl border border-border/80 bg-popover p-2.5 shadow-xl"
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View className="px-3 py-2">
              <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Logged in as</Text>
              <Text className="text-sm font-bold text-foreground mt-0.5 truncate" numberOfLines={1}>{name}</Text>
              <View className="flex-row mt-1">
                <View className="bg-primary/15 rounded-full px-2 py-0.5">
                  <Text className="text-[9px] font-bold text-primary uppercase">{user?.role}</Text>
                </View>
              </View>
            </View>

            <View className="my-1.5 h-px bg-border/60" />

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setProfileModalOpen(true);
              }}
              className="flex-row items-center gap-3 rounded-lg px-3 py-2 active:bg-muted"
            >
              <User size={15} className="text-muted-foreground" />
              <Text className="text-sm font-medium text-foreground">My Profile</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setSettingsModalOpen(true);
              }}
              className="flex-row items-center gap-3 rounded-lg px-3 py-2 active:bg-muted"
            >
              <SettingsIcon size={15} className="text-muted-foreground" />
              <Text className="text-sm font-medium text-foreground">Settings</Text>
            </Pressable>

            <View className="my-1.5 h-px bg-border/60" />

            <Pressable
              onPress={handleLogout}
              className="flex-row items-center gap-3 rounded-lg px-3 py-2 active:bg-red-500/10"
            >
              <LogOut size={15} className="text-red-500" />
              <Text className="text-sm font-bold text-red-500">Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={profileModalOpen} transparent={true} animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 p-6"
          onPress={() => setProfileModalOpen(false)}
        >
          <View
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl"
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-border/50 pb-3 mb-4">
              <Text className="text-lg font-bold text-foreground">My Profile</Text>
              <Pressable onPress={() => setProfileModalOpen(false)} className="p-1 rounded-full active:bg-muted">
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <View className="gap-4 py-2">
              <View className="items-center justify-center mb-2">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <Text className="text-2xl font-extrabold text-primary">{initials}</Text>
                </View>
                <Text className="text-lg font-bold text-foreground mt-2">{name}</Text>
                <Text className="text-xs text-muted-foreground">{user?.email}</Text>
              </View>

              <View className="border-t border-border/40 pt-3 gap-2.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-muted-foreground font-semibold">User Role</Text>
                  <Text className="text-xs text-foreground font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{user?.role}</Text>
                </View>
                {studentId ? (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-muted-foreground font-semibold">Student ID</Text>
                    <Text className="text-xs text-foreground font-bold">{studentId}</Text>
                  </View>
                ) : null}
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-muted-foreground font-semibold">Faculty</Text>
                  <Text className="text-xs text-foreground font-bold" numberOfLines={1}>{user?.faculty || 'N/A'}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-muted-foreground font-semibold">Department</Text>
                  <Text className="text-xs text-foreground font-bold" numberOfLines={1}>{user?.department || 'N/A'}</Text>
                </View>
              </View>
            </View>

            <Button className="w-full mt-4 rounded-xl" onPress={() => setProfileModalOpen(false)}>
              <Text className="font-bold text-primary-foreground">Close</Text>
            </Button>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={settingsModalOpen} transparent={true} animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 p-6"
          onPress={() => setSettingsModalOpen(false)}
        >
          <View
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl"
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b border-border/50 pb-3 mb-4">
              <Text className="text-lg font-bold text-foreground">Portal Settings</Text>
              <Pressable onPress={() => setSettingsModalOpen(false)} className="p-1 rounded-full active:bg-muted">
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            </View>

            <View className="gap-4 py-2">
              <Text className="text-sm font-semibold text-foreground">Theme Mode</Text>
              <Pressable
                onPress={toggleColorScheme}
                className="p-3 bg-secondary rounded-2xl flex-row justify-between items-center active:opacity-80"
              >
                <Text className="text-sm font-semibold text-foreground">Dark Theme Enabled</Text>
                <Text className="text-sm">{isDark ? "✅" : "❌"}</Text>
              </Pressable>

              <Text className="text-xs text-muted-foreground leading-relaxed mt-2">
                Preferences and local configurations are stored locally on this terminal.
              </Text>
            </View>

            <Button className="w-full mt-4 rounded-xl" onPress={() => setSettingsModalOpen(false)}>
              <Text className="font-bold text-primary-foreground">Close</Text>
            </Button>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}