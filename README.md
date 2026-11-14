# FlowTodo

**English** · [Polski](README.pl.md) · [Українська](README.ua.md)

A port of [NextTodo](https://github.com/matt400/NextTodo) to **Expo (React Native)** + **Supabase**: iOS, Android and web from a single codebase.

**Live (web):** [flowtodo-expo-supabase.vercel.app](https://flowtodo-expo-supabase.vercel.app)  
**v2.0.1-alpha:** [Release](https://github.com/ep1cvoice/flowtodo-expo-supabase/releases/tag/v2.0.1-alpha) (the APK is attached to the release).

## Screenshots

| | |
|:--|:--|
| ![Log in](docs/screenshots/log-in.jpg) | ![Active tasks](docs/screenshots/active-tasks.jpg) |
| *Log in* | *Active* |
| ![Task detail](docs/screenshots/task-detail-view.jpg) | ![Completed](docs/screenshots/completed.jpg) |
| *Task detail* | *Completed* |
| ![Settings](docs/screenshots/user-settings.jpg) | ![Active light](docs/screenshots/active-light-mode.jpg) |
| *Settings* | *Active (light)* |

## Status

**v1.0**: the core flow is wired to Supabase (auth, tasks, Pomodoro, settings).

| Area | State |
|------|-------|
| Auth (login / register / session) | Supabase Auth + `profiles` |
| Change password / delete account | Settings + `delete_own_account` RPC |
| Theme + Pomodoro duration | Stored in `profiles` |
| Tasks / categories / tags | Supabase + RLS; demo seed for new users |
| Pomodoro timer + history | `pomodoros` table + UI |
| Splash screen | Brand overlay on session start |
| Drag & drop / reorder | Native: long-press; web: ↑/↓; `sort_order` in the DB |
| Toasts | Global `ToastContext` / `ToastHost` |
| Haptics | Drag, complete, delete (native) |
| Network awareness | Offline banner + refetch on reconnect; network toasts |

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo SDK **57** + Expo Router |
| Package manager | **Bun** (`bun.lock`); Node.js LTS is still needed for some Expo commands |
| UI | React Native + `react-native-web`, StyleSheet |
| Icons | `lucide-react-native` |
| Auth / DB | Supabase (`supabase-js`), session in AsyncStorage |
| Gestures / DnD | `gesture-handler`, `reanimated`, `react-native-sortables` |
| Feedback | `expo-haptics`, custom toasts |
| Sound | `expo-av` (Pomodoro alarm) |

## Supabase migrations

Order in `supabase/migrations/`:

1. `20260802120000_profiles.sql`: profile + settings
2. `20260807120000_tasks_domain.sql`: tasks / categories / tags + RLS
3. `20260807120100_grants.sql`: grants for `authenticated`
4. `20260808120000_delete_own_account.sql`: account deletion RPC
5. `20260810120000_pomodoros.sql`: Pomodoro sessions and history
6. `20260812120000_tasks_completed_at.sql`: `completed_at` on tasks
7. `20260812120100_filter_limits.sql`: shared filter limit (`max_filter_selections`, 5–30)
8. `20260818211218_e2ee_new.sql`: end-to-end encryption setup
9. `20260819080404_add_encryption_backup_fields_to_profiles.sql`: encryption backup fields in `profiles`
10. `20260819081549_add_encrypted_content_columns.sql`: encrypted content columns
11. `20260820214848_add_kdf_iterations_to_profiles.sql`: KDF iterations in `profiles`
12. `20261104180500_drop_plaintext_columns.sql`: drop plaintext columns
13. `20261109120000_reorder_tasks.sql`: `reorder_tasks` RPC
14. `20261109130000_update_task_with_tags.sql`: `update_task_with_tags` RPC
15. `20261110120000_pomodoro_paused_on_logout.sql`: Pomodoro paused on logout
16. `20261111120000_profiles_demo_seeded.sql`: `demo_seeded` flag in `profiles`
17. `20261111120100_seed_demo_data.sql`: demo data seed
18. `20261111120200_tasks_done_generated.sql`: generated `done` column on tasks
19. `20261112120000_rls_select_auth_uid.sql`: RLS: `(select auth.uid())` for better plans
20. `20261112120100_tasks_indexes.sql`: task indexes
21. `20261112120200_reorder_tasks_skip_unchanged.sql`: `reorder_tasks` skips unchanged rows

On a fresh database, run the migrations in this order (SQL Editor or CLI).

## Run

Install [Bun](https://bun.sh/docs/installation), then:

```bash
bun install
cp .env.example .env   # fill in your keys locally
bun start -- -c
```

`w` = web · Expo Go = scan the QR code from the terminal · SDK **57** on purpose, to match the current Expo Go.

| Task | Command |
|------|---------|
| Dev server | `bun start` |
| Android | `bun run android` |
| iOS | `bun run ios` |
| Web | `bun run web` |
| Add an Expo library | `bun expo install <pkg>` |

## Android APK

```bash
bunx eas-cli login
bunx eas-cli build:configure   # once: links the Expo projectId into app.json
bunx eas-cli env:set preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR.supabase.co" --visibility plaintext --non-interactive
bunx eas-cli env:set preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key" --visibility sensitive --non-interactive
bunx eas-cli build -p android --profile preview
```

The `preview` profile in `eas.json` builds an **APK** (not an AAB). After the build, Expo gives you a download link; on the phone you need to allow installs from unknown sources. EAS uses Bun because the repo has a `bun.lock`.

## Web (Vercel)

A push to `main` triggers a deploy. Vercel env vars (build time): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Config: `vercel.json`.

## Tests

```bash
bun run test
```

Use `bun run test`, not `bun test`: that one is Bun's own runner, not Jest.

Stack: **Jest** + **jest-expo** + **@testing-library/react-native**.  
Current must-have coverage: auth validation (+ login smoke test), network errors, task/Pomodoro mappers, filtered reorder, offline banner.

## Checks and CI

Run the same checks as CI before opening a PR:

`bun run lint` · `bunx tsc --noEmit` · `bun run test -- --ci`

`.github/workflows/ci.yml` also runs `bunx expo-doctor` (advisory) and a smoke `bunx expo export -p web` build (with dummy env vars).

Project conventions (strings, logger, SQL migrations, English comments) are listed in `AGENTS.md`.

## Local-first data (native) and web

- **Native (iOS/Android):** tasks, categories and tags live in a per-user SQLite database
  (`core/localdb`, `features/tasks/lib/store/localStore.ts`). Reads and writes never wait for
  the network. Changes are marked `dirty`/`deleted` and pushed to Supabase in the background
  (`syncEngine.ts`), then the remote state is pulled. Sync runs after every write, on
  reconnect, and when the app returns to the foreground. Only ciphertext is stored locally.
  Conflict policy: last write wins; a pending local change beats a remote change or delete.
- **Web:** the same local-first store, running on expo-sqlite's web build (wa-sqlite, persisted
  in the browser's OPFS; alpha upstream). It needs a cross-origin isolated page
  (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`),
  set in `metro.config.js` (dev) and `vercel.json` (production); any other host must send the
  same headers. If the page is not isolated, OPFS is missing, or the database cannot be opened
  (e.g. another tab holds its exclusive lock), the web build transparently stays online-only
  (`features/tasks/lib/store/fallbackStore.ts`).
- **Web offline:** a service worker (`public/sw.js`, registered in production builds from
  `app/+html.tsx`) caches pages (network first, 3 s timeout when a copy exists) and the
  content-hashed `/_expo` and `/assets` files, so the app opens without a connection after one
  online visit. Offline sign-in uses the same cache as native (`core/auth/offlineCache.ts`, in
  localStorage).
- **Sync status:** a cloud button in the header of the main (Active) screen opens a sheet with
  syncing / pending changes / last error / last sync time and a "Sync now" button. A dot on the
  button flags pending changes or errors. Shown whenever the local database is in use (native, and web when isolated).
- **Pomodoro:** starting a session first flushes pending changes (`taskStore.flush`), so the
  `task_id` foreign key always exists on the server. Pomodoro itself stays online-only.
- **Id collisions:** ids are client-generated; if the server reports an id owned by another
  user, the sync engine re-ids the row and retries.
- **Offline sign-in (native and web):** after one online sign-in the profile row (settings + the
  password-wrapped DEK material, i.e. what the server already stores) is cached in
  AsyncStorage (`core/auth/offlineCache.ts`). Offline, the password is verified by unwrapping
  the DEK; the app opens on the cached account and the local database. Back online, the
  Supabase session is created silently (the password is held in memory only until then) and a
  sync runs. An access token that expired while offline is handled the same way: the app opens
  on the cached account and supabase-js refreshes the token on reconnect. Logout keeps the
  cache (so offline sign-in still works); account deletion wipes it.
- **Needs a connection:** the first sign-in on a device (there is no cached account or data
  yet) and the one-time demo seed (a server-side atomic RPC).
- **Native build:** `expo-sqlite` is a native module, so a new dev client / prebuild is required.
- Jest maps `@/features/tasks/lib/store` to the online-only store (`index.remote.ts`), so context tests keep
  mocking `queries` / `mutations`; the local store is covered in `store/__tests__`.
