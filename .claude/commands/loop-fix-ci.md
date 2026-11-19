---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(npx:*)
argument-hint: <PR番号>
description: loop PR の必須チェック失敗またはコンフリクトを直して push する（結果は待たない）
---

# ループ: PR の CI 修理

あなたはループエンジニアリングの修理セッションです。ランナーが選んだ loop PR **#$ARGUMENTS** の必須チェック（`ci-complete`）の失敗、
または main とのコンフリクトを直して push し、終了します。
共通ルールは [docs/loop-session-rules.md](../../docs/loop-session-rules.md) を**最初に読む**こと。

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 対象 PR: !`gh pr view $ARGUMENTS --json number,title,headRefName,mergeStateStatus,headRefOid --jq '"#\(.number) \(.title) [\(.headRefName)] merge=\(.mergeStateStatus) head=\(.headRefOid[0:8])"'`
- チェック状況: !`gh pr checks $ARGUMENTS 2>/dev/null | grep -E 'ci-complete|admin|webapp|knip|coverage|e2e|changes' || echo "(取得できず)"`
- 紐づく Issue: !`gh pr view $ARGUMENTS --json body --jq '.body | [scan("[Cc]loses #([0-9]+)")[]] | join(",")'`

## 手順

### 1. 対象の確認

- `gh pr checkout $ARGUMENTS` でブランチに乗る。
- 修理対象は **必須チェック `ci-complete` の失敗** と **コンフリクト（mergeStateStatus が DIRTY）** だけ。
  `codecov/patch` や Vercel のような必須でないチェックの失敗は修理対象ではない（auto-merge を止めないため）。
  ただし `ci-complete` の失敗原因が `coverage` ジョブなら、それは修理対象。

### 2. 原因の特定と修正

- コンフリクトなら `git merge origin/main` で解消する（`git fetch origin main` を先に行う）。
- チェック失敗なら `gh pr checks $ARGUMENTS` で失敗ジョブを見て、`gh run view <run id> --log-failed` でログを読む。
  ジョブが `ci-complete` の依存（`admin` / `webapp` / `knip` / `coverage` / `e2e`）のどれかを確認し、該当箇所を直す。
- 修正は PR の元の Issue のスコープ内に留める。修正のために新しい機能追加が要るなら、rules.md のスコープアウトの原則に従う。
- rules.md の「ローカル CI」で `pnpm verify`（E2E が落ちていたなら E2E も）を通す。修正の試行は 3 回まで。

### 3. push と記録

- `fix: <何を直したか>` でコミットして push する（auto-merge の予約は生きているので push だけでよい。
  `gh pr view $ARGUMENTS --json autoMergeRequest --jq '.autoMergeRequest != null'` が false なら `gh pr merge $ARGUMENTS --auto --squash` で予約し直す）。
- PR にコメントする: `🤖 CI 修理: <何が落ちていて、何を直したか>（<commit>）`。

### 4. 終了

**CI の再実行結果は待たない。** まだ落ちていれば次の tick のランナーが再びこのコマンドを起動する。

- 直して push できた: `LOOP_RESULT: SUCCESS issue=#<紐づく Issue> pr=<PR URL>`
- 3 回試しても通らない、または原因がループでは解消できない（外部サービス障害、環境依存など）:
  紐づく Issue を `loop:wip` から `loop:blocked`（環境・外部要因）または `loop:human`（判断が必要）に付け替え、
  Issue と PR に状況をコメントし、PR は open のまま `LOOP_RESULT: BLOCKED issue=#<N> reason=<短い理由>` で終了する。
