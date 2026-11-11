# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Repo conventions

Do not break these when changing code. Refactors must not change behavior; fix bugs in separate steps.

- **Checks:** before finishing, run `bunx tsc --noEmit`, `bun run lint` and `bun run test -- --ci` (as in `.github/workflows/ci.yml`). Use `bun run test`, never `bun test`.
- **Structure:** feature-first: `features/<name>/{components,lib,tests}`. Use the `@/` import alias.
- **UI texts:** all user-facing strings live in `shared/lib/strings.ts`.
- **Logging:** log only through `shared/lib/logger.ts`, not `console.*`.
- **Styles:** in `Styles.ts` files next to the component.
- **Tests:** in `tests/` (or `__tests__/`) folders, named `*-test.ts` / `*-test.tsx`. Add a characterization test before changing untested code.
- **Platform split:** use `*.native.ts` / `*.web.ts` files (see `core/crypto`).
- **Comments:** always in English.
- **Env vars:** read public env vars only through `shared/config/env.ts`.
- **SQL migrations:** add a new timestamped file in `supabase/migrations/`; never edit existing ones. Policies: `drop policy if exists` + `create policy`. RPCs: `security invoker`, `revoke ... from public`, `grant ... to authenticated`.
