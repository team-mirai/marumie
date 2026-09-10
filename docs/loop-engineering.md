# ループエンジニアリング

AIエージェント（Claude Code）に実装を自律的に回してもらうための運用ルール。
人間が毎回指示を出すのではなく、**「指示を出すシステムそのもの」を設計する**手法で、
人間はループの設計・タスクの供給・例外処理に回る。

このリポジトリでは **継続監視型ではなくゴール収束型** を採用する:
`loop:ready` のIssueが枯渇するか、指定回数に達するか、失敗が続いたら停止する。
ただし「依存先の PR がレビュー中・CI 待ち」は失敗ではなく順番待ちなので、その間は停止せず待機して再実行する。

## 原則

**1ループ = 1 Issue = 1 PR = 1セッション。**
セッションを使い捨てることでコンテキスト膨張による品質劣化を防ぐ。
新規Issueの1ループは「Issue選択 → 実装 → ローカルCI → PR作成 → auto-merge予約 → Issueにコメント → 結果出力」で完結する。
PRを出したループは CodeRabbit のレビューを待たずに終了し、CI と CodeRabbit が両方greenになれば自動マージされIssueが閉じる。
CodeRabbit の Request changes で止まったPRは、次のループが修理モードで処理する。

**新規タスクより既存成果物の健全性が優先。**
mainのCIが落ちている、あるいはloop PRがCI失敗・コンフリクト・CodeRabbit の Request changes で止まっているなら、
そのループは新規Issueではなく修理に充てる。壊れた土台の上に積み上げない。

**詰まったら止まる。順番待ちでは止まらない。**
CI修正の試行回数には上限を設け、超えたらIssueにラベルを付け替えて人間にエスカレーションする。
失敗したIssueは `loop:ready` が外れるため、同じIssueを無限リトライすることはない。
一方、Issue 間の依存（本文の「#X のマージ後に着手」）は順番待ちであってブロッカーではない。
番号順＝依存順で起票する運用上、PR を出した直後の次のループはほぼ必ず「直前の PR のマージ待ち」の Issue に当たるので、
これを `loop:blocked` にすると依存チェーンのリンクごとに人間の手作業が要り、後続 Issue が連鎖して blocked になってループが止まる。
依存先が未マージの Issue はラベルを変えずに読み飛ばし、着手できる Issue が無ければ `WAITING` を返してランナーが一定間隔で再実行する
（再実行ではまず修理モードが走るので、待っている間に CodeRabbit の Request changes が付けばそこで処理される）。

手順の実体は [.claude/commands/loop-once.md](../.claude/commands/loop-once.md)（この文書は手順を再掲しない）。

## OSSリポジトリで自動マージを回すための前提

このリポジトリは公開されており、誰でもIssueを立て、forkからPRを送れる。
自動マージはその前提のうえで、次の4つの境界によって安全性を担保している。

**1. マージ権限は write 権限者だけが持つ。**
PRのマージも auto-merge の有効化も write 権限が必要なので、外部コントリビュータのPRが
自動で取り込まれることはない。外部PRは従来どおり人間がレビューしてマージする。
リポジトリ全体を対象にした「CIが通ったらマージするボット」は**作らない**
（条件式のミスひとつが外部PRの素通しになるため）。auto-mergeを予約するのは、
ループが自分で作ったPRに対してだけ。

**2. `loop:ready` ラベルが指示の信頼境界。**
Issueの起票・コメントは誰でもできるが、ラベル付与は write 権限者にしかできない。
ループは `loop:ready` の付いたIssue本文を「指示」として読むため、ここが実質的な権限の境界になる。
外部の人が書いた本文がそのままエージェントへの指示にならないよう、二重に守る:

- [.github/workflows/loop-label-guard.yml](../.github/workflows/loop-label-guard.yml) が、
  メンテナ以外が起票したIssueから `loop:ready` を自動で剥がす
- ループ自身も着手前に起票者を検証し、メンバー以外のIssueは対象外にする

外部からの良い提案を回したい場合は、**メンテナが内容を確認して自分の言葉で書き直したIssueを
新たに起票する**（元Issueにリンクする）。これは体裁の問題ではなく、
`--dangerously-skip-permissions` で動くエージェントに未検証の文章を渡さないための手順。

**3. CI と CodeRabbit が門番。**
main のブランチ保護で `ci-complete` を必須チェックにしてあり、auto-mergeはこれがgreenになるまで待つ。
`ci-complete` は [ci.yml](../.github/workflows/ci.yml) の全ジョブの結果を集約するジョブで、
docsのみの変更などで個別ジョブがスキップされても必ず報告される（必須チェックがpendingのまま
ブロックされるのを防ぐため、CI自体は paths で起動抑止していない）。
CodeRabbit のコミットステータス（`CodeRabbit`）も必須チェックにしてあるため、auto-merge は CodeRabbit のレビュー完了も待つ。
加えてブランチ保護がPRレビューを要求しているため、CodeRabbit（[.coderabbit.yml](../.coderabbit.yml) で
`request_changes_workflow: true`）が出す Request changes も auto-merge をブロックする。
つまり「CI と CodeRabbit が両方 green で、Request changes が残っていなければマージ」が唯一の条件で、
ループはこれを「規約レビュー」として扱い、指摘を処理してスレッドを閉じる（後述）。

**4. マージは本番デプロイを起こさない。**
本番デプロイは `Deploy Production` ワークフローの手動実行のみ
（Vercel の `ignoreCommand` でGit連携の本番ビルドを止めている）。
自動マージが直ちに公開サイトへ反映されることはなく、リリースの判断は人間に残っている。

### 外部コントリビュータとの棲み分け

- `loop:ready` と `good first issue` / `help wanted` は**併用しない**。
  夜間のループが着手しやすいタスクを食べ尽くすと、外部の人の作業機会と衝突する
- ループは着手時にIssueへコメントし `loop:wip` を付ける（着手状況を外から見えるようにする）
- ループが出したPRは `loop/` ブランチから作られ、本文にIssueリンクとローカルCIの結果が入る

## スコープアウトの原則（このワークフローの核心）

作業中に「これもやらなきゃ」と気づいたことは、**その場で実装せずIssue化する**。

- AIが自律でできる → `loop:ready` → 後続のループが拾う
- 人間の判断が要る → `loop:human` → 人間のレビューで処理
- ループ全体を妨げるブロッカー → `loop:ready` + `loop:unblock` → 後続のループが最優先で拾う

これにより1つのPRが肥大化せず自動マージ可能なサイズを保て、
発見した課題がタスク管理上に必ず残り、人間がやるべきことが `loop:human` に集約される。

## CodeRabbit の指摘の扱い

このプロダクトは公開されているので一定の品質を保ちたい。CodeRabbit は規約違反（レイヤー境界、import 規約、
テスト配置など）を概ね検知してくれるため、ループのPRでも**無視はしない**。
一方で付き合うとキリがない細かい指摘も多いので、**ループ自身が妥当性を判断して「修正する / 退ける / Issue化する」に振り分ける**。

- CI（`ci-complete`）と CodeRabbit のステータスの両方が必須チェックなので、ループは PR 作成直後に auto-merge を予約してよい
  （CodeRabbit のレビュー完了前にマージされることはない）。Request changes が付くとマージされないので、
  PRを作ったループは待たずに終了し、次のループが新規タスクより優先して修理モードで指摘を処理する。
  CodeRabbit がまだレビュー中（reviewDecision が空）のPRは、CI失敗・コンフリクトがなければ健全として対象外にする
- 修理モードでは別セッションでの対応となるため、Issue本文（Out of scope を含む）とPR差分を読み直してから指摘を判定する。
  修正push後は直ちに各スレッドへ返信して resolve し、最新コミットの `CodeRabbit` コミットステータスの完了を待つ。
  増分レビューではレビューオブジェクトが作られないことがあるため、完了判定にはコミットステータスを使う。
  続いて新規スレッドの有無、`reviewDecision` による承認を確認し、対応結果をPRにコメントする
- 退ける場合は必ずスレッドに `🤖` で始まる理由を返信してから resolve する。黙って resolve すること、
  `@coderabbitai resolve` での一括 resolve、レビュー自体の dismiss は禁止（人間が後から監査できなくなる）
- 修理モードでの修正の push は 2 ラウンドまで、全体で 30 分まで。超えたら PR を open のまま `loop:human` にエスカレーションする。
  コミットステータスが未作成または `pending` のまま12分経過した場合も、再レビュー要求を行わず同様にエスカレーションする。
  `failure` / `error` は承認と扱わず原因を確認し、ループで解消できない場合は人間に知らせる
- エスカレーション済みの PR（Issue が `loop:human` / `loop:blocked`）は、メンテナが `loop:ready` に戻すまで次のループも触らない
- ループが自動処理するのは `coderabbitai[bot]` のスレッドだけ。人間のレビューは人間の管轄
- 判定基準と手順の実体は [loop-once.md の「CodeRabbit レビューの取り扱い」](../.claude/commands/loop-once.md)

Request changes で止まっている loop PR は、次のループが修理モードで拾う（CI失敗・コンフリクトと同じ扱い）。

## ラベル運用

| ラベル | 意味 | 誰が付けるか |
|--------|------|-------------|
| `loop:ready` | AIが自律実装できる状態。ループの取り込み対象 | メンテナ / ループ（スコープアウト時） |
| `loop:unblock` | ループ全体のブロッカー解消。着手選択で最優先（`loop:ready` と併用する修飾ラベル） | メンテナ / ループ（ブロッカー発見時） |
| `loop:wip` | ループが着手中（二重着手防止） | ループ |
| `loop:blocked` | 技術的ブロッカーで停止（環境・外部要因。別 Issue のマージ待ちは含まない） | ループ |
| `loop:human` | 人間の判断・作業が必要 | メンテナ / ループ |

状態遷移: `loop:ready → loop:wip → (PRマージでクローズ | loop:blocked | loop:human)`

依存待ち（本文に「#X のマージ後に着手」があり #X が open）は状態遷移を起こさない。ループはその Issue をラベルを変えずに読み飛ばし、
#X が閉じた後の実行で拾う。着手後に本文に無い前提が判明した場合も、ループが本文に依存を追記して `loop:ready` に戻す（`loop:blocked` にはしない）。

`loop:blocked` / `loop:human` を解消したら、メンテナが `loop:ready` に戻すことで再びループの対象になる。

`loop:unblock` は「特定タスクではなくループ機構そのものを妨げる問題」に付ける。
例: mainのCIを恒常的に不安定にしている根本原因、多くの後続タスクが依存する共通基盤の欠如。
番号順より優先して着手するのは、ブロッカーを1件潰すと以降のループの成功率とスループットが上がるため。
ループが拾える状態を示すため、必ず `loop:ready` と併用する。

## Issueの書き方（タスクの供給）

Issueテンプレート「[Loop Task](../.github/ISSUE_TEMPLATE/loop-task.md)」を使う。要点は3つ:

1. **エンドユーザーに価値が生まれる縦切り単位**で、1PRで完結すること。
   server / client の層で分割しない（APIだけ先に作るとUI側の仕様と乖離が生まれ、
   中間状態のIssueは単体で検証できない）。縦切りを保つためなら「人間なら1〜2時間」の
   目安を多少超えてもよい
2. **完了条件（Done）が検証可能**であること（「〜のテストが通る」「〜の画面に〜が表示される」）
3. **やらないこと（Out of scope）を明記**する。ループの暴走を防ぐ最大のガードレール

粒度が大きい仕様は、人間が分解Issueを起票するか、
「〜をタスク分解して `loop:ready` Issueを起票する」というIssue自体を `loop:ready` にしてもよい（分解もループにやらせる）。

Claude Code 内で `/loop-issue <やりたいことの概要>` を実行すると、コードを調査したうえで上記の要点を満たす Issue を起票できる
（手順は [.claude/commands/loop-issue.md](../.claude/commands/loop-issue.md)）。

## コマンド

```bash
./scripts/loop-once.sh        # 1回だけループを実行
./scripts/loop.sh 10          # 最大10回ループを実行（夜間バッチ向け）
./scripts/loop.sh 10 astra    # モデルを指定して実行（opus / fable / astra、デフォルト: opus）
```

`loop.sh` は 1 回の実行結果（SUCCESS / NO_TASK / BLOCKED / WAITING / FAILED）で継続を判断する。
WAITING（依存先のマージ待ち）は回数に数えず、`LOOP_WAIT_SECONDS`（デフォルト 300 秒）待って再実行する。
連続待機が `LOOP_MAX_WAIT_SECONDS`（デフォルト 2 時間）を超えたら、依存先の PR が人間のレビューなどで止まっているとみなして終了する。

各イテレーションは**毎回新規セッション**を起動する。opus / fable は Claude Code（`claude -p "/loop-once" --model <モデル>`）、
astra は Codex CLI（`codex exec --model gpt-6-astra`。要 `npm install -g @openai/codex`）で実行する。
対話セッション内で試したい場合は Claude Code 内で `/loop-once` を実行してもよい。
ログは `.loop/logs/` に残る（gitignore済み）。

## 人間の役割（レビュー）

```bash
gh pr list --state merged --limit 20   # マージされたPR → コードを読んで理解する
gh pr list --state open --json number,title,headRefName,mergeStateStatus,reviewDecision   # 未マージのPR → CI失敗/コンフリクト/Request changes の確認（loop/ ブランチがループのPR）
gh issue list --label loop:blocked     # 技術的ブロッカー → 解消して loop:ready に戻す
gh issue list --label loop:human       # 判断待ち → 判断してIssue更新
gh issue list --label loop:wip         # 残っていたら異常終了の痕跡。状況確認して戻す
git stash list | grep loop-abandoned   # 中断ループの退避作業（あれば）
```

**マージされたPRも必ず読むこと。** 自動マージは「CIが通った」ことしか保証しない。
コードを読まずに積み上げると理解の負債（Comprehension Debt）が溜まり、いずれ設計判断ができなくなる。
あわせて、ループが CodeRabbit の指摘を**退けた理由**（PRコメントの「🤖 CodeRabbit レビュー対応」と各スレッドの `🤖` 返信）にも目を通し、
判断が甘ければ [loop-once.md](../.claude/commands/loop-once.md) の判定基準を直す。

## 注意事項

- **`--dangerously-skip-permissions` で動く**ため、信頼できるタスクだけを `loop:ready` に置くこと。
  ループを回すマシンの環境変数・`.env` に本番の認証情報を置かない（被害の上限がここで決まる）。
- **Prisma のマイグレーションはループに実装させない。** schema 変更が必要だと判明したIssueは
  `loop:human` にエスカレーションし、人間がマイグレーションの内容と適用手順を確認する。
- **コンフリクト**: 連続するループが同じファイルを触るとauto-mergeが失敗する。関連の深いタスクは1つのIssueにまとめるか、本文に「#X のマージ後に着手」と書く（ループは着手時にmainを取り直すため、先行PRがマージ済みなら問題ない）。
- **コスト**: 1ループ = 1セッション分のトークンを消費する。回数指定は残タスク数に合わせる（多めに指定してもタスク枯渇で自動停止する）。

## 参考資料

- [ループエンジニアリングとは？AIを自律的に実行する手法を完全解説（aidd.jp）](https://aidd.jp/blog/knowledge/loop-engineering/)
- [ループエンジニアリングとは？AIエージェントを自律で回す設計手法と6つの構成要素（AI総合研究所）](https://www.ai-souken.com/article/what-is-loop-engineering)
- [ループエンジニアリング — AIエージェント時代の開発組織マネジメント（Findy Team+）](https://jp.findy-team.io/blogs/loop-engineering/)
