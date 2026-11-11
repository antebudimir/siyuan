---
paths:
  - ".github/workflows/**"
  - "Dockerfile.fork"
  - "app/electron-builder-linux.yml"
  - "README.md"
  - "app/appearance/langs/**"
  - "docs/**"
  - "app/src/types/api/index.d.ts"
  - "app/electron/**"
  - "app/src/config/tabs/**"
  - "kernel/conf/**"
---

# SiYuan Fork — Conflict Resolution

Loaded only when conflict-prone files are involved. When resolving an upstream
merge, the fork side wins in the areas below. Invariants that must always hold
are in `fork-core.md`.

## Per-area resolution

- **CI**: keep fork `cd.yml` / `fork-ci.yml`; adopt upstream
  `desktop-build.yml` / `desktop-package.yml` refactors only when compatible.
- **i18n** (`app/appearance/langs/**`): 3-way key merge — take upstream's new
  keys, keep fork-added keys, keep fork-removed keys absent, prefer fork values
  on true conflicts.
- **Electron** (`app/electron/**`): upstream TypeScript structure wins; port
  fork-only changes (feedback URLs) into `app/electron/window/appMenu.ts`,
  `static/window-languages.json`, `static/error.html`.
- **Docs** (`docs/**`, `README.md`): keep the English-only policy; rebuild
  `docs/README.md` without localized columns; do not restore deleted docs.
- **API types** (`app/src/types/api/index.d.ts`): never hand-merge; run
  `pnpm run api:generate` after resolving Go contracts.
- **Tests**: upstream-added tests may encode upstream behavior that contradicts
  intentional fork changes — update expectations to fork behavior (e.g. lite
  slash menu includes `newSubDocRef`).
- **Removed features**: grep for `inbox`, `wechat`, `bazaar` and remove
  reintroduced references/imports.

## Fork-specific settings to keep consistent across layers

When touching these, update Go structs, TS types, i18n keys and UI together:

- **Block ref style**: `kernel/conf/appearance.go` (`BlockRefStyle`),
  `app/src/types/config.d.ts`, `app/src/types/api/index.d.ts`,
  `app/src/config/tabs/blockRefStyle.ts`, i18n `blockRefStyle*`
- **Custom background**: `CustomBackground`, `customBackground*` keys
- **Entry visibility default**: `EntryVisibilityProfileSimple` (not upstream's `Full`)
- **Mobile bottom bar**: 6 slots, `newDoc` default action
- **Fork feedback URL**: `https://github.com/antebudimir/siyuan/issues`
  (electron `appMenu.ts`, `static/window-languages.json`, `static/error.html`;
  kernel sync message `_kernel.125` is upstream-owned and may stay)
