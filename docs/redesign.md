# Redesign brief (Campus Green)

The owner chose mockup **A · Campus Green** (artifact "Attendance Portal Redesign Mockups"). This file
is the reference for every screen. API contract: `attendance_portal_backend/docs/api-v2.md`.

## Rules (from the owner)

- **No animations or fancy effects**: no Animated, no transitions, no `animate-*`, no press-scale,
  no shadows, no gradients, no blur. Modals use `animationType="none"`. Loading = a plain spinner or
  "Loading…" text.
- Light theme only (no dark mode, no toggle). English only. Name: **HSTU Attendance Portal**.
- Readable: body 15px, nothing under 12px, touch targets ≥ 44px, WCAG AA contrast.
- Same look on web, Android and the desktop app (which loads the web app).
- No `Alert.alert` (it does nothing on web): use the shared confirm dialog and message bar.
- Dates for people: `05 Oct 2026` (`lib/format.ts`). Level/term label: `Level 3 · Term I`.

## Tokens

| Token | Value | Use |
|---|---|---|
| bg | #F5F7F5 | page background |
| surface | #FFFFFF | cards, bars, inputs |
| border | #DCE3DD | 1px borders, dividers |
| text | #17201A | main text |
| muted | #525E55 | secondary text (AA on white and bg) |
| primary | #0A6B3B | buttons, active nav, links |
| primary-hover | #08552F | pressed/hover |
| primary-soft | #E4F1E8 | active nav background, soft pills |
| present | #15803D | Present |
| absent | #B42318 | Absent, destructive |
| absent-soft | #FDECEA | error banners |
| warn | #9A4A06 | below 75% |
| warn-ink | #7A3B05 | text on warn-soft |
| warn-soft | #FDF1E1 | warning panels |
| warn-border | #F2D3AE | warning borders |
| info | #0369A1 | neutral information |
| info-soft | #E0F2FE | info panels |

Font: **Public Sans** 400/500/600/700 (`@expo-google-fonts/public-sans`). Sizes: 12 caption,
13 small, 15 body, 17 section title, 20 page title (phone), 26 page title (desktop), 40 session code.
Radius: 8 controls, 10 cards (12 on phone cards), 999 pills. Spacing: 4, 8, 12, 16, 20, 24, 32.
Status is never colour alone: Present/Absent pills carry text, warnings carry words.

## Shell and navigation

- Desktop/tablet (≥ 768 px): left sidebar (logo, role nav, user name + role at the bottom), page
  content max-width ~1200 px. Phone: top bar (page title, account button) + bottom tab bar.
- Every page: `PageHeader` (breadcrumb, title, meta line, actions). Tabs inside a page are links
  that change the URL (`?tab=`), so reload/back work.
- Role guard: a signed-out user goes to `/login?redirect=…`; a user on another role's page goes to
  their own home. Pending accounts never get tokens, so they only see the "waiting for approval"
  screen after sign-up or login.

## Routes

| Route | Who | Screen |
|---|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/pending` | public | sign-in and account recovery |
| `/check-in?s=&c=` | student (sign in first) | QR/link target; submits once |
| `/about` | anyone | version, credits, face model licence, privacy note |
| `/account` | signed in | profile (name editable), change password, sign out |
| `/student` | student | home: live banner, overall, courses this term |
| `/student/courses`, `/student/courses/[courseInfoId]` | student | all semesters; one course with each day |
| `/student/check-in` | student | scanner (phone) / code entry |
| `/student/face` | student | face registration (keep the existing flow, restyled) |
| `/teacher` | teacher | courses (current, previous) |
| `/teacher/courses/[courseInfoId]?tab=attendance|students|history|reports` | teacher | course page |
| `/teacher/courses/[courseInfoId]/students/[profileId]` | teacher | one student's days |
| `/teacher/courses/[courseInfoId]/roll-call` | teacher | roll call with date picker |
| `/teacher/courses/[courseInfoId]/face` | teacher | class photo attendance (existing flow, restyled) |
| `/teacher/live/[sessionId]` | teacher | full-screen QR + code for the projector |
| `/admin` | admin | overview |
| `/admin/approvals` | admin | pending sign-ups |
| `/admin/students`, `/admin/students/import` | admin | students; CSV/XLSX import |
| `/admin/teachers`, `/admin/courses` | admin | lists with add/edit/delete/restore |
| `/admin/semesters`, `/admin/semesters/[id]` | admin | semesters; one semester (roster, courses, promote) |
| `/admin/attendance`, `/admin/attendance/[courseInfoId]` | admin | read-only course attendance + exports |

Old routes (`/dashboard/...`, `/attendance/submit`, `/face/...`) redirect to the new ones.

## Building blocks (`components/ui/`)

Button (primary, secondary, quiet, danger; loading state), TextField (label, hint, error),
PasswordField, Select (modal list), Checkbox, SearchField, DateField (calendar grid, no future
dates when asked), Dialog, ConfirmDialog (`useConfirm()`), MessageBar (`useMessage()`: success,
error, info; stays until closed or 5 s), Card, StatTile, Pill/StatusPill, ProgressBar, Tabs,
DataTable (desktop) and ListRow (phone), EmptyState, ErrorState (with Retry), LoadingState,
PageHeader, Avatar (initials), Icon (lucide with explicit `color`/`size` props so Android works).

## API layer (`lib/api/`)

`client.ts` (axios, bearer token, refresh with rotation, errors → `ApiError {message, code,
fieldErrors, status}`), then one file per area typed from the contract: `auth.ts`, `config.ts`,
`student.ts`, `teacher.ts`, `sessions.ts`, `admin.ts`, `faces.ts`, `reports.ts`. Screens import
from these only. `lib/device.ts` keeps a random per-install `device_id`.
