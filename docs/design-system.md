# Design system (Campus Green)

The look chosen by the owner (mockup A). Rules and routes: `docs/redesign.md`. API: the backend's
`docs/api-v2.md`. Light theme only, English only, **no animations or effects** (no Animated, no
transitions, no press-scale, no shadows, gradients or blur; dialogs appear at once).

## Tokens

Defined three times, keep them in step: CSS variables in `global.css`, Tailwind colours in
`tailwind.config.js`, hex values in `lib/theme.ts` (for icon colours, spinners, the navigation theme).

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| bg | #F5F7F5 | `bg-bg` | page background |
| surface | #FFFFFF | `bg-surface` | cards, bars, inputs |
| border | #DCE3DD | `border-border` | 1 px borders, dividers |
| text | #17201A | (Text default) | main text |
| muted | #525E55 | `tone="muted"` | secondary text |
| primary / hover / soft | #0A6B3B / #08552F / #E4F1E8 | `bg-primary`, `bg-primary-hover`, `bg-primary-soft` | buttons, links, active nav |
| present | #15803D | `tone="present"` | Present (text on white, bars) |
| absent / soft | #B42318 / #FDECEA | `bg-absent`, `bg-absent-soft` | Absent, destructive, error panels |
| warn / ink / soft / border | #9A4A06 / #7A3B05 / #FDF1E1 / #F2D3AE | `bg-warn-soft`, `border-warn-border` | below the minimum |
| info / soft | #0369A1 / #E0F2FE | `bg-info-soft` | neutral information |
| track | #E6EBE7 | `bg-track` | progress bar track |

- Type (Public Sans, one font file per weight, loaded in `app/_layout.tsx`; system font until it
  loads): caption 12, small 13, body 15, section 17, page title 20 phone / 26 desktop, stat 26,
  code 40. Nothing under 12.
- Radius: 8 controls (`rounded-control`), 10 cards (`rounded-card`; 12 on phones,
  `rounded-card-phone`), 999 pills (`rounded-pill`). Spacing 4/8/12/16/20/24/32 (`1 2 3 4 5 6 8`).
- Touch targets at least 44 px. Contrast AA (present text on `primary-soft` uses the primary green).
- Status is never colour alone: pills carry words and an icon; warnings carry words.
- Breakpoint 768 px (`useBreakpoint()`): sidebar at or above, phone layout below.

## Text and colour in code

- All text goes through `Text` (`variant`, `weight`, `tone`, `tabular`, `align`). It sets size,
  weight and colour with style props, which work the same on web and Android. Use `className` on
  Text only for layout (margins, flex). `variant="title"`/`"section"` are headings.
- Icons: `<Icon as={BookOpen} size={20} color="primary" />` (lucide). Always explicit `color`/`size`:
  class names do not colour SVG icons on Android.
- Views: Tailwind classes for layout, background and borders (`bg-surface border border-border`).
- `cn()` (`lib/utils.ts`) merges classes; `FOCUS_RING` adds the keyboard focus outline on the web.

## Components (`components/ui/`, import from `@/components/ui`)

| Component | Use it for |
|---|---|
| `Button` | Actions. `primary` = the main action of an area (one), `secondary` = others, `quiet` = low-key (add `destructive` for red text), `danger` = delete/discard. `loading` shows a spinner and blocks presses. Always a word label. |
| `IconButton` | 44 × 44 icon-only buttons (close, show password); needs `accessibilityLabel`. |
| `TextField` | Text input with `label`, `hint`, `error`. Errors are announced. |
| `PasswordField` | Password with show/hide; `autoComplete="new-password"` when choosing one. |
| `SearchField` | Search box with clear button (label hidden but read). |
| `Select` | Pick one from a list (opens a dialog; same on web and phones). |
| `Checkbox` | On/off with its label; the whole row is the target. |
| `DateField` | A date as "05 Oct 2026", calendar grid; `noFuture` for attendance dates (Dhaka time). |
| `Dialog` | A centred dialog; closes on the X, backdrop, Android back and Escape (unless `dismissable={false}`). |
| `useConfirm()` | Yes/no questions: `if (await confirm({ title, message, destructive: true }))`. Never `Alert.alert`. |
| `useMessage()` | Short results at the top: `message.success('Saved.')`, `message.error(error.message)`, `message.info(...)`. Stays until closed or 5 s. |
| `Notice` | Inline panel in a page or form: `info`, `warn`, `error`, `success` (e.g. sign-in errors). |
| `Card` | White box with border; optional `title`, `titleNote`, `actions`; `padded={false}` for lists. |
| `StatTile` | One number with a label; `tone="warn"` when it needs attention. |
| `Pill` / `StatusPill` | Small labels (`Live`, `Finished`); `StatusPill` for Present / Absent / Not enrolled. |
| `ProgressBar` | Attendance bars; `min={75}` turns it orange below the minimum. Pair with the number. |
| `Tabs` + `useTab()` | Tabs inside a page; links that set `?tab=` so reload and back work. |
| `DataTable` | Tables at ≥ 768 px (in a `Card padded={false}`). |
| `ListRow` | The same rows on phones, or short lists anywhere. |
| `EmptyState` / `ErrorState` / `LoadingState` | Nothing yet (say why, offer the action) / failed with Retry / plain spinner with "Loading…". |
| `PageHeader` | Top of every page: breadcrumb, title, meta line, actions. |
| `Avatar` | Initials in a circle (no photos). |
| `TextLink` | Green link text; wrap in `<Link href asChild>` to navigate. |

## Layout (`components/layout/`)

- `AppShell`: signed-in frame. ≥ 768 px: sidebar (logo, role nav from `nav.ts`, the user at the
  bottom → Account). Phones: top bar (logo and name, account button) and a bottom tab bar (items with
  `tab`; the rest under "More"). Safe-area insets on every edge. `/teacher/live/*` has no shell.
- `RequireAuth`: guard used by the route-group layouts (`app/(app)/_layout.tsx` for everyone signed in,
  `app/(app)/{student,teacher,admin}/_layout.tsx` per role). Signed out → `/login?redirect=…`; wrong
  role → own home.
- `Page`: the scrolling content column (max 1200 px; padding 24/32 desktop, 8/20 phone; 20 px gaps).
- `PublicPage`: pages without the shell (sign-in, about): logo and name, a centred column, footer links.
- `PlaceholderPage` / `PublicPlaceholder`: routes whose screen is still being rebuilt.

## Page patterns

- Signed-in page: `<Page>` → `<PageHeader title breadcrumb meta actions />` → cards. Load with
  `LoadingState`, fail with `ErrorState` + Retry, empty with `EmptyState`.
- Lists: `DataTable` on desktop, `ListRow`s in a `Card padded={false}` on phones.
- Forms: fields in a column with 16 px gaps, the primary button last; show server field errors with
  `error.field('email')` on the field and other errors in a `Notice` or `message.error`.
- Destructive actions ask with `useConfirm({ destructive: true })`, then report with `useMessage()`.
- Data: screens call `lib/api/*` only. Errors are `ApiError {message, code, fieldErrors, status}`;
  `message` is always readable. Dates/times/percentages/names through `lib/format.ts`.
