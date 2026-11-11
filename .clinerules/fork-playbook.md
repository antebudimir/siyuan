# SiYuan Fork — Merge & Release Playbook

Procedure and commands. Invariants live in `fork-core.md`; per-area conflict
rules live in `fork-conflicts.md`.

## Upstream merge playbook (core repo)

1. `git fetch upstream`
2. Back up the CURRENT branch (includes unpushed work — do not branch from
   `origin/fork`):
   `git branch backup/fork-before-upstream-merge-$(date +%F) refs/heads/fork`
3. Merge on a throwaway branch first:
   `git switch -c test-upstream-merge refs/heads/fork && git merge upstream/master --no-commit --no-ff`
4. Resolve by category (see `fork-conflicts.md`).
5. Validate (commands below).
6. Commit the merge, fast-forward `fork`, delete the test branch, keep the
   backup branch for a while.
7. `./scripts/fork-check.sh` must exit 0, then push:
   `git push origin refs/heads/fork`

**Name conflict paths explicitly in prompts during merges** (e.g. "conflicts in
`.github/workflows/cd.yml`") — conditional rules fire on mentioned paths, and a
bare "merge upstream" may not trigger `fork-conflicts.md`.

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
go.dev to `/tmp` if needed):

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
bash ./gradlew :app:tasks --no-daemon   # gradlew is mode 100644; CI injects signings.gradle
```

Android SDK is at `~/Android/Sdk`; Java 21 is installed. A full
`assembleForkRelease` needs `kernel.aar` + `app.zip` from the core build.

## CI differences from upstream

- Fork `cd.yml`: Linux desktop (AppImage + rpm) + Android APK + Docker; no
  macOS/Windows, no ONNX/OCR, no upstream release keys.
- Fork `fork-ci.yml`: Linux kernel/frontend/Docker/desktop CI.
- `Dockerfile.fork`: single `fts5` tag, no sqlcipher, no ONNX.
- `app/electron-builder-linux.yml`: `tar.gz` and `deb` targets commented out.

## Release flow

### Core repo (`antebudimir/siyuan`)

- `cd.yml` runs on tags matching `*-alpha*`, `*-beta*`, `*-rc*`, or manual
  `workflow_dispatch`. A dispatch from the `fork` branch produces the release
  tagged `fork`.
- Builds Linux desktop (AppImage + rpm), the Android APK from
  `antebudimir/siyuan-android@main`, and the Docker image; publishes a draft
  release.

### Android repo (`antebudimir/siyuan-android`)

- `fork-release.yml` runs on tags matching `v*-fork.*` or manual dispatch
  (`siyuan_ref` input, default `fork`).
- Builds the kernel `.aar` with `-tags "fts5 sqlcipher"`, the frontend `app.zip`
  from the fork ref, signs the APK with `ANDROID_KEYSTORE_*` secrets, and
  attaches it to the release.

### Version alignment (critical)

`siyuan-android/build.gradle` must satisfy:

- `siyuanVersionName = "<core package.json version>-fork.<N>"` (CD validates
  `"$VERSION"-fork.*`)
- `siyuanVersionCode` increments independently and monotonically
  (history: 38001 → 38005; currently 38005 for `3.8.10-fork.1`)
- After each upstream Android merge, make two commits:
  1. `Merge remote-tracking branch 'upstream/main'`
  2. `:wrench: fork: align siyuanVersionName with the merged <version> package version (<version>-fork.1)`

Release order: push the release tag to the core repo first, then the same tag to
the Android repo.

### Changelog entries

User-visible changes ship with an entry in the current version's changelog, which
the app serves at Settings - About - Changelog (`/api/system/getChangelog`):

- File: `app/changelogs/v<package.json version>/v<version>.md`. English only —
  the fork's localized-docs policy applies, so do not add `.zh-CN.md`/`.zh-TW.md`
  counterparts.
- Sections, in this order: `### Enhancement`, `### Bugfix`, `### Refactor`,
  `### Development`. Add a section only when you have an entry for it.
- Entry shape: `* [Sentence-case description](https://github.com/antebudimir/siyuan/commit/<sha>)`.
  Link the fork commit — fork work has no upstream issue or PR to point at.
- Reuse the commit subject as the description; list items take no terminal period.
- `scripts/fork-check.sh` warns when `app/src` or `kernel` changed after the
  changelog file was last touched.

Upstream's `scripts/parse-changelog.py` generates lists from GitHub issues by
milestone and only prints to stdout, so it is not applicable to fork work.

## Known pitfalls

- `refs/tags/fork` makes `git push origin fork`, `git branch ... fork` and
  `git switch -` ambiguous. Use `refs/heads/fork` / `HEAD`.
- Use `--no-pager` or `GIT_PAGER=cat` in automation.
- `go` is not preinstalled; download Go 1.26.10 to `/tmp` if a kernel build is needed.
- `app/node_modules` may be installed with `--ignore-scripts`; the Electron
  binary is then missing — run frontend tests directly with `node --import tsx`.
- `gradlew` has mode `100644` in git; CI runs `chmod +x`. Locally use `bash ./gradlew`.
- Upstream Android `main` can be one version ahead (e.g. `3.8.11-alpha.1` on top
  of `v3.8.10`). Merge it, but keep the fork version aligned to the core `package.json`.
- Auto-merge can silently reintroduce removed features. Always grep after resolving.
- `merge=ours` only fires when BOTH sides changed the file relative to the merge
  base. If the fork has not touched `AGENTS.md` since the last merge point,
  upstream's version is taken without a conflict — which is why the drift nag
  exists and why the fork pointer must be re-applied after a resync.

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
