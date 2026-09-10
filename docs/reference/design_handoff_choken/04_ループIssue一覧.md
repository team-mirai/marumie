# 04 ループIssue一覧（起票案）

`docs/loop-engineering.md`・`.claude/commands/loop-issue.md` の運用に沿った起票案。**このままコピペせず、起票時に `/loop-issue` でコードを調査して最新化すること**（How は書かない原則のため、本文は Why / Done / Out of scope に絞ってある）。

運用メモ：

- 全 Issue の Done に「`pnpm verify` が通る」を含める（以下では省略）
- 番号は依存順。後続 Issue の本文に「#X のマージ後に着手」を書く
- 本件はユーザー方針で backend 先行のため、Phase 1 は「Done をテストで検証する」形の Issue にしている（縦切り原則との折り合い。Phase 2 で UI が繋がる）
- 先にこのハンドオフ一式を `docs/reference/design_handoff_choken/` としてコミットしておくこと（Phase 2 以降の Issue が参照する）

---

## Phase 0 — 人間の作業（`loop:human`）

### H-1. `feat(research-fund): 調研費の Prisma schema とシードを追加`
- **Why**: 調研費機能の全テーブルの土台。マイグレーションはループに実装させない運用ルールのため人間が行う
- **Done**: `docs/reference/design_handoff_choken/01_データモデル.md` の schema 草案どおりのテーブルがマイグレーションで作成される（政党テーブルは作らず、membership は既存 political_organizations を参照）／`research_fund_accounts` に科目マスタ（資産2＋収入1＋調研費カテゴリ21分類）がシードされる／法定区分マッピングの ※要確認 箇所（01_データモデル.md の表）を人間が確定させてからシードに反映する／開発用シードに議員2名（所属あり/なし）と2026年度帳簿が入る
- **Out of scope**: 既存 transactions・counterparts・donors への変更／マスキング処理
- **ラベル**: `loop:human`

### H-2. `chore: 領収書用 Supabase Storage バケットと環境変数の整備`
- **Why**: スキャンパイプラインの前提。外部リソース作成は人間の作業
- **Done**: 領収書用バケット（非公開・署名URL配信）が作成され、接続情報が Vercel/ローカルの env に設定される／ANTHROPIC_API_KEY が admin の env に設定される
- **ラベル**: `loop:human`

---

## Phase 1 — バックエンド（すべて `loop:ready`、H-1 マージ後）

### 1. `feat(research-fund): 複式仕訳ドメイン（posting・状態遷移・hash）`
- **Why**: 調研費の全機能が乗る複式簿記の核。UI は科目＋金額しか扱わないため、lines の生成と検証をドメインに閉じ込める
- **Done**: 仕訳3パターン（支出/支給/返還）から lines を生成し貸借一致を検証するドメインのユニットテストが通る／不一致・不正科目は `RF_` 系エラーコードで拒否される／draft→approved→published の遷移ルール（逆行・スキップの禁止）がテストで検証される
- **Out of scope**: リポジトリ実装／UI／スキャン
- **ヒント**: docs/reference/design_handoff_choken/01_データモデル.md・02_バックエンド実装計画.md

### 2. `feat(research-fund): 議員の管理ユースケース`
- **Why**: データのルート。議員は所属なしでも存在できる（membership 別テーブル。親は既存 political_organizations で政党テーブルは新設しない）
- **Done**: 議員の作成/更新/削除、既存 political_organizations への membership の付け外しのユースケーステストが通る／削除は帳簿・仕訳・書類まで連鎖する／テナント外の議員を操作できないことがテストで検証される
- **Out of scope**: UI／published データがある場合の削除ガード仕様の追加検討（`loop:human` 論点）

### 3. `feat(research-fund): 年度帳簿と支給生成ユースケース`
- **Why**: 「1年間のお財布」の作成と、毎月100万円の収入仕訳を1クリックで作る土台
- **Done**: 帳簿作成（議員×年度 UNIQUE）／月指定の支給生成（source=grant・approved で作成・同月の二重生成は拒否・当選月起点）のテストが通る／月途中当選の按分額が grant-schedule のテストで検証される
- **Out of scope**: 年度末の返還仕訳の自動生成（クローズ処理は別Issue）

### 4. `feat(research-fund): 仕訳の作成・編集・確認・一覧ユースケース`
- **Why**: 目視確認ワークフローの中心。手動作成（領収書なし）もここ
- **Done**: 手動作成／編集（draft・approved のみ可）／approve／破棄／フィルタ付き一覧（status・月・科目・source、split_group の束ね情報つき）のテストが通る／published の編集が拒否される
- **Out of scope**: スキャン起点の作成／公開処理

### 5. `feat(research-fund): 公開ユースケースとサンキー集計`
- **Why**: 人間の確認を通った仕訳だけを公開し、公開前後の見え方を検証可能にする
- **Done**: approved の一括 publish（published_at 記録・book.published_through 更新・webapp キャッシュ無効化呼び出し）のテストが通る／サンキー集計（費目別合計＋未使用、法定区分への切替）が科目マスタのマッピングどおりに集計されるテストが通る
- **Out of scope**: 公開の取り消し（unpublish）は別Issueで起票する

### 6. `feat(research-fund): 書類ストレージと領収書ドキュメント管理`
- **Why**: スキャンの入口。原本は非公開バケット＋署名URLで配信する
- **Done**: DocumentStorage インターフェース経由でアップロード/署名URL取得ができる（実装はSupabase、テストはモック）／documents の作成・帳簿スコープ検証のテストが通る
- **Out of scope**: マスキング処理（masked_key は未使用のまま）
- **ヒント**: #H-2 のバケットが前提

### 7. `feat(research-fund): 読み取りプロンプトの版管理ユースケース`
- **Why**: 議員室ごとの整理プロンプトを管理画面から安全に育てるため（版履歴・巻き戻し）
- **Done**: 保存で version が採番され有効版が切り替わる／過去版の再有効化（巻き戻し）ができる／各版の使用ジョブ数が取得できる／プロンプトが1つも無い議員はデフォルトテンプレート（#8 の定数）を内容とする初期版から始められる、のテストが通る
- **Out of scope**: テスト実行（#9）

### 8. `feat(research-fund): レシート抽出ゲートウェイ（vercel ai + Claude）`
- **Why**: 画像/PDF → 構造化 JSON のコア。既存 VercelAIGateway と同じ層に置く
- **Done**: ReceiptExtractionGateway が画像・PDF を受けて ExtractedReceipt（Zod検証済み）を返す／自動生成部プロンプト（出力スキーマの指示・カテゴリ21分類の語彙と定義文を Zod スキーマ・分類定義の定数から組み立てる。編集不可）に議員室プロンプトが合成される／split_group の分割粒度規則・「迷ったら needs-review」を含む議員室プロンプトの**デフォルトテンプレート**が定数として提供される／不正出力が正規化 or エラーになるユニットテスト（LLMはモック）が通る
- **Out of scope**: ジョブ実行・リトライ制御（#9）
- **ヒント**: 前例は admin/src/server/contexts/report/infrastructure/llm/。generateObject を使う。モデルは env で差し替え可能に

### 9. `feat(research-fund): スキャンバッチとジョブ実行ユースケース`
- **Why**: 週1回・30枚一括の入力を無人で仕訳化する本丸
- **Done**: バッチ作成（documents＋queuedジョブ生成）／process（queuedを古い順にN件、成功時に draft 仕訳生成・raw_json 保存、失敗時に error 記録）／失敗ジョブの再実行／running の多重実行防止、のテストが通る（LLM・Storageはモック）／1書類複数明細で同一 split_group の複数 draft ができることがテストで検証される
- **Out of scope**: 外部キュー基盤の導入／UI
- **ヒント**: #6 #7 #8 のマージ後に着手

---

## Phase 2 — admin UI（すべて `loop:ready`。デザインの正は docs/reference/design_handoff_choken/design/調研費 管理画面.dc.html と 03_フロントエンド実装計画.md）

### 10. `feat(admin): グローバル対象セレクタとモード切替サイドバー`
- **Why**: 投入先ミス（別の議員室の帳簿にスキャンを投げる等）を構造的に防ぐ。全画面の前提になる
- **Done**: サイドバー上部の「現在の対象」カード＋切り替えオーバーレイ（政治団体×年度／議員×年度の2グループ）が動く／選択モードでサイドバーの節構成が変わる／「ユーザー情報」ページが消える／既存の政治団体系ページがページ内セレクタなしでコンテキストに追従する
- **Out of scope**: 調研費の各画面（後続Issue）／権限によるセレクタ内容の絞り込みの高度化
- **ラベル**: `loop:ready` + `loop:unblock`（後続の全admin Issueが依存する基盤のため）

### 11. `feat(admin): 議員の一覧・作成・編集・削除画面`
- **Done**: 一覧カード／新規・編集の別ページ（同一フォーム・所属は既存 political_organizations からの任意select）／削除確認ダイアログが design どおり動き、#2 のユースケースに接続される
- **Out of scope**: 年度帳簿画面

### 12. `feat(admin): 年度帳簿画面`
- **Done**: 年度カード（公開範囲・支給/支出累計・確認待ち件数）と新規作成→スキャンへの誘導が動く

### 13. `feat(admin): 書類スキャン画面`
- **Done**: ドロップゾーン（帳簿バッジ・30枚上限・形式検証）→バッチ作成→ジョブ表（状態ピル・進捗バー・失敗の再実行・処理中ポーリング）→「完了分を確認へ」導線が実データで動く
- **ヒント**: #9 #10 のマージ後

### 14. `feat(admin): 仕訳の確認・編集画面`
- **Done**: ステータスタブ＋月フィルタ＋テーブル、右パネル（領収書署名URL表示・全フィールド編集・特記事項/備考の区別・確認済にする・破棄・前へ次へ）、↑↓キー移動、手動作成、が design どおり動く
- **Out of scope**: 公開画面

### 15. `feat(admin): 支給の登録画面`
- **Done**: テンプレート表示＋月次リスト（登録済み/この月を登録/未到来）が #3 に接続されて動く

### 16. `feat(admin): 公開画面（サンキー before/after）`
- **Done**: 確認済チェックリスト→before/after サンキーと差分文の即時更新→「n件（¥合計）を公開する」→公開ページに反映、まで動く
- **ヒント**: サンキーは webapp の SankeyChart を流用（未使用ノードの淡色スタイルつき）

### 17. `feat(admin): 支出群と成果の一覧・編集画面`
- **Done**: 一覧（自動集計値・成果物チップ・活用方針の保存）／新規・編集ページ（成果物の追加削除・仕訳紐づけチェックリストと金額/件数/期間のライブ集計）が動く

### 18. `feat(admin): 読み取りプロンプト画面`
- **Done**: 本文編集→保存で新版・有効化／版履歴と巻き戻し／自動生成部（出力スキーマ・21分類の語彙と定義文）の折りたたみ参照（読み取り専用）／テスト実行（書類を選んで抽出JSONを表示、仕訳は作られない）が動く

---

## Phase 3 — webapp 公開ページ（`loop:ready`。正は design/調研費まる見え.dc.html と wireframe/choken-marumie-design-spec.md）

### 19. `feat(webapp): 調研費 議員ページ（B-1〜B-5）`
- **Done**: `/choken/[slug]/[year]`（パスは既存慣習に合わせる）で published データのみから B-1 使いみちの流れ／B-2 1年間の推移／B-3 主要な支出の成果／B-4 すべての支出（月切替・ⓘ・領収書モーダル）／B-5 データについて、が表示される／spec §5「やらないこと」に反する要素がない
- **Out of scope**: 政党ページ（#20）／CSV（#21）

### 20. `feat(webapp): 政党ページの調研費セクション（A-6）と組織セレクタの2グループ化`
- **Done**: A-6（KPI2枚・横棒・議員リスト＝行選択で絞り込み＋詳細遷移・準備中もグレー表示）が表示され、組織セレクタが「政治資金／調査研究費」の2グループになる／A-7 に調研費の記載が追加される
- **ヒント**: #19 のマージ後

### 21. `feat(webapp): 調研費のCSVダウンロード`
- **Done**: 議員ページから published の全支出を既存CSV形式に準じてダウンロードできる

---

## 起票しない・別途判断（`loop:human` 候補として認識しておく）

- 公開の取り消し（unpublish）・公開後の訂正フローの仕様
- published データを持つ議員の削除ガード（削除ではなく非公開化に倒すか）
- 領収書マスキングの運用（当面は原本公開の決定済み。再開時に要件定義）
- 年度クローズ（返還仕訳の自動生成）と details（B-5 文面）の編集UI
- 「主要な支出」の選定基準・活用方針を誰がいつ書くか（spec §8 の未決論点）
