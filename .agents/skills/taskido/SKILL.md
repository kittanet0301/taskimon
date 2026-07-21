---
name: taskido
description: Maintain the Taskido repository and its Taskino desktop/web virtual-pet game. Use for any project-specific implementation, debugging, review, testing, build, Electron/React UI, game-state, creature, sprite-pipeline, Supabase integration, migration, battle, chat, inventory, market, minigame, localization, or release task in this repository.
---

# Taskido

Work from the repository root. Treat `taskido` as the repository/skill name and `Taskino` as the product and package name; preserve the existing name used by each file or UI surface.

## Start with repository evidence

1. Read `package.json` before choosing commands or dependencies.
2. Inspect the smallest relevant source path and its tests before editing.
3. Read [references/project-map.md](references/project-map.md) when locating code, choosing validation, changing creatures, or touching Supabase.
4. Preserve unrelated working-tree changes, especially generated or binary assets.

## Route work by area

- Edit Electron main-process and native integration code under `electron/main/`.
- Edit context bridges under `electron/preload/`; keep renderer-facing types aligned in `src/api/types.ts`.
- Edit the shared React renderer and game domain under `src/`.
- Edit the browser-specific adapter under `web/`; reuse shared renderer/domain code rather than forking behavior when possible.
- Edit database history only through a new file under `supabase/migrations/`. Invoke the project `supabase` skill for every Supabase task and `supabase-postgres-best-practices` for SQL, schema, RLS, indexing, or performance work.
- Treat `assets/creatures/`, `assets/raw-creatures/`, `sprite-output/`, and generated frame manifests as a pipeline. Invoke `generate2dsprite` for AI-generated creature animation sheets and follow the existing processor scripts instead of manually slicing or resizing images.

## Implement safely

- Keep game rules and reusable types in `src/shared/`; avoid duplicating rules inside UI components.
- Add or update nearby Vitest tests for changes to pure game logic, state transitions, battle calculations, inventory, market, missions, or minigame physics.
- Keep Thai and English translations aligned in `src/i18n/locales/th.json` and `src/i18n/locales/en.json` when changing user-visible text.
- Do not hand-edit generated files when their header or pipeline identifies a generator. Run the owning generator and review its output.
- Never expose Supabase secret or `service_role` keys to renderer or web code. Public clients may use only publishable/anon configuration.
- Preserve RLS ownership checks and validate both allowed and denied access when database authorization changes.

## Verify proportionally

Run the narrowest relevant checks first, then broaden when the change crosses boundaries:

```text
npm test -- <test-file-or-pattern>
npm run typecheck
npm run check:assets
npm run check:creatures
npm run build
npm run build:web
```

Use `npm test` for the full unit suite. Run both desktop and web builds when shared renderer or domain code changes. For creature pipeline changes, run both asset checks after processing. For Supabase changes, follow the Supabase skill's advisor and verification workflow rather than treating a successful SQL parse as sufficient.

## Finish

Review `git diff` and `git status`. Report the affected surface, validation run, and any generated files or migrations. Do not stage, commit, deploy, push migrations, or mutate production unless the user explicitly requests that action.
