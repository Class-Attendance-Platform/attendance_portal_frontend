# HSTU Attendance Portal: frontend

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
- The redesign (mockup A, "Campus Green") is being built in phases: `docs/redesign.md` is the binding
  brief, `docs/design-system.md` the tokens/components, the backend's `docs/api-v2.md` the API contract.
  **No animations or effects**, light theme only, no `Alert.alert` (use `useConfirm` / `useMessage`).
- The old screens (before the redesign) are in git history: `git show b78af00:app/dashboard/teacher/index.tsx`
  (also `face/register.tsx`, `face/class.tsx`, `attendance/submit.tsx`) to see how a flow worked.

## Commands
```
npm ci
npx tsc --noEmit            # type check (also runs tests/*.typetest.ts: the API types' null cases)
npm test                    # unit tests: Node's own runner on tests/*.test.mjs (pure logic, no app)
npm run web                 # dev server (expo start -c --web)
npm run build:web           # production web build into web-build/ (--clear: env changes need it)
cd desktop && npm ci && npm start                 # desktop app (ATTENDANCE_APP_URL=... to point it elsewhere)
cd desktop && npx electron-builder --linux --publish never   # local installer into ../release/
```
Backend address: `EXPO_PUBLIC_API_URL` (e.g. in `.env.local`), default `http://127.0.0.1:8000`, no
trailing slash. Run the backend locally with its test settings + `seed_local_demo` for previews.

## Code map
- `app/` routes (expo-router). `_layout.tsx`: Public Sans fonts, safe area, MessageProvider,
  ConfirmProvider, AuthProvider, one Stack (no animation). `index.tsx` → role home or `/login`.
  - `(auth)/` public: `login`, `register` (role first), `pending` (`?email=`, `?created=1`),
    `forgot-password`, `reset-password?uid=&token=`; they keep `?redirect=` between them. Their
    pieces (forms, `GuestOnly`, account cards, app version check) are in `components/auth/`.
  - `about.tsx` (public: version, credits, face-model licence, privacy note). Phones check the app
    version at start (`AppVersionGate` in `_layout.tsx`): "Please update" below the minimum.
  - `(app)/_layout.tsx`: signed-in guard + `AppShell`. `(app)/account.tsx` (profile, sign out),
    `(app)/check-in.tsx` (`/check-in?s=&c=` QR target, students). Role groups with their own guard
    layout: `(app)/student/*`, `(app)/teacher/*` (`courses/[courseInfoId]/…`, `live/[sessionId]` full
    screen), `(app)/admin/*`. Feature pages are placeholders until their phase is built.
  - Old URLs redirect: `dashboard/*`, `attendance/submit`, `face/register`, `face/class`, `verify`.
- `components/ui/` building blocks (`index.ts` exports all; see `docs/design-system.md`): Text, Icon,
  Button/IconButton, TextField, PasswordField, SearchField, Select, Checkbox, DateField, Dialog,
  ConfirmDialog (`useConfirm`), MessageBar (`useMessage`), Notice, Card, StatTile, Pill/StatusPill,
  ProgressBar, Tabs (`?tab=`), DataTable, ListRow, Empty/Error/LoadingState, PageHeader, Avatar, TextLink.
- `components/layout/`: `AppShell` (sidebar ≥ 768 px; phones: top bar + tab bar + "More"), `nav.ts`
  (role nav), `RequireAuth` (guards), `Page`, `PublicPage`, `PlaceholderPage`, `PublicPlaceholder`.
- `lib/api/`: `client.ts` (axios, Bearer token, refresh with **rotation**, session-expiry handler,
  every error → `ApiError {message, code, fieldErrors, status, body}`), then one typed module per area
  of the contract: `auth`, `config`, `student`, `teacher`, `sessions`, `admin`, `faces`, `reports`
  (+ `download.ts` / `download.web.ts`: phones share sheet, web file save). Screens import from these
  only. Multipart uploads via `lib/upload.ts` (`appendFile` / `appendPhoto`).
  `refresh-core.ts` holds the multi-tab refresh rules (tabs take turns with Web Locks, reuse a pair
  another tab saved, drop a result that arrives after a sign-out, never touch another account's saved
  login). It has no imports so `tests/refresh.test.mjs` can run it in Node.
- `lib/session.ts` saved login: web `localStorage` `portal_user`; phones `expo-secure-store` (separate
  keys: values are limited to ~2 KB). `lib/device.ts` random per-install `device_id` (check-ins).
- `lib/format.ts` dates "05 Oct 2026", times (Dhaka), percent, "Level 3 · Term I", names, initials;
  `lib/dates.ts` `YYYY-MM-DD` maths in Dhaka time (calendar grid, today, no-future checks);
  `lib/routes.ts` role homes and safe `?redirect=`; `lib/theme.ts` tokens as hex; `lib/utils.ts` `cn`.
- `hooks/AuthContext.tsx` `user` (API v2 shape), `login` (rejects with ApiError codes
  `pending_approval` / `account_disabled` / `invalid_credentials`), `logout` (blacklists the newest
  refresh token via `/auth/logout/`), `refreshUser`, `setUser`. Signing out in one web tab signs out the
  others; signing in there with another account signs this tab out too.
  `hooks/useBreakpoint.ts` (768 px).
- `desktop/` own npm project (Electron 42 + electron-builder): `main.js` opens the live web app in a
  locked-down window (no Node, other sites open in the browser, camera allowed for the portal only,
  `offline.html` when unreachable; keeps the old "Class Attendance Portal" data folder so people stay
  signed in). Web updates reach it without a new installer.
- `android/` committed prebuild (**never run `expo prebuild`**); `app/build.gradle` takes the version
  and release signing key from env (`ANDROID_*`, set by the workflow from repo secrets; debug key if
  missing). Launcher icons and splash logo are generated from `assets/images/hstu.png`.
- `.github/workflows/`: `checks.yml` (PRs: tsc + web build), `android.yml` (APK), `desktop.yml`
  (Windows .exe + Linux AppImage). A `v*` tag / GitHub Release attaches `HSTU-Attendance-Portal-*.apk`,
  `HSTU-Attendance-Portal-Setup-*.exe` and `HSTU-Attendance-Portal-*.AppImage`.
- Camera: `expo-camera`; photos: `expo-image-picker` (camera permission also in `app.json` and
  `android/.../AndroidManifest.xml`). QR codes: `react-native-qrcode-svg`.

## Design tokens (match these)
Campus Green, light only (`global.css`, `tailwind.config.js`, `lib/theme.ts`): bg `#F5F7F5`, surface
white, border `#DCE3DD`, text `#17201A`, muted `#525E55`, primary `#0A6B3B` (hover `#08552F`, soft
`#E4F1E8`), present `#15803D`, absent `#B42318`, warn `#9A4A06`, info `#0369A1`. Public Sans; body
15 px, nothing under 12; radius 8 controls / 10 cards (12 on phones); touch targets ≥ 44 px; no
shadows. Text size/colour through `Text` props; icons with explicit `color`/`size`. Details:
`docs/design-system.md`.

## Notes
- Face screens (to be restyled): the old flow followed mockup option C (artifact "Face Attendance Mockups").
- The camera in a browser needs HTTPS or localhost.
- `npx expo install` can't reach Expo's API from some sandboxes: pick versions from
  `node_modules/expo/bundledNativeModules.json` and install with npm (keep `~` ranges).
- Update lockfiles with npm 11 (`npx -y npm@11 install ...`): npm 10 drops the lockfile's `libc` fields.
- Typed routes: `.expo/types/router.d.ts` is generated by `expo start`; after adding routes without the
  dev server, delete it or regenerate it, or `tsc` may reject new hrefs.
  If Electron's binary is missing after an install in `desktop/`, run `node node_modules/electron/install.js`.
