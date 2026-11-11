# Plan migracji: NextTodo → Expo (RN Web) + Supabase

## Architektura docelowa

Jedna baza kodu (iOS / Android / Web) komunikująca się bezpośrednio
z Supabase przez `supabase-js`. Brak własnego serwera — cała logika
w Postgresie (funkcje RPC) i zabezpieczona przez Row Level Security (RLS).

## Co się przenosi łatwo
- Typy TypeScript (`types/`) — prawie bez zmian
- Schemat bazy danych (Prisma → Postgres, mapowanie niemal 1:1)
- Czysta logika biznesowa (walidacja, obliczanie czasu Pomodoro)

## Co trzeba napisać od nowa
- Cała warstwa UI (~75 komponentów, 27 modułów CSS) → prymitywy RN
- Zależności webowe: react-router, react-day-picker, @dnd-kit,
  createPortal, new Audio(), localStorage, window.*
- Model uwierzytelniania: cookie → tokeny Supabase

## Fazy

### Faza 0 — Inicjalizacja 
- Utworzyć projekt Supabase (url + anon key)
- Utworzyć projekt Expo z TypeScript i Expo Router
- Zainstalować zależności (supabase-js, async-storage, secure-store,
  nativewind, reanimated, gesture-handler, lucide-react-native, expo-av)
- Skonfigurować klienta Supabase z zapisem sesji w SecureStore
- Sprawdzić uruchomienie na telefonie (Expo Go) i w web

### Faza 1 — Schemat bazy + RLS 
- Przenieść schemat Prisma do Postgres
- Użytkownik → `auth.users` (Supabase) + tabela `profiles`
  (username, settings JSON, isActive, lastLogin) — bez hasła
- Tabele: `tasks`, `categories`, `tags`, `task_tags`, `pomos`
- Włączyć RLS na każdej tabeli: `user_id = auth.uid()`
- Trigger: automatyczne tworzenie `profiles` przy rejestracji
- Wszystko jako migracje SQL w repozytorium

### Faza 2 — Logika biznesowa → funkcje RPC 
- `start_pomo` (z ograniczeniem: tylko jedna aktywna sesja)
- `pause_pomo`, `resume_pomo` (przeliczanie `elapsed` po stronie bazy)
- `end_pomo` (finalny czas + `endedAt`)
- `pomo_history` (ostatnie 5 zakończonych sesji)
- `reorder_tasks` (masowa aktualizacja `sortOrder`)
- Prosty CRUD (zadania, kategorie, tagi) — bez RPC, przez `supabase.from(...)`

### Faza 3 — Warstwa typów i API 
- Przenieść `types/` bez zmian
- Przepisać `taskApi`, `auth`, `categoryApi`, `tagApi`:
  `fetch` → wywołania `supabase`, zachowując te same nazwy funkcji

### Faza 4 — Uwierzytelnianie 
- Zamienić cookie-JWT na Supabase Auth (email + hasło)
- `AuthContext` → `supabase.auth.onAuthStateChange`
- `ProtectedRoute` → przekierowanie na podstawie sesji
- Ekrany Login / Registration na prymitywach RN
- Import istniejących użytkowników (Supabase obsługuje hasła bcrypt)

### Faza 5 — Przepisanie UI (główna praca)
- Szkielet: Expo Router, MainContent, Header, Sidebar (Drawer)
- Zadania: ActiveTasks, CompletedTasks, ToDoItem, Add/EditTaskModal (Modal)
- Kategorie/tagi: CategoryModal, TagModal, TagChipPicker
- Pomodoro: PomodoroTimer, PomodoroHistory (expo-av zamiast Audio)
- Ustawienia/motyw: UserSettings, ThemeSwitch, ThemeContext (AsyncStorage)
- Drag & drop: reanimated + gesture-handler (najbardziej pracochłonne)
- Drobne: Button, Field, Loader, Toasts, SplashScreen, ErrorBoundary

### Faza 6 — Build web i finał 
- Build wersji web (`expo export --platform web`)
- Responsywność: telefon (drawer/bottom-sheet) vs web (szeroki layout)
- Testy: Vitest → Jest + @testing-library/react-native
- Testy na prawdziwym urządzeniu i w web

## Szacowany czas
Ok. 4–6 tygodni dla dwóch osób w spokojnym tempie.

## Ryzyka
- Drag & drop jest trudniejszy w RN niż @dnd-kit
- Dokładność timera Pomodoro przy zminimalizowanej aplikacji
  (obliczanie od `startedAt`/`now()` już to rozwiązuje)
- Nauka polityk RLS, jeśli nie było wcześniej doświadczenia

## Refaktoryzacja po migracji (status)

Zasady: bez zmian zachowania, jeden krok = jedna jednostka pracy, po każdym kroku
`bunx tsc --noEmit` i `bun run test -- --ci`.

- [x] Faza 0 — siatka bezpieczeństwa (testy charakteryzujące)
- [x] Faza 1 — zmiany mechaniczne i martwy kod
- [x] Faza 2 — DRY w UI
- [x] Faza 3 — stan i renderowanie
- [x] Faza 4 — warstwa danych
- [x] Faza 5 — auth i crypto
- [x] Faza 6 — SQL
- [x] Faza 7 — CI i dokumentacja (lint, expo-doctor, smoke `expo export -p web`; konwencje w `AGENTS.md`; README.*)
