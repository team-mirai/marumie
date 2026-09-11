# ループエンジニアリング

AIエージェント（Claude Code / Codex）に実装を自律的に回してもらうための運用ルール。
人間が毎回指示を出すのではなく、**「指示を出すシステムそのもの」を設計する**手法で、
人間はループの設計・タスクの供給・例外処理に回る。

このリポジトリでは **継続監視型ではなくゴール収束型** を採用する:
`loop:ready` のIssueが枯渇するか、指定回数に達するか、失敗が続いたら停止する。

## 構成

ループは **決定論的なランナー** と **使い捨ての LLM セッション** の 2 層でできている。

| 層 | 実体 | 役割 |
|----|------|------|
| ランナー | [scripts/loop.sh](../scripts/loop.sh) → [scripts/loop-once.sh](../scripts/loop-once.sh) → [scripts/loop/](../scripts/loop/) | 状態の収集、何をするかの判定、予算の判定、人間レビュー・予算超過のエスカレーション、待機、セッション結果の検証 |
| セッション | [.claude/commands/loop-*.md](../.claude/commands/)（共通規則は [docs/loop-session-rules.md](loop-session-rules.md)） | 渡された 1 つの仕事だけをする: Issue を実装する / PR の CI を直す / main の CI を直す / CodeRabbit の指摘を裁く |

ランナーの 1 tick は次の順で動く（[scripts/loop/state.sh](../scripts/loop/state.sh) が状態 JSON を作り、[scripts/loop/decide.sh](../scripts/loop/decide.sh) が判定する）:

1. **main の CI が赤** → `loop-fix-main`
2. **いま動かせる loop PR がある** → 必須チェック失敗・コンフリクトなら `loop-fix-ci`、
   CodeRabbit が最新コミットをレビュー済みで未解決スレッドが残っていれば `loop-resolve-coderabbit`。
   人間のレビュースレッドがある PR と修正ラウンドの予算を超えた PR は、セッションを起動せずランナーが `loop:human` に付け替える
3. **いま着手できる Issue がある** → `loop-implement`（`loop:unblock` 優先、次に番号最小。依存待ちの Issue は読み飛ばすだけで状態を変えない）
4. **in-flight の PR（CI 実行中・レビュー中・承認済みでマージ待ち）か依存待ちの Issue しか無い** → `WAITING`。
   ランナーが状態だけを取り直し、変化した時点で次の tick を回す
5. **候補が無い** → `NO_TASK`

セッション側の原則は **1 セッション = 1 つの仕事 = 使い捨て**。コンテキスト膨張による品質劣化を防ぐ。
セッションは **CI や CodeRabbit の結果を待たない**。push したら終了し、結果は次の tick の状態収集で拾う。
これにより、ある PR のレビューが届くまでの間に別の Issue を実装でき、レビュー待ちで直列に止まることがない。

**新規タスクより既存成果物の健全性が優先。** main の CI が落ちている、loop PR が CI 失敗・コンフリクト・CodeRabbit の指摘で止まっているなら、
その tick は新規 Issue ではなく修理に充てる。壊れた土台の上に積み上げない。

**詰まったら止まる。順番待ちでは止まらない。** 修正の試行回数と修正ラウンドには上限を設け、超えたら Issue のラベルを付け替えて人間にエスカレーションする。
一方、Issue 間の依存（本文の「#X のマージ後に着手」）は順番待ちであってブロッカーではないので、ラベルを変えずに読み飛ばす。

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
外部の人が書いた本文がそのままエージェントへの指示にならないよう、三重に守る:

- [.github/workflows/loop-label-guard.yml](../.github/workflows/loop-label-guard.yml) が、
  メンテナ以外が起票したIssueから `loop:ready` を自動で剥がす
- ランナー（`state.sh` / `decide.sh`）が起票者の `author_association` を見て、**OWNER / MEMBER / COLLABORATOR 以外**の Issue は `loop:human` に付け替える
  （`docs/loop-session-rules.md` の信頼境界と同じ許可集合）
- セッション自身も着手前に起票者を再確認する

外部からの良い提案を回したい場合は、**メンテナが内容を確認して自分の言葉で書き直したIssueを
新たに起票する**（元Issueにリンクする）。これは体裁の問題ではなく、
`--dangerously-skip-permissions` で動くエージェントに未検証の文章を渡さないための手順。

**3. CI と CodeRabbit が門番。**
main のブランチ保護で `ci-complete` と `CodeRabbit` の両方を必須チェックにしてあり、auto-merge は両方が green になるまで待つ。
`ci-complete` は [ci.yml](../.github/workflows/ci.yml) の全ジョブの結果を集約するジョブで、
docsのみの変更などで個別ジョブがスキップされても必ず報告される。
加えてブランチ保護がPRレビューを要求しているため、CodeRabbit（[.coderabbit.yml](../.coderabbit.yml) で
`request_changes_workflow: true`）が出す Request changes も auto-merge をブロックする。
つまり「CI と CodeRabbit が両方 green で、Request changes が残っていなければマージ」が唯一の条件で、
ループはこれを「規約レビュー」として扱い、指摘を処理してスレッドを閉じる（後述）。
`codecov/patch` や Vercel のチェックは必須ではないので、ループの修理対象にもしない。

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
一方で付き合うとキリがない細かい指摘も多いので、**セッションが妥当性を判断して「修正する / 退ける / Issue化する」に振り分ける**。

- PR を作ったセッションはレビューを待たずに終了する。CodeRabbit が最新コミットをレビューし終えて未解決スレッドが残った時点で、
  ランナーがそれを状態の変化として検知し、`loop-resolve-coderabbit` セッションを起動する
  （判定は head コミットの `CodeRabbit` コミットステータスと未解決スレッド数。増分レビューではレビューオブジェクトが作られないことがあるため）
- セッションは Issue 本文（Out of scope を含む）と PR 差分を読み直してから指摘を判定し、修正があれば
  `fix: CodeRabbit の指摘に対応（…）` で push し、**全スレッドに返信して resolve** してから終了する。承認は待たない
- 退ける場合は必ずスレッドに `🤖` で始まる理由を返信してから resolve する。黙って resolve すること、
  `@coderabbitai resolve` での一括 resolve、レビュー自体の dismiss は禁止（人間が後から監査できなくなる）
- 修正 push は **2 ラウンドまで**（`LOOP_MAX_FIX_ROUNDS`）。ランナーが `fix: CodeRabbit` で始まるコミット数で数え、
  超えてもまだ未解決の指摘があれば、セッションを起動せずに PR を open のまま Issue を `loop:human` に付け替える
- ループが自動処理するのは `coderabbitai` のスレッドだけ。人間のレビュースレッドがある PR はランナーが即 `loop:human` に付け替える
- エスカレーション済みの PR（Issue が `loop:human` / `loop:blocked`）は、メンテナが `loop:ready` に戻すまでランナーの対象外
- 判定基準の実体は [loop-resolve-coderabbit.md](../.claude/commands/loop-resolve-coderabbit.md)

## ラベル運用

| ラベル | 意味 | 誰が付けるか |
|--------|------|-------------|
| `loop:ready` | AIが自律実装できる状態。ループの取り込み対象 | メンテナ / ループ（スコープアウト時） |
| `loop:unblock` | ループ全体のブロッカー解消。着手選択で最優先（`loop:ready` と併用する修飾ラベル） | メンテナ / ループ（ブロッカー発見時） |
| `loop:wip` | ループが着手中（二重着手防止） | セッション |
| `loop:blocked` | 技術的ブロッカーで停止（環境・外部要因。別 Issue のマージ待ちは含まない） | セッション |
| `loop:human` | 人間の判断・作業が必要 | メンテナ / ランナー / セッション |

状態遷移:

| 遷移 | 契機 | 誰が | 成果物の扱い |
|------|------|------|-------------|
| `loop:ready → loop:wip` | 着手（クレーム） | セッション | `loop/issue-<N>-*` ブランチを切る |
| `loop:wip →`（クローズ） | PR がマージされた | GitHub | PR の `Closes #N` で自動クローズ |
| `loop:wip → loop:ready` | 着手後に本文に無い依存が判明した | セッション | 本文に `🤖 #X のマージ後に着手` を追記し、作業中の変更は破棄 |
| `loop:wip → loop:blocked` | 技術的ブロッカー（環境・外部要因） | セッション | PR があれば open のまま残す |
| `loop:wip → loop:human` | 人間の判断が必要 / 人間のレビュースレッドがある / 修正ラウンドの予算超過 | セッション / ランナー | PR があれば open のまま残す |
| `loop:ready → loop:human` | 起票者が信頼境界の外 / 依存先が未マージのまま閉じた | ランナー | — |

依存待ち（本文に「#X のマージ後に着手」があり #X が未マージ）は状態遷移を起こさない。ランナーはその Issue を読み飛ばし、
#X がマージされた後の tick で拾う。

依存の完了条件は**依存先の成果物が main にマージ済みであること**。Issue のクローズは PR のマージを保証しない
（人間が手動で閉じることもある）ため、`state.sh` は GraphQL の `closedByPullRequestsReferences` で
**対応する PR のマージ状態まで**確認する:

| 依存先 #X の状態 | 判定 | ループの動き |
|-----------------|------|-------------|
| `OPEN` | 順番待ち（`open`） | ラベルを変えずに読み飛ばし、`WAITING` の対象にする |
| `CLOSED` かつ、#X を閉じた PR に `merged` があり `baseRefName` が `main` | マージ済み（`merged`） | 着手できる |
| `CLOSED` だがマージ済みの PR が無い（`NOT_PLANNED`、PR が close されただけ、PR の無い手動クローズ） | 成果物が来ない（`closed-unmerged`） | 待っている側の Issue を `loop:human` に付け替える |
| 状態を取得できない | 判定不能（`unknown`） | 着手せず読み飛ばす（`WAITING` の対象）。続くなら `WAIT_TIMEOUT` で止まる |

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

依存は本文に「#X のマージ後に着手」と書く（ランナーがこの文言を機械的に読む。表記を変えない）。
**依存チェーンばかりだとループは並行して進められない。** 互いに独立した Issue を混ぜて供給すると、
ある PR のレビュー待ちの間に別の Issue が進む。

粒度が大きい仕様は、人間が分解Issueを起票するか、
「〜をタスク分解して `loop:ready` Issueを起票する」というIssue自体を `loop:ready` にしてもよい（分解もループにやらせる）。

Claude Code 内で `/loop-issue <やりたいことの概要>` を実行すると、コードを調査したうえで上記の要点を満たす Issue を起票できる
（手順は [.claude/commands/loop-issue.md](../.claude/commands/loop-issue.md)）。

## コマンド

```bash
./scripts/loop-once.sh        # 1 tick だけ実行
./scripts/loop.sh 10          # SUCCESS 10 回まで回す（夜間バッチ向け）
./scripts/loop.sh 10 astra    # モデルを指定して実行（opus / fable / astra、デフォルト: opus）

./scripts/loop/state.sh | jq                              # いまの状態を見る（読み取り専用）
./scripts/loop/state.sh | ./scripts/loop/decide.sh | jq   # 次の tick が何をするかを見る（読み取り専用）
```

`loop.sh` は 1 tick の結果（`loop-once.sh` の終了コード）で継続を判断する。

| 1 tick の結果 | exit | SUCCESS 回数 | カウンタの扱い | 停止条件 |
|---------------|------|-------------|---------------|---------|
| SUCCESS | 0 | +1 | 失敗・エスカレーション・待機の各カウンタをリセット | — |
| NO_TASK | 2 | — | — | 即終了 |
| ESCALATED | 3 | — | エスカレーション +1／失敗・待機をリセット | 連続 3 回で終了 |
| WAITING | 4 | — | 失敗・エスカレーションをリセット。`LOOP_WAIT_SECONDS`（既定 60 秒）ごとに状態を取り直し、変化したら次の tick | 状態が変わらないまま `LOOP_MAX_WAIT_SECONDS`（既定 2 時間）で終了 |
| FAILED（決定論的） | 5 | — | — | 即終了（手順・ツール・設定の不整合。再実行しても直らない） |
| FAILED（一過性） | 1 | — | 失敗 +1／エスカレーション・待機をリセット | 連続 2 回で終了 |

「連続」は文字どおりで、別の結果が出た時点でカウンタは 0 に戻る。安全弁として試行回数は指定回数の 4 倍で打ち切る。

ランナーはセッションの `LOOP_RESULT: SUCCESS` を鵜呑みにせず、GitHub 側で裏を取る
（実装なら `loop/issue-<N>-*` の PR が open か、CI 修理なら head が進んだか、レビュー対応なら未解決の CodeRabbit スレッドが 0 か）。
裏が取れなければ一過性の失敗として扱う。

終了時は必ず終端結果を 1 行出力する（ログから停止理由を判別するため）:

```
LOOP_RUN_RESULT: <COMPLETED | NO_TASK | ESCALATED_LIMIT | FAILED_LIMIT | FAILED_DETERMINISTIC | WAIT_TIMEOUT | ATTEMPT_LIMIT> completed=<n>/<N> attempts=<n>
```

各セッションは**毎回新規に起動**する。opus / fable は Claude Code（`claude -p "/loop-implement <N>" --model <モデル>` など）、
astra は Codex CLI（`codex exec --model gpt-6-astra`。要 `npm install -g @openai/codex`）で実行する。
対話セッション内で 1 tick を試したい場合は Claude Code 内で `/loop-once` を実行する（状態収集と判定はスクリプトに任せ、選ばれた仕事だけをその場で行う）。
ログは `.loop/logs/` に残る（gitignore済み。tick ごとの状態 JSON と判定 JSON も同じ場所に残る）。

## 人間の役割（レビュー）

```bash
gh pr list --state merged --limit 20   # マージされたPR → コードを読んで理解する
./scripts/loop/state.sh | jq '.prs'    # 未マージの loop PR → CI失敗/コンフリクト/未解決スレッドの確認
gh issue list --label loop:human       # 判断待ち → 判断してIssue更新（対応後 loop:ready に戻す）
gh issue list --label loop:blocked     # 技術的ブロッカー → 解消して loop:ready に戻す
gh issue list --label loop:wip         # 残っていたら異常終了の痕跡。状況確認して戻す
git stash list | grep loop-abandoned   # 中断セッションの退避作業（あれば）
```

**マージされたPRも必ず読むこと。** 自動マージは「CIが通った」ことしか保証しない。
コードを読まずに積み上げると理解の負債（Comprehension Debt）が溜まり、いずれ設計判断ができなくなる。
あわせて、ループが CodeRabbit の指摘を**退けた理由**（PRコメントの「🤖 CodeRabbit レビュー対応」と各スレッドの `🤖` 返信）にも目を通し、
判断が甘ければ [loop-resolve-coderabbit.md](../.claude/commands/loop-resolve-coderabbit.md) の判定基準を直す。

## ループ機構そのものの変更

`scripts/loop*.sh`、`scripts/loop/`、`.claude/commands/loop-*.md`、`docs/loop-session-rules.md`、そしてこの文書 `docs/loop-engineering.md` の変更は、
ループに自律実装させず人間が行う（`loop:human`）。セッションが自分の判定順序や信頼境界を書き換えられないよう、
`docs/loop-session-rules.md` の絶対ルールでもこれらのファイルの編集を禁止している。手順書に書いたコマンドが実行環境で動くかは CI では検証されないため、
変更したら必ずランナーのマシンで `./scripts/loop/state.sh | ./scripts/loop/decide.sh` を実行して裏を取る。
コマンド定義（`.claude/commands/loop-*.md`）の「現在の状況」にある `!` コマンドは、1 つでも失敗すると Claude が 0 ターンで終了する
（ランナーは `FAILED kind=deterministic reason=session-not-started` で止まる）。`!` コマンドを変えたら
`claude -p "/loop-<cmd> <引数>" --max-turns 1` で展開が通ることを確認する。`{owner}/{repo}` を含む `gh api` のパスは
シェルの波括弧展開を避けるため必ず引用符で囲む。

## 注意事項

- **`--dangerously-skip-permissions` で動く**ため、信頼できるタスクだけを `loop:ready` に置くこと。
  ループを回すマシンの環境変数・`.env` に本番の認証情報を置かない（被害の上限がここで決まる）。
- **Prisma のマイグレーションはループに実装させない。** schema 変更が必要だと判明したIssueは
  `loop:human` にエスカレーションし、人間がマイグレーションの内容と適用手順を確認する。
- **コンフリクト**: 連続するセッションが同じファイルを触るとauto-mergeが失敗する（ランナーが `loop-fix-ci` で解消を試みる）。
  関連の深いタスクは1つのIssueにまとめるか、本文に「#X のマージ後に着手」と書く。
- **コスト**: 1 セッション = 1 セッション分のトークンを消費する。回数指定は残タスク数に合わせる（多めに指定してもタスク枯渇で自動停止する）。

## 参考資料

- [ループエンジニアリングとは？AIを自律的に実行する手法を完全解説（aidd.jp）](https://aidd.jp/blog/knowledge/loop-engineering/)
- [ループエンジニアリングとは？AIエージェントを自律で回す設計手法と6つの構成要素（AI総合研究所）](https://www.ai-souken.com/article/what-is-loop-engineering)
- [ループエンジニアリング — AIエージェント時代の開発組織マネジメント（Findy Team+）](https://jp.findy-team.io/blogs/loop-engineering/)
- [Loop Engineering — 自律エージェントループの設計原則（maxmilian/loop-engineering）](https://github.com/maxmilian/loop-engineering)
