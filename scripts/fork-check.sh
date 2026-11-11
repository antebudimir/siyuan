#!/usr/bin/env bash
# scripts/fork-check.sh — assert SiYuan fork invariants.
#
# Run before and after every upstream merge. Exits non-zero if an invariant is
# violated, so a bad merge fails loudly instead of drifting silently.
#
#   ./scripts/fork-check.sh            # check
#   ./scripts/fork-check.sh --stamp    # check, then record the upstream
#                                      # AGENTS.md blob for the drift nag
#
# Run after `git fetch upstream`. This script never fetches.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || { echo "not a git work tree"; exit 2; }
fail=0

# --- Files upstream carries that the fork deleted (must not reappear) --------
MUST_BE_ABSENT=(
  app/src/layout/dock/Inbox.ts
  app/src/layout/dock/Inbox.test.ts
  app/src/protyle/preview/wechatMath.ts
  app/src/protyle/preview/wechatMath.test.ts
  kernel/api/inbox.go
  kernel/api/contract_inbox.go
  kernel/api/contract_inbox_test.go
  kernel/apicontract/inbox.go
  kernel/cli/cmd/inbox.go
  kernel/mcp/tools/inbox.go
  kernel/mcp/tools/inbox_test.go
  README.ja.md
  README.tr.md
  README.zh-CN.md
  .github/CONTRIBUTING.zh-CN.md
  docs/API-CONTRACTS.zh-CN.md
  docs/API.ja.md
  docs/API.zh-CN.md
  docs/APPEARANCE-SYNC.zh-CN.md
  docs/ASSET-DOWNLOAD.zh-CN.md
  docs/DATABASE-SUBITEMS.zh-CN.md
  docs/DOCUMENT-ADDRESSING.zh-CN.md
  docs/DOCUMENT-HPATH.md
  docs/ENCRYPTED-NOTEBOOK.zh-CN.md
  docs/LIST-MINDMAP.md
  docs/LONG-TERM-MEMORY.zh-CN.md
  docs/MARKDOWN-EDITOR.zh-CN.md
  docs/PINNED-DOCUMENTS.zh-CN.md
  docs/PLUGIN-PUBLISH.zh-CN.md
  docs/README.zh-CN.md
  docs/RELEASE-VERIFICATION.zh-CN.md
  docs/SKILL-MANAGER.zh-CN.md
  docs/SY-FORMAT.zh-CN.md
  docs/TAB-BLOCK.zh-CN.md
  docs/TEMPLATE-MANAGER.zh-CN.md
  docs/WORKSPACE.zh-CN.md
)
for p in "${MUST_BE_ABSENT[@]}"; do
  [[ -e $p ]] && { echo "REAPPEARED: $p"; fail=1; }
done

# --- Fork-only files that must exist ----------------------------------------
MUST_EXIST=(
  .github/workflows/cd.yml
  .github/workflows/fork-ci.yml
  Dockerfile.fork
  FORK.md
  scripts/fork-check.sh
  .clinerules/fork-core.md
  .clinerules/fork-conflicts.md
  .clinerules/fork-playbook.md
)
for p in "${MUST_EXIST[@]}"; do
  [[ -e $p ]] || { echo "MISSING: $p"; fail=1; }
done

# --- In-place strips: "path::symbol" must NOT appear ------------------------
# The file still exists, so [[ -e ]] cannot catch a reintroduced symbol.
NOT_CONTAIN=(
  'app/src/menus/commonMenuItem.ts::openWechatNotify'
  'app/src/menus/commonMenuItem.ts::openFileWechatNotify'
  'app/src/menus/commonMenuItem.ts::wechatTip'
  'kernel/bazaar/install.go::incPackageDownloads'
  'kernel/bazaar/install.go::addBazaarPackageDownloadCount'
)
for entry in "${NOT_CONTAIN[@]}"; do
  f=${entry%%::*}
  sym=${entry##*::}
  if [[ -f $f ]] && grep -q "$sym" "$f" 2>/dev/null; then
    echo "STRIPPED SYMBOL BACK: $f :: $sym"
    fail=1
  fi
done

# --- Fork default: WebDAV is the sync provider default ----------------------
# Assert the assignment, not mere symbol presence (upstream documents the symbol).
if ! grep -qE 'Provider:[[:space:]]+ProviderWebDAV' kernel/conf/sync.go 2>/dev/null; then
  echo "DEFAULT LOST: kernel/conf/sync.go no longer defaults to ProviderWebDAV"
  fail=1
fi

# --- Changelog nag: WARN (never fail) when code changed after the changelog ---
# The in-app changelog is served from app/changelogs/v<ver>/v<ver>.md, where <ver>
# is the version in app/package.json. A stale entry is invisible, not broken.
ver=$(sed -nE 's/^[[:space:]]*"version":[[:space:]]*"([^"]+)".*/\1/p' app/package.json 2>/dev/null | head -1)
changelog="app/changelogs/v${ver}/v${ver}.md"
if [[ -n ${ver:-} && -f $changelog ]]; then
  last=$(git log -1 --format=%H -- "$changelog" 2>/dev/null || true)
  if [[ -n ${last:-} ]]; then
    range=("$last..HEAD")
    # Only fork work needs a fork entry; upstream commits arrive with their own changelog.
    git rev-parse --verify -q upstream/master >/dev/null 2>&1 && range+=(--not upstream/master)
    pending=$(git rev-list --count --no-merges "${range[@]}" -- app/src kernel 2>/dev/null || echo 0)
    if [[ ${pending:-0} -gt 0 ]]; then
      echo "WARN: $pending fork commit(s) touching app/src or kernel after $changelog was last updated — add a changelog entry"
    fi
  fi
fi

# --- Drift nag: WARN (never fail) when upstream edits AGENTS.md ------------
# merge=ours freezes AGENTS.md, so upstream updates become invisible until a
# manual resync. A permanently red check would be ignored, so this only warns.
STAMP=.git/fork-sync-AGENTS
if git rev-parse --verify -q upstream/master >/dev/null 2>&1; then
  cur=$(git rev-parse upstream/master:AGENTS.md 2>/dev/null || true)
  if [[ -n ${cur:-} && -f $STAMP && "$(cat "$STAMP" 2>/dev/null)" != "$cur" ]]; then
    echo "WARN: upstream edited AGENTS.md since last sync — re-apply the fork pointer, then run: $0 --stamp"
  fi
fi

if [[ ${1:-} == "--stamp" ]]; then
  if git rev-parse --verify -q upstream/master >/dev/null 2>&1; then
    git rev-parse upstream/master:AGENTS.md > "$STAMP" 2>/dev/null || true
    echo "stamped $STAMP with current upstream AGENTS.md blob"
  fi
  exit 0
fi

[[ $fail -eq 0 ]] && echo "fork-check: all invariants hold"
exit $fail
