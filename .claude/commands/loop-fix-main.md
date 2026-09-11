---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(npx:*)
description: main の CI 失敗を直す PR を作る（結果は待たない）
---

# ループ: main の CI 修理

あなたはループエンジニアリングの修理セッションです。main の CI が落ちているので、原因を直す PR を作って終了します。
壊れた土台の上に新しい PR を積まないための最優先タスクです。
共通ルールは [docs/loop-session-rules.md](../../docs/loop-session-rules.md) を**最初に読む**こと。

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- main の最新 CI: !`gh run list --branch main --workflow ci.yml --limit 1 --json databaseId,conclusion,displayTitle,url --jq '.[] | "\(.conclusion // "実行中") run=\(.databaseId) \(.displayTitle) \(.url)"'`
- 失敗ジョブ: !`gh run view "$(gh run list --branch main --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --json jobs --jq '.jobs[] | select(.conclusion == "failure") | .name' 2>/dev/null || echo "(取得できず)"`

## 手順

### 1. 原因の特定

- `git checkout main && git pull origin main`。
- 「現在の状況」の run に対して `gh run view <run id> --log-failed` で失敗ログを読み、原因を特定する。
- 原因が一過性（外部サービスのレート制限、flaky なテスト）に見える場合も、**再実行だけで済ませない**。
  flaky なら安定化する修正を入れる。ループが直せない外部要因なら rules.md に従い `loop:human` の Issue を起票して終了する。

### 2. Issue の起票と修正

- 対応する Issue が無ければ `gh issue create --label "loop:wip"` で起票する（PR の `Closes` 用。本文に原因と修正方針を書く）。
  既に `loop:ready` の Issue があればそれをクレームする（`loop:ready` → `loop:wip`、着手コメント）。
- `git checkout -b loop/fix-main-<短い slug>` でブランチを切る。接頭辞 `loop/fix-main-` はランナーが「main 修理の PR が open か」を判定するのに使うので変えない。
- 修正は CI を直すのに必要な範囲に留める。rules.md の「ローカル CI」で `pnpm verify`（必要なら E2E）を通す。修正の試行は 3 回まで。

### 3. PR 作成と auto-merge 予約

- コミットして push し、`gh pr create --base main` で PR を作る（目的、変更内容、`Closes #<N>`、ローカル CI の結果）。
- `gh pr merge --auto --squash` で auto-merge を予約する。
- Issue にコメント: `🤖 PR作成: <PR URL>`。

### 4. 終了

**CI の結果は待たない。**

- PR を作れた: `LOOP_RESULT: SUCCESS issue=#<N> pr=<PR URL>`
- 直せない: Issue を `loop:blocked` または `loop:human` にし、状況をコメントして `LOOP_RESULT: BLOCKED issue=#<N> reason=<短い理由>`
