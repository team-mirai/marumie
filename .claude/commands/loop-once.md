---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(./scripts/loop/*), Bash(scripts/loop/*)
description: ループを 1 tick 実行する（状態収集 → 判定 → 該当コマンドをこのセッションで実行）
---

# ループエンジニアリング: 1 tick（対話実行用）

無人実行は `./scripts/loop-once.sh` / `./scripts/loop.sh` が担う。このコマンドは**対話セッションの中で同じ 1 tick を試す**ためのもので、
状態収集と判定はスクリプトに任せ、選ばれた仕事だけをこのセッションで実行する。
運用ルールの全体像は [docs/loop-engineering.md](../../docs/loop-engineering.md)。

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 変更状態: !`git status --short`
- 判定結果: !`./scripts/loop/state.sh | ./scripts/loop/decide.sh`

## 手順

1. 作業ツリーが汚れていれば何もせず `LOOP_RESULT: FAILED kind=deterministic reason=dirty-tree` で終了する。`git checkout main && git pull origin main`。
2. 「判定結果」の `escalations` / `flags` / `nudges` / `unblocks` が空でなければ、`./scripts/loop/state.sh | ./scripts/loop/decide.sh | ./scripts/loop/escalate.sh` で GitHub に反映する（ランナー側のラベル操作。セッションの仕事ではない）。
3. `action` に応じて、対応するコマンドを**このセッションで**実行する（Skill ツールで `/loop-implement <target>` のように呼ぶ。手順書を自分で読み直して真似しない）:

   | action | 実行するコマンド |
   |--------|-----------------|
   | `implement` | `/loop-implement <target>` |
   | `fix-ci` | `/loop-fix-ci <target>` |
   | `resolve-coderabbit` | `/loop-resolve-coderabbit <target>` |
   | `fix-main` | `/loop-fix-main` |
   | `wait` | 何もしない。`LOOP_RESULT: WAITING` と `waiting_on` の内容を出力して終了 |
   | `none` | 何もしない。`LOOP_RESULT: NO_TASK` を出力して終了 |

4. 実行したコマンドの結果行（`LOOP_RESULT: ...`）をそのまま最後に出力する。

セッション内で CI や CodeRabbit の結果を待たないこと。次の tick（`/loop-once` の再実行）が状態の変化を拾う。
