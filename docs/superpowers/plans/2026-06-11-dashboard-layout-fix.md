# Dashboard Layout Overflow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix horizontal overflow in Admin dashboards by removing explicit screen-width classes from sub-layouts.

**Architecture:** Replace `w-screen` and `h-screen` with `flex-1` in Admin sub-layouts to allow them to fit within the `DashboardLayout` flex container.

**Tech Stack:** React Native, Expo Router, NativeWind (Tailwind CSS).

---

### Task 1: Fix Courses Layout

**Files:**
- Modify: `app/dashboard/admin/courses/_layout.tsx`

- [ ] **Step 1: Replace w-screen and h-screen with flex-1**

```tsx
import { Slot } from 'expo-router';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View className="flex-1">
      <Slot />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/admin/courses/_layout.tsx
git commit -m "fix(ui): remove w-screen from admin courses layout"
```

---

### Task 2: Fix Semesters Layout

**Files:**
- Modify: `app/dashboard/admin/semesters/_layout.tsx`

- [ ] **Step 1: Replace w-screen and h-screen with flex-1**

```tsx
import { Slot } from "expo-router";
import { View } from "react-native";


export default function RootLayout() {
    return (
        <View className="flex-1">
            <Slot />
        </View>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/admin/semesters/_layout.tsx
git commit -m "fix(ui): remove w-screen from admin semesters layout"
```

---

### Task 3: Fix Students Layout

**Files:**
- Modify: `app/dashboard/admin/students/_layout.tsx`

- [ ] **Step 1: Replace w-screen and h-screen with flex-1**

```tsx
import { Slot } from "expo-router";
import { View } from "react-native";


export default function RootLayout() {
    return (
        <View className="flex-1">
            <Slot />
        </View>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/admin/students/_layout.tsx
git commit -m "fix(ui): remove w-screen from admin students layout"
```

---

### Task 4: Fix Teachers Layout

**Files:**
- Modify: `app/dashboard/admin/teachers/_layout.tsx`

- [ ] **Step 1: Replace w-screen and h-screen with flex-1**

```tsx
import { Slot } from "expo-router";
import { View } from "react-native";


export default function RootLayout() {
    return (
        <View className="flex-1">
            <Slot />
        </View>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/admin/teachers/_layout.tsx
git commit -m "fix(ui): remove w-screen from admin teachers layout"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Verify all w-screen usages are removed from layouts**

Run: `grep -r "w-screen" app/dashboard`
Expected: No matches in layout files within app/dashboard/admin.
