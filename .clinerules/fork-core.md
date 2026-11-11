# SiYuan Fork — Core Invariants (antebudimir/siyuan)

This repository is a personal fork of `siyuan-note/siyuan`. Upstream `AGENTS.md`
applies for general code style and maintenance rules. This file records the
fork's non-negotiable invariants that take precedence where the two conflict.

**Enforcement:** run `scripts/fork-check.sh` before and after every upstream
merge. It asserts the invariants below mechanically.

## Identity and intent

- Unlock third-party sync (S3/WebDAV) without a paid subscription or SiYuan
  account; the default sync provider is WebDAV.
- Remove cloud-only and telemetry features; keep the app fully usable
  self-hosted (local AI/OCR, optional OIDC auth).
- Keep the UI clean: "Account & Sync" is just "Sync", subscription prompts and
  the trial crown are hidden, update checks point at fork releases.
- Desktop builds are Linux-focused (AppImage + rpm); the Docker image is built
  from `Dockerfile.fork`.

## Repositories and remotes

| Repo | Local path | Origin | Upstream | Working branch |
|---|---|---|---|---|
| SiYuan core | `/home/admin/Projects/siyuan` | `git@github.com:antebudimir/siyuan.git` | `https://github.com/siyuan-note/siyuan.git` | `fork` |
| Android | `/home/admin/Projects/siyuan-android` | `git@github.com:antebudimir/siyuan-android.git` | `https://github.com/siyuan-note/siyuan-android.git` | `main` |

- Use HTTPS for `upstream` remotes (public fetch works without SSH keys). Remotes
  are not versioned: a fresh clone has only `origin`, so run
  `git remote add upstream https://github.com/siyuan-note/siyuan.git` first or the
  drift nag silently no-ops.
- **Never rebase** fork commits. Always merge upstream so fork commit hashes stay
  stable and the merge history documents sync points.
- The tag `refs/tags/fork` exists (old release). `git push origin fork` is
  ambiguous — use `git push origin refs/heads/fork` or `git push origin HEAD:fork`.
  The same ambiguity affects `git branch ... fork` and `git switch -`; use
  `refs/heads/fork` or `HEAD`.

## Fork-owned files — never let upstream overwrite

These files are fork-authored or fork-modified. `AGENTS.md` and `FORK.md` carry
`merge=ours` in `.gitattributes`; the rest must be kept by hand on conflict.

- `.github/workflows/cd.yml` — fork release pipeline (Linux + Android only; no
  macOS/Windows, ONNX or OCR; no upstream release keys)
- `.github/workflows/fork-ci.yml` — Linux kernel/frontend/Docker/desktop CI
- `Dockerfile.fork` — fts5 only (no sqlcipher, no ONNX)
- `app/electron-builder-linux.yml` — `tar.gz` and `deb` targets are commented
  out; only AppImage + rpm are produced
- `README.md` — fork notice at the top
- `kernel/model/updater_release.go` — fork GitHub release URLs
- `kernel/conf/sync.go` — `Provider: ProviderWebDAV` default
- `app/src/config/tabs/syncUi.ts`, `accountUi.ts`
- `app/src/config/tabs/customBackground.ts`, `blockRefStyle.ts`
- `app/src/mobile/util/mobileBottomBar*.ts` — 6 configurable slots, `newDoc` default
- `app/src/protyle/hint/slashMenu.ts` — lite mode deliberately includes
  `newSubDocRef` and `blockEmbed`

## Deliberately removed — keep removed after every merge

Auto-merge can silently reintroduce these. `scripts/fork-check.sh` asserts the
deletions and in-place strips below.

### Deleted files (must not reappear)

- Inbox UI: `app/src/layout/dock/Inbox.ts`, `Inbox.test.ts`
- Inbox kernel: `kernel/api/inbox.go`, `contract_inbox.go`, `contract_inbox_test.go`,
  `kernel/apicontract/inbox.go`, `kernel/cli/cmd/inbox.go`,
  `kernel/mcp/tools/inbox.go`, `inbox_test.go`
- WeChat preview: `app/src/protyle/preview/wechatMath.ts`, `wechatMath.test.ts`
- Localized docs: `README.ja.md`, `README.tr.md`, `README.zh-CN.md`,
  `docs/*.zh-CN.md`, `docs/API.ja.md`, `.github/CONTRIBUTING.zh-CN.md`,
  `docs/DOCUMENT-HPATH.md`, `docs/LIST-MINDMAP.md`
- Exception retained: `docs/PERFORMANCE.zh-CN.md`

### Stripped in place (symbols must stay absent)

- `app/src/menus/commonMenuItem.ts` — no `openWechatNotify`,
  `openFileWechatNotify`, `wechatTip`
- `kernel/bazaar/install.go` — no `incPackageDownloads`,
  `addBazaarPackageDownloadCount`
- i18n keys `inbox`, `inboxTip`, `notifyTime`, `wechatTip`, `copyToWechatMP`,
  `pasteToWechatMP`
- Dock entry for inbox in `app/src/constants.ts`; inbox key in
  `app/src/util/dockKeymap.ts`

Note: `kernel/agent/agent.go` still mentions inbox tools in its prompt (a
pre-existing fork inconsistency). Do not treat it as a merge regression, but do
not wire the tools back in.

## Build tags

- Desktop kernel: `go build -tags fts5 ./...` (no sqlcipher)
- Mobile kernel: `go build -tags "fts5 sqlcipher"` (sqlcipher mandatory on Android)

## Verification

```bash
./scripts/fork-check.sh          # assert these invariants; must exit 0
```

User-visible changes also need a changelog entry in the current version's file —
see `fork-playbook.md` (Changelog entries).

See `fork-conflicts.md` for per-area conflict resolution and cross-layer
settings, and `fork-playbook.md` for the merge procedure, build/validation
commands, release flow and CI differences.
