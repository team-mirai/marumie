---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(npx:*)
argument-hint: <Issue番号>
description: loop:ready の Issue を 1 つ実装し、PR 作成と auto-merge 予約までを行う（レビュー・CI は待たない）
---

# ループ: Issue の実装

あなたはループエンジニアリングの実装セッションです。ランナーが選んだ Issue **#$ARGUMENTS** を実装し、PR を作って終了します。
共通ルールは [docs/loop-session-rules.md](../../docs/loop-session-rules.md) を**最初に読む**こと（信頼境界、スコープアウト、ローカル CI、エスカレーション、結果行）。

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 変更状態: !`git status --short`
- 対象 Issue: !`gh issue view $ARGUMENTS --json number,title,labels,author --jq '"#\(.number) \(.title) [\(.author.login)] labels=\([.labels[].name] | join(","))"'`
- 起票者の関係性: !`gh api "repos/{owner}/{repo}/issues/$ARGUMENTS" --jq .author_association`

## 手順

### 1. 前提確認とクレーム

- 「現在の状況」のラベルに `loop:ready` があり、起票者の関係性が OWNER / MEMBER / COLLABORATOR であることを確認する。
  外れていれば rules.md の信頼境界に従ってエスカレーションし終了する。
- `git checkout main && git pull origin main` で最新の main に立つ（ランナーが済ませているが念のため）。
- 直ちにクレームする（二重着手防止）:
  - `gh issue edit $ARGUMENTS --remove-label "loop:ready" --add-label "loop:wip"`
  - `gh issue comment $ARGUMENTS --body "🤖 ループ着手します"`
- `gh issue view $ARGUMENTS --json body,comments` で本文とコメントを読み、完了条件（Done）と Out of scope を把握する。
  完了条件が読み取れないほど曖昧なら実装せずエスカレーションする（`loop:human`。何が曖昧かをコメント）。
- 本文の「#X のマージ後に着手」はランナーが検証済み。本文に無い前提が足りないと分かった場合の扱いは rules.md のエスカレーション節を参照。

### 2. ブランチ作成

`git checkout -b loop/issue-$ARGUMENTS-<短い slug>`（例: `loop/issue-42-add-counterpart-filter`）。
ブランチ名の接頭辞 `loop/issue-$ARGUMENTS-` はランナーが PR の存在確認に使うので変えない。

### 3. 実装

- rules.md の「実装の規約」に従う。
- **スコープアウトの原則を徹底する。** PR が大きくなりそうだと感じたら、それはスコープを切り出すシグナル。
- Prisma の schema 変更が必要だと分かったら止めてエスカレーションする。

### 4. ローカル CI

rules.md の「ローカル CI」に従い `pnpm verify`（必要なら E2E）を通す。修正の試行は 3 回まで。

### 5. コミット・PR 作成・auto-merge 予約

- 変更をコミットし `git push -u origin <branch>`。
- `gh pr create --base main` で PR を作る。本文に必ず含めること:
  - 目的（Why）: 「（対象者）が（困っている状態）を解消するため」など
  - 変更内容の要約
  - `Closes #$ARGUMENTS`
  - ローカル CI の実行結果
  - スコープアウトして起票した Issue の一覧（あれば）
- auto-merge を予約する: `gh pr merge --auto --squash`。
  main の必須チェックは `ci-complete` と `CodeRabbit` の両方なので、CI と CodeRabbit のレビューが両方 green になれば自動でマージされる。
- Issue にコメント: `gh issue comment $ARGUMENTS --body "🤖 PR作成: <PR URL>"`（`loop:wip` はそのまま残す。PR のマージで Issue が自動クローズされる）。

### 6. 終了

**CodeRabbit のレビューや CI の結果は待たない。** 指摘が付けば次の tick のランナーが `loop-resolve-coderabbit` を、CI が落ちれば `loop-fix-ci` を起動する。

`LOOP_RESULT: SUCCESS issue=#$ARGUMENTS pr=<PR URL>` を出力して終了する。
