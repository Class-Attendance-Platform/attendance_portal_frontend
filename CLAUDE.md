# Class Attendance Portal: frontend

Expo (SDK 55) + expo-router + NativeWind app for HSTU class attendance, shipped three ways: web app
(https://attendanceportal.sakibkx.tech, static build on the owner's VPS), Android APK and a desktop app
(both built by GitHub Actions). Backend: sibling repo `attendance_portal_backend` (Django; see its
CLAUDE.md for the API, safety rules and demo logins, and its `deploy/README.md` for the server steps).

## Working with the owner (always)
- Ask before assuming; questions as multiple choice, recommended option first, marked "(Recommended)".
- Short plan, then wait for an explicit **"Go"**. UI changes: show 2–3 mockups first.
- Work sequentially; multi-agent workflows only for big steps. Report honestly; plain, short language.
- Never force-push, never hard-delete files, never change global git config. Keep line endings (LF here).

## Careful
- The tracked `.env` holds **backend secrets** (owner chose to keep it tracked). Never print, copy or
  commit secrets. Put frontend settings in `.env.local` (gitignored).
- `dist/` is old committed build output (unused now): don't hand-edit it. The real build goes to
  `web-build/` (gitignored).
- `.env.production` (tracked, public URLs only) sets the live API and web addresses for production builds.
- `app/dashboard/teacher/index.tsx` is ~1.9k lines: grep for the part you need instead of reading it all.

## Commands
```
npm ci
npx tsc --noEmit            # type check (there is no test runner)
npm run web                 # dev server (expo start -c --web)
npm run build:web           # production web build into web-build/ (--clear: env changes need it)
cd desktop && npm ci && npm start                 # desktop app (ATTENDANCE_APP_URL=... to point it elsewhere)
cd desktop && npx electron-builder --linux --publish never   # local installer into ../release/
```
Backend address: `EXPO_PUBLIC_API_URL` (e.g. in `.env.local`), default `http://127.0.0.1:8000`, no
trailing slash. Run the backend locally with its test settings + `seed_local_demo` for previews.

## Code map
- `app/` routes (expo-router): `(auth)/` login, register (Student/Teacher only), forgot/verify/reset;
  `dashboard/admin/*` (courses, semesters, students, teachers), `dashboard/teacher` (courses, calendar
  history, QR session modal, roll call, exports), `dashboard/student` (semesters and attendance),
  `attendance/submit` (QR check-in link target; auto-submits once), `face/register` (student face
  registration: camera + oval, 3 countdown shots, consent; `?from=signup` after student sign-up),
  `face/class?courseInfoId=` (teacher: take/upload 1–3 class photos → Present/Absent/Unsure review → save).
- `lib/api.ts` axios instance: adds the Bearer token, refreshes on 401 and stores the **rotated** refresh
  token, unwraps `response.data`, turns API errors into `Error(message)`.
- `lib/services.ts` every API call, grouped by area. Add new endpoints here. `faceService` uses
  multipart uploads via `lib/upload.ts` (`appendPhoto`: Blob on web, `{uri,name,type}` on phones).
- `hooks/AuthContext.tsx` login state, saved through `lib/session.ts`: web `localStorage` `portal_user`;
  phones `expo-secure-store` (separate keys: values are limited to ~2 KB).
- `lib/native-export.ts` exports on phones (download with the token, then the share sheet). QR codes
  are drawn in the app (`react-native-qrcode-svg`); on phones the check-in link uses `EXPO_PUBLIC_WEB_URL`.
- `desktop/` own npm project (Electron 42 + electron-builder): `main.js` opens the live web app in a
  locked-down window (no Node, other sites open in the browser, camera allowed for the portal only,
  `offline.html` when unreachable). Web updates reach it without a new installer.
- `android/` committed prebuild; `app/build.gradle` takes the version and release signing key from env
  (`ANDROID_*`, set by the workflow from repo secrets; debug key if missing).
- `.github/workflows/`: `checks.yml` (PRs: tsc + web build), `android.yml` (APK), `desktop.yml`
  (Windows .exe + Linux AppImage). A `v*` tag / GitHub Release attaches the APK and installers.
- Face UI pieces: `components/custom/face-reminder.tsx` (student dashboard card),
  `components/custom/student-face-dialog.tsx` (admin view/reset). Camera: `expo-camera`; photos:
  `expo-image-picker` (camera permission also in `app.json` and `android/.../AndroidManifest.xml`).
- `components/ui/` react-native-reusables (shadcn-style) primitives; `components/custom/` app pieces;
  `components/layout/dashboard.tsx` shell (top panel, sidebar on desktop, bottom bar on mobile).
- `types/` shared TS types.

## Design tokens (match these)
Neutral shadcn palette from `global.css` / `lib/theme.ts` (primary near-black `#171717`, muted
`#f5f5f5`, border `#e5e5e5`), dashboard background `bg-zinc-50`, cards `rounded-2xl border border-border
bg-card`, success `emerald-500/600`, errors `destructive`. Icons: `lucide-react-native`.

## Notes
- Face screens follow mockup option C (artifact "Face Attendance Mockups").
- The camera in a browser needs HTTPS or localhost.
- `npx expo install` can't reach Expo's API from some sandboxes: pick versions from
  `node_modules/expo/bundledNativeModules.json` and install with npm (keep `~` ranges).
- Update lockfiles with npm 11 (`npx -y npm@11 install ...`): npm 10 drops the lockfile's `libc` fields.
  If Electron's binary is missing after an install in `desktop/`, run `node node_modules/electron/install.js`.
