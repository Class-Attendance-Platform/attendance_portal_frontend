# Spec: Fix Dashboard Layout Overflow

## Problem Statement
The dashboard layouts for Admin sub-sections (`courses`, `semesters`, `students`, `teachers`) use `w-screen` and `h-screen` classes. Since these layouts are rendered inside a `DashboardLayout` that already includes a sidebar, the `w-screen` forces the content to be 100% of the viewport width, pushing it off-screen to the right by the width of the sidebar (64px/16rem).

## Proposed Changes

### 1. Refactor Admin Sub-layouts
Modify the root `View` in the following files to use `flex-1` instead of `w-screen` and `h-screen`:
- `app/dashboard/admin/courses/_layout.tsx`
- `app/dashboard/admin/semesters/_layout.tsx`
- `app/dashboard/admin/students/_layout.tsx`
- `app/dashboard/admin/teachers/_layout.tsx`

This allows the content to expand to fill the available space provided by the parent flex container without exceeding it.

### 2. Verify Dashboard Layout Container
Ensure `components/layout/dashboard.tsx` correctly wraps the `children` in a `flex-1 min-w-0` container to prevent flex children from overflowing.

## Success Criteria
- Sidebars are visible and correctly sized.
- Main content occupies the remaining screen width without horizontal scrollbars or overflow.
- Layout remains responsive (the issue is specifically on desktop/tablet where the sidebar is visible).

## Testing Strategy
- Manual verification of Admin Dashboard sub-pages on a wide viewport.
- Verify that resizing the window doesn't cause unexpected overflows.
