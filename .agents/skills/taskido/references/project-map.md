# Taskido project map

## Runtime surfaces

| Path | Responsibility |
| --- | --- |
| `electron/main/` | Electron lifecycle, hub/pet windows, tray, local storage, activity hooks, and desktop Supabase integration |
| `electron/preload/` | Safe IPC bridges for hub and pet renderers |
| `src/` | React renderer, hub/pet UI, shared game logic, battle engine, Supabase service, localization, and tests |
| `web/` | Browser entry point, Vite configuration, storage/activity adapters, and deployment notes |
| `assets/` | Renderer public assets, UI art, creature strips, and raw creature inputs |
| `supabase/migrations/` | Ordered database schema, RPC, RLS, auth, realtime, and game-feature migrations |
| `scripts/` | Asset validation and creature sprite generation/post-processing pipeline |
| `.agents/skills/` | Project-specific Codex workflows, including Taskido rules, sprite/map generation, and Supabase guidance |

The Electron renderer exposes `assets/` as its public directory. Aliases are `@renderer` to `src` and `@shared` to `src/shared`.

## Primary commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Electron development mode |
| `npm run dev:web` | Run browser development mode |
| `npm run typecheck` | Type-check without emitting files |
| `npm test` | Run all Vitest tests once |
| `npm run build` | Build Electron main, preloads, and renderer |
| `npm run build:web` | Build the browser target |
| `npm run check:assets` | Check expected general sprite coverage |
| `npm run check:creatures` | Validate creature strips and adaptive frame sizes |
| `npm run creature:batch -- <action>` | Run a creature batch pipeline action |

Discover current `creature:batch` actions from `scripts/batch-creature-species.mjs` or its CLI help before running them.

## Project-local skill routing

| Skill | Use it for |
| --- | --- |
| `taskido` | Repository-wide implementation, debugging, review, testing, and release guidance |
| `generate2dsprite` | Creatures, sprite sheets, animations, combat FX, projectiles, props, transparent frames, and GIF previews |
| `generate2dmap` | Battle arenas, map backgrounds, layered raster maps, reusable props, collision, and trigger zones |
| `supabase` | Supabase Auth, Database, Storage, Realtime, clients, migrations, RLS, and RPC workflows |
| `supabase-postgres-best-practices` | PostgreSQL schema, query, indexing, RLS, configuration, and performance review |

For Taskino creature assets, repository rules override generic asset-skill defaults. Always re-read `scripts/creature-manifest.mjs`, then use the project processing and validation scripts for final runtime output.

## Creature pipeline invariants

Use `scripts/creature-manifest.mjs` as the source of truth. At the time this reference was created:

- Species: `garden`, `blaze-crest`, `crag-shell`, `tide-fin`, `volt-wing`.
- Stages: `egg`, `baby`, `adult`.
- Egg clips: `move`, `hatch`; baby/adult clips: `idle`, `move`, `hurt`, `bite`, `jump`.
- Egg strips contain 6 frames; normal animation strips contain 4 frames.
- Final strips live at `assets/creatures/{species}/{stage}/{clip}.png`.
- Intermediate output lives under `sprite-output/{species}/` and raw inputs under `assets/raw-creatures/{species}/`.
- `assets/creatures/frame-manifest.json` and `src/shared/creatureFrameManifest.ts` must remain synchronized through the generator.
- Magenta is the configured chroma key for current species. Keep hatch frame 6 aligned with the baby idle master so the stage transition does not jump in size or position.

Re-read the manifest rather than assuming this snapshot is current when adding a species or clip.

## Supabase boundaries

- Read `supabase/SETUP.md`, `supabase/config.toml`, and the latest migrations relevant to the feature.
- Keep migration ordering consistent with existing filenames. Note that historical numbering contains gaps and duplicate numeric prefixes; use the Supabase CLI workflow from the `supabase` skill instead of inventing a filename.
- Keep client calls centralized in `src/shared/supabaseService.ts` or the relevant platform adapter.
- Treat migrations, generated TypeScript/domain mappings, RPC inputs/outputs, and RLS policies as one contract; update and test all affected sides.

## Validation routing

- Shared rules or calculations: targeted Vitest file, full `npm test`, then `npm run typecheck`.
- Renderer or Electron integration: `npm run typecheck` and `npm run build`.
- Shared renderer used by browser: add `npm run build:web`.
- UI asset references: `npm run check:assets`.
- Creature art or manifest changes: `npm run check:creatures`, `npm run check:assets`, and relevant build.
- Supabase schema/RLS/RPC: database test query, advisors, targeted client test, typecheck, and affected build.
