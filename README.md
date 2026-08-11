# FlowTodo

Port [NextTodo](https://github.com/matt400/NextTodo) na **Expo (React Native)** + **Supabase** — iOS, Android i web z jednej bazy kodu.

## Screenshots

| | |
|:--|:--|
| ![Splash](docs/screenshots/01-splash.jpg) | ![Active](docs/screenshots/02-active.jpg) |
| *Splash* | *Active tasks* |
| ![Settings](docs/screenshots/03-settings.jpg) | ![Completed](docs/screenshots/04-completed.jpg) |
| *3 · Settings* | *4 · Completed* |

## Status

**v1.0** — core flow jest spięty z Supabase (auth, tasks, pomodoro, settings).

| Obszar | Stan |
|--------|------|
| Auth (login / register / session) | Supabase Auth + `profiles` |
| Change password / delete account | Settings + RPC `delete_own_account` |
| Theme + Pomodoro duration | Zapis w `profiles` |
| Tasks / categories / tags | Supabase + RLS; demo seed dla nowych userów |
| Pomodoro timer + historia | Tabela `pomodoros` + UI |
| Splash screen | Brand overlay przy starcie sesji |
| Drag & drop / reorder | Native: long-press; web: ↑/↓; `sort_order` w DB |
| Toasty | Globalny `ToastContext` / `ToastHost` |
| Haptics | Drag, complete, delete (native) |
| Network awareness | Offline banner + refetch on reconnect; network toasts |

## Stack

| Warstwa | Wybór |
|---------|--------|
| Framework | Expo SDK **54** + Expo Router |
| UI | React Native + `react-native-web`, StyleSheet |
| Ikony | `lucide-react-native` |
| Auth / DB | Supabase (`supabase-js`), sesja w AsyncStorage |
| Gestures / DnD | `gesture-handler`, `reanimated`, `react-native-draggable-flatlist` |
| Feedback | `expo-haptics`, custom toasts |
| Dźwięk | `expo-av` (alarm Pomodoro) |

## Supabase migrations

Kolejność w `supabase/migrations/`:

1. `001_profiles.sql` — profil + settings
2. `002_tasks_domain.sql` — tasks / categories / tags + RLS
3. `003_grants.sql` — GRANTy dla `authenticated`
4. `004_delete_own_account.sql` — RPC usuwania konta
5. `005_pomodoros.sql` — sesje i historia Pomodoro

Odpal migracje w projekcie Supabase (SQL Editor albo CLI) w tej kolejności na świeżej bazie.

## Run

```bash
npm install
cp .env.example .env   # uzupełnij klucze lokalnie
npm start -- -c
```

`w` = web · Expo Go = QR z terminala · SDK celowo **54** pod aktualne Expo Go.

## Android APK

```bash
npx eas-cli login
npx eas-cli build:configure   # once — links Expo projectId into app.json
npx eas-cli env:set preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR.supabase.co" --visibility plaintext --non-interactive
npx eas-cli env:set preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key" --visibility sensitive --non-interactive
npx eas-cli build -p android --profile preview
```

Profil `preview` w `eas.json` buduje **APK** (nie AAB). Po buildzie Expo daje link do pobrania — na telefonie trzeba zezwolić na instalację z nieznanych źródeł.

## Tests

```bash
npm test
```

Stack: **Jest** + **jest-expo** + **@testing-library/react-native**.  
Must-have coverage for now: auth validation (+ login smoke), network errors, task/pomo mappers, filtered reorder, offline banner.
