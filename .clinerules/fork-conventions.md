# SiYuan Fork Conventions (antebudimir/siyuan)

This repository is a personal fork of `siyuan-note/siyuan`. Upstream `AGENTS.md`
still applies for general code style and maintenance rules. This file records
fork-specific intent that takes precedence where the two conflict. When in
doubt, preserve fork behavior and adopt upstream implementation details only
when they do not change fork intent.

## Repositories and remotes

| Repo | Local path | Origin | Upstream | Working branch |
|---|---|---|---|---|
| SiYuan core | `/home/admin/Projects/siyuan` | `git@github.com:antebudimir/siyuan.git` | `https://github.com/siyuan-note/siyuan.git` | `fork` |
| Android | `/home/admin/Projects/siyuan-android` | `git@github.com:antebudimir/siyuan-android.git` | `https://github.com/siyuan-note/siyuan-android.git` | `main` |

- Use HTTPS for `upstream` remotes (public fetch works without SSH keys).
- **Never rebase** fork commits. Always merge upstream so fork commit hashes
  stay stable and the merge history documents sync points.
- The tag `refs/tags/fork` exists (old release). `git push origin fork` is
  ambiguous — use `git push origin refs/heads/fork` or `git push origin HEAD:fork`.

## Fork identity and intent

- Unlock third-party sync (S3/WebDAV) without a paid subscription or SiYuan
  account; default sync provider is WebDAV.
- Remove cloud-only and telemetry features; keep the app fully usable
  self-hosted (local AI/OCR, optional OIDC auth).
- Keep the UI clean: "Account & Sync" tab is just "Sync", subscription prompts
  and trial crown are hidden, update checks point at fork releases.
- Desktop builds are Linux-focused (AppImage + rpm); Docker image is built from
  `Dockerfile.fork`.

## Deliberately removed features (keep removed after every merge)

After merging upstream, grep for these and remove any reintroduced references.

1. **Cloud Inbox**
   - UI: `app/src/layout/dock/Inbox.ts` (deleted)
   - Kernel: `kernel/api/inbox.go`, `contract_inbox.go`, `kernel/apicontract/inbox.go`,
     `kernel/cli/cmd/inbox.go`, `kernel/mcp/tools/inbox.go`
   - `kernel/model/cloud_service.go` cloud-shorthand functions
   - i18n keys `inbox`, `inboxTip`, `notifyTime`
   - Dock entry in `app/src/constants.ts` and `inbox` in
     `app/src/util/dockKeymap.ts`
2. **WeChat integration**
   - `openWechatNotify` / `openFileWechatNotify` in
     `app/src/menus/commonMenuItem.ts`
   - `app/src/protyle/preview/wechatMath.ts`, WeChat paths in
     `platformCopy.ts` / `preview/index.ts`
   - i18n keys `wechatReminder`, `wechatTip`, `copyToWechatMP`, `pasteToWechatMP`
3. **Bazaar install telemetry** (`kernel/bazaar/install.go` stat reporting)
4. **Localized documentation** — keep English docs only:
   - Deleted: `README.ja.md`, `README.tr.md`, `README.zh-CN.md`,
     `docs/*.zh-CN.md`, `docs/*.ja.md`, `.github/CONTRIBUTING.zh-CN.md`
   - Exception retained: `docs/PERFORMANCE.zh-CN.md`
   - `docs/README.md` must not list localized columns or links to deleted docs
5. **Subscription/login gating** for third-party sync and AI features
   (`app/src/util/needSubscribe.ts`, sync/account UI tabs)

Note: `kernel/agent/agent.go` still mentions inbox tools in its prompt (a
pre-existing fork inconsistency). Do not treat it as a merge regression, but
also do not wire the tools back in.

## Fork-owned files — do not let upstream overwrite

- `.github/workflows/cd.yml` — fork release pipeline (Linux + Android only; no
  macOS/Windows, ONNX or OCR; no upstream release keys)
- `.github/workflows/fork-ci.yml` — Linux kernel/frontend/Docker/desktop CI
- `Dockerfile.fork` — fts5 only (no sqlcipher, no ONNX)
- `app/electron-builder-linux.yml` — `tar.gz` and `deb` targets are commented
  out; only AppImage + rpm are produced
- `README.md` — fork notice at the top
- `kernel/model/updater_release.go` — fork GitHub release URLs
- `kernel/conf/sync.go` — `ProviderWebDAV` default
- `app/src/config/tabs/syncUi.ts`, `accountUi.ts`
- `app/src/config/tabs/customBackground.ts`, `blockRefStyle.ts`
- `app/src/mobile/util/mobileBottomBar*.ts` — 6 configurable slots,
  `newDoc` default
- `app/src/protyle/hint/slashMenu.ts` — lite mode deliberately includes
  `newSubDocRef` and `blockEmbed`

## Fork-specific settings to keep consistent across layers

When touching these, update Go structs, TS types, i18n keys and UI together:

- **Block ref style**: `kernel/conf/appearance.go` (`BlockRefStyle`),
  `app/src/types/config.d.ts`, `app/src/types/api/index.d.ts`,
  `app/src/config/tabs/blockRefStyle.ts`, i18n `blockRefStyle*`
- **Custom background**: `CustomBackground`, `customBackground*` keys
- **Entry visibility default**: `EntryVisibilityProfileSimple` (not upstream's
  `Full`)
- **Mobile bottom bar**: 6 slots, `newDoc` default action
- **Fork feedback URL**: `https://github.com/antebudimir/siyuan/issues`
  (electron `appMenu.ts`, `static/window-languages.json`, `static/error.html`;
  kernel sync message `_kernel.125` is upstream-owned and may stay)

## Build and validation

### Core (desktop)

```bash
cd app
pnpm install --frozen-lockfile --ignore-scripts   # node 24 in CI; node 22 works for tsc
pnpm run typecheck                                 # 4 tsconfigs incl. electron
pnpm run api:check                                 # requires Go in PATH
python3 scripts/check-lang-keys.py                 # 22 languages, kernel placeholders
pnpm run menu:check
```

Kernel compile check (Go 1.26.10 required; not preinstalled — download from
go.dev if needed):

```bash
cd kernel && go build -tags fts5 ./...
```

Focused frontend tests (no Electron binary needed):

```bash
cd app && node --import tsx --experimental-test-module-mocks --test <test files>
```

### Android

```bash
cd /home/admin/Projects/siyuan-android
node --test scripts/*.test.cjs
# Gradle config check: CI injects signings.gradle; create a temporary one first
bash ./gradlew :app:tasks --no-daemon   # gradlew is not executable in git (mode 100644)
```

Android SDK is at `~/Android/Sdk`; Java 21 is installed. A full
`assembleForkRelease` needs `kernel.aar` + `app.zip` from the core build.

## Upstream merge playbook (core repo)

1. `git fetch upstream`
2. Create a backup branch:
   `git branch backup/fork-before-upstream-merge-<date> origin/fork`
3. Merge on a throwaway branch first:
   `git checkout -b test-upstream-merge origin/fork && git merge upstream/master --no-commit --no-ff`
4. Resolve by category:
   - **CI**: keep fork `cd.yml`/`fork-ci.yml`; adopt upstream
     `desktop-build.yml`/`desktop-package.yml` refactors when compatible
   - **i18n**: do a 3-way key merge — take upstream's new keys, keep fork-added
     keys, keep fork-removed keys absent, prefer fork values on true conflicts
   - **Electron**: upstream TypeScript structure wins; port fork-only changes
     (feedback URLs) into the new modules (`app/electron/window/appMenu.ts`,
     `static/window-languages.json`, `static/error.html`)
   - **Docs**: keep English-only policy; rebuild `docs/README.md` without
     localized columns
   - **API types**: never hand-merge `app/src/types/api/index.d.ts`; run
     `pnpm run api:generate` after resolving Go contracts
   - **Tests**: upstream-added tests may encode upstream behavior that
     contradicts intentional fork changes — update expectations to fork behavior
     (e.g., lite slash menu includes `newSubDocRef`)
   - **Removed features**: grep for `inbox`, `wechat`, `bazaar` and remove
     reintroduced references/imports (auto-merge can silently restore them)
5. Validate (typecheck, api:check, kernel build, lang check, focused tests)
6. Commit the merge with a descriptive body, fast-forward `fork`, delete the
   test branch, keep the backup branch for a while
7. Push with `git push origin refs/heads/fork`

## Release flow

### Core repo (`antebudimir/siyuan`)

- `cd.yml` runs on tags matching `*-alpha*`, `*-beta*`, `*-rc*`, or on manual
  `workflow_dispatch`. A dispatch from the `fork` branch produces the release
  tagged `fork` (existing behavior).
- It builds Linux desktop (AppImage + rpm), Android APK from
  `antebudimir/siyuan-android@main`, Docker image, and publishes a draft release.

### Android repo (`antebudimir/siyuan-android`)

- `fork-release.yml` runs on tags matching `v*-fork.*` or manual dispatch
  (`siyuan_ref` input, default `fork`).
- It builds the kernel `.aar` with `-tags "fts5 sqlcipher"` (sqlcipher is
  mandatory on mobile), the frontend `app.zip` from the fork ref, signs the APK
  with `ANDROID_KEYSTORE_*` secrets, and attaches it to the release.

### Version alignment (critical)

`siyuan-android/build.gradle` must satisfy:

- `siyuanVersionName = "<core package.json version>-fork.<N>"` (CD validates
  `"$VERSION"-fork.*`)
- `siyuanVersionCode` increments independently and monotonically
  (history: 38001 → 38005; currently 38005 for `3.8.10-fork.1`)
- After each upstream Android merge, make two commits like history does:
  1. `Merge remote-tracking branch 'upstream/main'`
  2. `:wrench: fork: align siyuanVersionName with the merged <version> package version (<version>-fork.1)`

Release order per the Android README: push the release tag to the core repo
first, then push the same tag to the Android repo.

## Known pitfalls

- `refs/tags/fork` makes `git push origin fork` ambiguous.
- Git commands can invoke a pager in the user's terminal; use `--no-pager` or
  `GIT_PAGER=cat` in automation.
- `go` is not preinstalled in this environment; download Go 1.26.10 to `/tmp` if
  a kernel build check is needed.
- `app/node_modules` may be installed with `--ignore-scripts`; the Electron
  binary is then missing, so run frontend tests directly with
  `node --import tsx` instead of `pnpm test`.
- `gradlew` has mode `100644` in git; CI runs `chmod +x`. Locally use
  `bash ./gradlew`.
- Upstream Android `main` can be one version ahead (e.g. `3.8.11-alpha.1` as a
  version bump on top of `v3.8.10`). Merge it, but keep the fork version aligned
  to the core `package.json`.
- Auto-merge can silently reintroduce removed features (inbox routes, WeChat
  imports, dock entries). Always grep after resolving conflicts.

## History landmarks

- `7ce1709ff4` — previous upstream merge (v3.8.9)
- `cf5b077f66` — merge of upstream v3.8.10 (2026-11-10)
- `d19cd70` (Android) — `3.8.10-fork.1`, versionCode 38005
- Fork feature commits: `0c7901b4f1` (unlock sync), `a7e62a3189` (fork updater),
  `b3335d1a9e` (no login for third-party sync), `c42132ebaf` (Sync tab),
  `60bb27ebae` (custom background), `20c59ea690` (block ref style),
  `ff71e8c6b1` (remove inbox), `8b659af3ca` (remove WeChat),
  `688a5eb8c5` (remove bazaar telemetry), `56cef0110f` (English-only docs),
  `b4bae2aa97`/`17f32bfc24` (fork CI)
