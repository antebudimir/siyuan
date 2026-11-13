# SiYuan Fork (antebudimir/siyuan)

A personal fork of [siyuan-note/siyuan](https://github.com/siyuan-note/siyuan).

## Purpose

Unlock third-party sync (S3/WebDAV) without a paid SiYuan account, remove
cloud-only and telemetry features, and keep the app fully usable self-hosted.

## What this fork changes

- **Third-party sync unlocked**: S3 and WebDAV work without a subscription; the
  default sync provider is WebDAV.
- **Cloud features removed**: cloud Inbox, WeChat integration, and bazaar
  install telemetry are gone.
- **Cleaner UI**: "Account & Sync" is just "Sync"; subscription prompts and the
  trial crown are hidden; the in-app updater points at this fork's releases.
- **Select-all loads the whole document**: pressing Ctrl+A again loads the
  remaining blocks and selects everything, with no blocking confirmation.
- **Self-hosted focus**: fully local AI/OCR configuration, optional OIDC auth.
- **Linux-focused desktop builds** (AppImage + rpm) and a Docker image built
  from `Dockerfile.fork`.

## Documentation policy

English only. Upstream's translated docs (`README.zh-CN.md`, `README.ja.md`,
`README.tr.md`, `docs/*.zh-CN.md`, `docs/API.ja.md`, …) are removed and must not
reappear after upstream merges. Exception retained: `docs/PERFORMANCE.zh-CN.md`.

## Where the rules live

- **Invariants** (what must stay removed, which files the fork owns, per-area
  conflict resolution): `.clinerules/fork-core.md`, `.clinerules/fork-conflicts.md`.
- **Merge and release procedure**: `.clinerules/fork-playbook.md`.
- **Mechanical enforcement**: `scripts/fork-check.sh` — run before and after
  every upstream merge.

This file is for humans (purpose and rationale). It intentionally does not
duplicate the invariants.

## Known divergences from upstream `AGENTS.md`

`AGENTS.md` carries `merge=ours`, so upstream edits to it are not auto-applied.
The local copy already diverges from upstream:

- References to `docs/*.zh-CN.md` and `docs/API.ja.md` were removed (English-only).
- Upstream's "Official releases" guidance was replaced: this fork does not cut
  official releases or run the upstream release procedure.

Because of `merge=ours`, future upstream `AGENTS.md` updates are invisible until
manually reconciled. `scripts/fork-check.sh` warns when upstream's blob changes;
re-apply the fork pointer section after reconciling, then run
`./scripts/fork-check.sh --stamp`.
