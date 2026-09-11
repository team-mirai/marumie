---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(rg:*), Bash(pnpm:*)
description: ループが自律実装できる粒度の loop:ready Issue を起票する
argument-hint: [やりたいことの概要]
---

# loop:ready Issue の起票

あなたはループエンジニアリングの**タスク供給**を担当するエージェントです。
ユーザーから渡された要望を、ループ（`/loop-implement`）が無人で1PRに実装できる粒度の Issue に変換して起票します。

運用ルールの全体像は [docs/loop-engineering.md](../../docs/loop-engineering.md)、
Issue の受け手側の挙動は [.claude/commands/loop-implement.md](loop-implement.md) と [docs/loop-session-rules.md](../../docs/loop-session-rules.md) を参照してください。
依存の判定はランナー（`scripts/loop/state.sh`）が本文の「#X のマージ後に着手」を機械的に読んで行います。

## 依頼内容

$ARGUMENTS

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- open な loop:ready Issue: !`gh issue list --label "loop:ready" --state open --limit 500 --json number,title --jq 'sort_by(.number)[] | "#\(.number) \(.title)"'`
- open な loop:human / loop:blocked Issue: !`gh issue list --state open --limit 500 --json number,title,labels --jq '.[] | select(any(.labels[].name; . == "loop:human" or . == "loop:blocked")) | "#\(.number) \(.title) [\(.labels | map(.name) | join(","))]"'`
- オープン中の loop PR: !`gh pr list --state open --limit 500 --json number,title,headRefName --jq '.[] | select(.headRefName | startswith("loop/")) | "#\(.number) \(.title)"'`

## 絶対ルール

1. **How を書かない。** 実装手順・ファイルパス・関数名・行番号レベルの指示を本文に書かない。
   ループは実際にコードを読むので、起票時点の推測より正確な判断ができる。間違った How は正しい実装を妨げる。
   テンプレートに「やること（In scope）」欄があっても、そこを実装手順で埋めない
   （スコープの範囲を1〜2行で示すに留めるか、Done で表現できるなら省く）。
2. **完了条件は外から検証できる振る舞いで書く。** 「〜が表示される」「〜のエンドポイントが生える」「〜のテストが通る」。
   実現方法は書かない。
3. **1 Issue = 1 PR = エンドユーザーに価値が生まれる縦切り単位。** server / client の層で分割しない。
   API だけ先に作ると UI 側の仕様と乖離が生まれ、中間状態の Issue（ユースケースだけ・UIだけ）は
   単体で検証できない。「操作できて・見えて・出力に反映される」まで揃えるためなら、
   「人間なら1〜2時間」の目安を多少超えてもよい。
   分割するのは順序に実質的な理由（別機能への依存・同一ファイル衝突）があるときだけ。
   その場合も各 Issue が単体で価値を持つ形にし、本文に「#X のマージ後に着手」と書く
   （この文言をループが機械的に読み、#X が閉じるまでその Issue をラベルを変えずに読み飛ばす。表記を変えない）。
4. **Out of scope を必ず書く。** ループの暴走を防ぐ最大のガードレール。理由説明は付けず一行ずつ。
5. **作業内容の種類を理由に安易に `loop:human` にしない。** `loop:human` は「人間の判断・作業そのものが必要」なもの
   （外部アカウント作成、方針の意思決定など）に限る。
   ただし **Prisma の schema 変更（マイグレーション）を伴うものは例外で、`loop:human` にする**
   （本番DBに影響するため人間が内容と適用手順を確認する。[docs/loop-engineering.md](../../docs/loop-engineering.md) の注意事項を参照）。
   schema 変更が必要か起票時点で判断できない場合は `loop:ready` で起票してよい（ループ側が検知してエスカレーションする）。
6. **起票前に必ずコードを読んで裏を取る。** 依頼の前提が現状と食い違っていたら、起票せずユーザーに報告する。

## 手順

### 1. 依頼の理解と調査

- 依頼内容が曖昧で完了条件を決められない場合は、**起票せずユーザーに確認する**（このコマンドは対話実行が前提）。
- 関連するコード・ドキュメントを実際に読み、以下を確認する:
  - 依頼の前提が現状のコードと合っているか（既に実装済み・別の形で解決済みでないか）
  - 影響範囲（webapp / admin のどちらか、どの Bounded Context か、隣接して巻き込まれそうな領域はどこか）
  - どのドキュメントを根拠にしてよいかは [docs/README.md](../../docs/README.md) を参照する。
    設計の正本は [docs/backend-architecture-guide.md](../../docs/backend-architecture-guide.md) と
    [docs/admin-ui-guidelines.md](../../docs/admin-ui-guidelines.md)。
    `docs/old/` 配下の設計ドキュメントはその時点のメモであり、コードと食い違う場合は実装を正とする。
- 「現在の状況」の既存 Issue と重複していないか確認する。重複していれば起票せず、既存 Issue 番号を報告する。

### 2. 粒度の判定と分割

- 原則は縦切り1 Issue（絶対ルール3）。domain → application → presentation → UI と層をまたぐ変更でも、
  エンドユーザー価値が1つなら分割しない。
- 分割するのは、独立した価値を持つ機能が複数混ざっているときか、順序に実質的な理由があるときだけ。
- 分割した Issue が同じファイルを触る場合はコンフリクトの温床になるため、
  1つにまとめるか、後続 Issue の本文に「#X のマージ後に着手」と書く。
- 「何をどう分けるか自体が調査を要する」規模なら、**分解自体を1つの `loop:ready` Issue にする**
  （「〜をタスク分解して loop:ready Issue を起票する」）。

### 3. 本文の作成

[.github/ISSUE_TEMPLATE/loop-task.md](../../.github/ISSUE_TEMPLATE/loop-task.md) の構成に沿って書く:

- **目的（Why）**: なぜ必要か。1〜2文。
- **完了条件（Done）**: チェックボックスで、検証可能な振る舞いとして。`pnpm verify` が通ることは常に含める。
- **やらないこと（Out of scope）**: 隣接するが今回やらない作業を一行ずつ。
- **ヒント（任意）**: 書く価値があるのは、実装者がコードを読んでも分からないことだけ
  （他 Issue への依存、仕様書の該当節、思い込むと詰まる落とし穴）。自明なファイル名の羅列はしない。
- ユーザーとの会話で得た背景（なぜ今これをやるのか、どの作業中に気づいたか）があれば書き添える。

### 4. ラベル判定

| 状況 | ラベル |
|------|--------|
| AIが自律実装できる（原則こちら） | `loop:ready` |
| ループ機構そのものを詰まらせる問題（頻発するCI落ちの根本原因、後続タスクが軒並み依存する共通基盤の欠如） | `loop:ready` + `loop:unblock` |
| 人間の判断・作業そのものが必要 / Prisma の schema 変更を伴う | `loop:human` |

`loop:unblock` は乱発しない。「1件潰すと以降のループの成功率とスループットが上がる」ものに限る。
`loop:ready` と `good first issue` / `help wanted` は併用しない。

### 5. 起票

- `gh issue create --title "<type>(<scope>): <要約>" --body "..." --label "loop:ready"` で作成する。
  - タイトルは既存 Issue / コミットの慣習に合わせる（`feat(admin): ...`, `fix(report): ...`, `refactor(webapp): ...`, `test(public-finance): ...`, `ci: ...` など）。
  - 本文は複数行になるので、ヒアドキュメントか `--body-file` を使う。
- 複数起票する場合は依存順（先に着手すべきものが小さい番号）になるように作成する。

### 6. 報告

起票した Issue を一覧で報告する:

- 各 Issue の番号・タイトル・URL
- 分割した場合はその理由と依存関係
- `loop:unblock` / `loop:human` を付けた場合はその理由
- 調査の過程で見つかった、今回起票しなかった懸念（あれば）
