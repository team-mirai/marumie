# Handoff: みらいまる見え政治資金 — 政治団体トップページ＋調研費ページ（最終デザイン）

リポジトリ `team-mirai/marumie` の **webapp（公開側）** に、調査研究費（調研費）の公開を追加するための最終デザイン。対象は2ページ。

1. **政治団体トップページ**（政党・チームみらい）— 既存ページに「所属議員｜調研費のサマリー」セクションを1つ追加
2. **調研費ページ**（議員×年度。第一弾は峰島侑也・2026年）— 新規ページ。付随して「すべての出入金」全件ページ

推奨配置：このフォルダごと `docs/reference/design_handoff_choken_webapp/` にコミット。admin・データモデル・バックエンドは既存の `design_handoff_choken/`（01〜04 の md）が正で、本書は公開側の見た目と挙動のみを扱う。

---

## About the Design Files

`design/` 配下は **HTML で作ったデザインリファレンス**（動くプロトタイプ）であり、本番コードではない。タスクは marumie の既存環境（Next.js App Router / Tailwind / 既存 `webapp/src/client/components/*`）で**再現実装**すること。

- `design/調研費まる見え_最終.dc.html` をブラウザで直接開くと動く（同階層の `support.js`・`choken-data.js`・`assets/` を参照）
- 初期表示は調研費ページ。ヘッダー右の組織セレクタで「政党・チームみらい」を選ぶとトップページ追加分に切り替わる
- **inline style を移植しない**。既存コンポーネント（`MainColumnCard` / `CardHeader` / `MainButton` / `SankeyChart` / `MonthlyChart` / `TransactionTableRow` / `InteractiveTransactionTable` / `ExplanationSection` / `TransparencySection` / `AboutSection` / `LinkCardsSection` / `Footer`）を再利用・拡張する。プロトタイプはこれらの実装値を写して作ってある
- ファイル内の Tweaks（`summaryLayout` / `soloUpcoming` / `partyChart` / `detailButton` / `receiptStyle`）は検討用の切替。**最終案は下記「確定した選択」のみ**。それ以外の分岐（`layB` `layC` `layCurrent` `soloB` `soloC` `partyBar` `btnTopLink` `btnBottom`、領収書リンク4種、`receiptOpen` モーダル）は実装しない

## Fidelity

**High-fidelity**。色・タイポ・余白・レスポンシブ値は本番サイトと既存コンポーネントの実装値に揃えてある。ピクセル単位で再現すること。

### 確定した選択

| 論点 | 最終 |
|---|---|
| トップページの議員サマリー | **A 議員切替**（議員チップ＋選択議員の KPI・内訳） |
| 公開議員が1名だけの間の表現 | **A 今後の公開予定チップ**（「峰島侑也」塗りチップ＋「他議員も今後追加」破線チップ） |
| トップページの内訳グラフ | **サンキーチャート**（詳細の区分／法律上の区分タブつき） |
| 詳細ページへの導線 | **見出し右：ボタン**「峰島侑也の調研費を詳しく ›」 |
| 領収書リンク | **非表示（第一弾）**。モーダルも出さない |

---

## 共通レイアウト

### ページ地（body）
- 背景 `linear-gradient(135deg, #E2F6F3 0%, #EEF6E2 100%)`、`background-attachment: fixed`
- 和文 `'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif`、本文 16px / lh 1.5 / `#171717`
- リンク `#238778`（hover で underline）。focus-visible は `2px solid #2AA693`・offset 2px

### ヘッダー（既存 HeaderClient 準拠）
- `position: fixed; top:0` / 外側 padding PC `16px 24px`・SP `12px 10px`
- 白カード `border-radius:20px`、内側 padding PC `0 24px`・SP `12px`、最小高さ PC 64px・SP 48px
- 左：党ロゴ 48×44 ＋ サービスロゴ（PC `service-logo-pc.svg` 高さ28／SP `service-logo-sp.svg` 126×45）。クリックでトップへ
- 中：ナビ（14px/700/#000、gap 24px、hover `#238778`）「収支の流れ／1年間の推移／すべての出入金／データについて／よくあるご質問」。**≤1023px で非表示**
- 右：**組織セレクタ**（max-width 217px、`border:0.5px solid #000`、radius 8px、背景 `linear-gradient(165deg, #E2F6F3 24%, #EEF6E2 76%)`、上段 対象名 14px/700、下段「2026年」12px `#238778`、chevron 24px）
  - ドロップダウン：幅 272px、radius 8px、`border:1px solid rgba(0,0,0,.5)`、shadow `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)`、padding 12px 0
  - グループ見出し 11px `#5a5a5a`、行は高さ36px・左 padding 24px・hover `#F3F4F6`、選択中は ✓（`#238778`）
  - **「表示する団体名」**：政党・チームみらい（選択可）／党首・安野貴博の政治団体（サブ「デジタル民主主義を考える会」、準備中グレー `#9CA3AF`）
  - **「調研費（議員別）」**：峰島侑也（サブ「2026年2月〜8月分を公開中」10px `#6a6a6a`）／安野貴博 ほか11人（サブ「準備中」、選択不可）
  - **「対象年」**：年ピル（非選択 `#ECECEC`、選択 700 `#238778`＋ミントグラデ）
  - 右下「閉じる」12px/700 `#238778`。外側クリックでも閉じる
  - 表示名：トップ＝「政党・チームみらい」、調研費＝「峰島侑也（調研費）」

### メイン列
- `max-width:1032px; margin:0 auto`、padding PC `120px 20px 80px`・SP `96px 20px 80px`、セクション間 gap 48px

### セクションカード（既存 MainColumnCard / CardHeader）
- 白・radius 24px・padding PC `48px`／SP `32px 18px`・内部 gap 32px
- ヘッダー：アイコン 30×30 ＋ 見出し（PC 27px／SP 20px、700、lh 1.52、ls 0.01em、#000）、下にサブ 14px/500 `#85868E`
- 更新日「2026.8.20時点」：PC は右上 13px/700 `#9CA3AF`、SP は右上に出さずカード末尾に 12px 右寄せ

### 「調研費とは」アコーディオン（両ページ共通）
- `<details>`。summary 14px/700 `#238778`＋chevron 18px、見出しとの間は margin-top -16px
- 本文ボックス：radius 12px、padding 20px、ミントグラデ背景、15px / lh 1.87
- 1文目を 18px/700 のブロックで強調：「調研費は、政党を通らず国から議員に対して毎月直接支給される公費です。」
- **文言差異（要確定）**：トップ版は「…公務・議員活動への限定と第三者による承認を自主基準として定めています。」、調研費ページ版は「…政党によるガイドラインを自主基準として定めています。」。プロトタイプの記載をそのまま使い、統一の要否は担当者に確認

### KPI カード（両ページ共通）
- 2枚横並び gap 8px。枠 `1px solid #E5E7EB`・radius 16px・padding 24px
- PC：縦積み gap 16px・`flex:1 1 240px`／SP：横並び space-between・幅100%
- ラベル 16px/700（支給総額 `#238778`、支出総額 `#DC2626`）、数値 PC 36px／SP 28px 700 `#1F2937`、単位「万円」16px/700 `#6B7280`
- 値：支給総額 **700** 万円／支出総額 **221** 万円

### 区分タブ（詳細の区分／法律上の区分）
- 下線タブ gap 28px、下罫 `1px solid #D1D5DB`、margin-bottom 16px
- 各タブ 16px/700、padding-bottom 8px、`border-bottom:2px`。選択中 `#238778`、非選択 `#9CA3AF`＋透明罫。color 150ms
- トップページと調研費ページで**状態は独立**

### サンキーチャート（既存 SankeyChart.tsx 準拠）
- 構成：左「公費から支給」(#2AA693) → 中央「合計」(#4F566B) → 右 各費目（#DC2626）＋末尾「未使用・未処理」（#6B7280）
- 流量色：左→中央 `#E5F7F4`、費目 `#FBE2E7`、未使用 `#E5E7EB`
- 寸法 PC：幅936・hub高さ450・左右マージン100・ノード幅 中央48/右36・文字14.5px・ノード間20／SP：幅360・hub 350・マージン48・24/18・8px・間隔10
- 右ノード上に割合（整数%、1%未満は「<1%」）、ノード中央右にラベル（`splitLabel` で7文字折返し・2行超は「…」）、中央ノード下に「700万円」
- **支給額の1%未満の費目は「その他」に集約**（ツールチップに内訳「費目 金額／…」）
- ホバーでツールチップ：白85%・`1px solid #64748B`・radius 6px・「費目　n件」＋「¥金額」

---

## ページ1：政治団体トップページ（追加分）

既存セクション（収支の流れ／1年間の推移／貸借対照表／すべての出入金）は**変更しない**。プロトタイプ冒頭の白帯「既存セクション…以下が追加分です。」は注記であり実装しない。

### 「所属議員｜調研費のサマリー」セクション（`#research-fund`）
挿入位置は既存セクション群の後（配置は既存ページ構成に合わせて担当者と確認）。

1. **CardHeader**：アイコン `icon-users.svg`、見出し「所属議員｜調研費のサマリー」、サブ「議員に毎月100万円支給される公費を、何に使ったか」、右上「2026.8.20時点」（SP は末尾「2026年2月〜8月支給分　2026.8.20時点」）
2. **調研費とは**（上記共通）
3. **議員チップ行**（margin-top -8px、gap 8px）
   - 「峰島侑也」：高さ36px・padding 0 16px・pill・`#238778` 塗り白字 14px/700
   - 「他議員も今後追加」：同寸・`1px dashed #D1D5DB`・白地・`#9CA3AF`
   - 公開議員が増えたら、公開済み議員をチップで並べ選択切替（選択中=`#238778`塗り／公開済み未選択=白地 `1px solid #1F2937`／準備中=`#E5E7EB`枠 `#9CA3AF`）。準備中議員を選んだ場合は KPI・グラフの代わりに破線ボックス「{氏名}の調研費は現在準備中です。記録シートの整理が完了した月から順次公開します。」
4. **選択議員の見出し行**（space-between・wrap）
   - 左：氏名 20px/700 ＋「試験公開中」バッジ（高さ22px・pill・`1px solid #238778`・背景 `#E2F6F3`・11px/700）、下に公開状況 13px `#6A7383`「2026年2月〜8月分を公開中」
   - 右：ボタン「峰島侑也の調研費を詳しく ›」高さ40px・padding 0 20px・白地・`1px solid #1F2937`・radius 6px・14px/700・hover `#F9FAFB` → 調研費ページへ
5. **KPI 2枚**（共通）
6. **区分タブ＋サンキー**（共通）。下に注記 12px `#9CA3AF`「支給額の1%未満の費目は「その他」にまとめています。」

---

## ページ2：調研費ページ（議員×年度）

URL 案 `/choken/[slug]/[year]`（全件は `/choken/[slug]/[year]/transactions`）。見出しはすべて「{氏名}・調研費｜…」。

### 2-1. 収支の流れ（`#cash-flow`）
- アイコン `icon-cashflow.svg`、見出し「峰島侑也・調研費｜収支の流れ」、サブ「議員に毎月100万円支給される公費を、何に使ったか」
- 右上は2行：「2026.8.20時点」「2026年2月〜8月支給分」
- 調研費とは → KPI 2枚 → 区分タブ＋サンキー（SP はグラフ下に「2026年2月〜8月支給分　2026.8.20時点」）

### 2-2. 活用方針と主な用途（`#highlights`）
- アイコン `icon-heart-handshake.svg`、見出し「峰島侑也・調研費｜活用方針と主な用途」、サブ「調研費の活用方針と、主要な支出の目的」
- **活用方針ボックス**：`1px solid #E5E7EB`・radius 16px・padding 24px・ミントグラデ背景。タイトル 16px/700「峰島侑也の調研費の活用方針」、本文 15px / lh 1.87
- **用途カード**：`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`・gap 16px。各カード `1px solid #E5E7EB`・radius 16px・padding 24px・gap 12px・`scroll-margin-top:120px`
  - 1行目：「★ 用途N」バッジ（高さ20px・pill・`#E2F6F3` 地・`#238778`・11px/700・星アイコン12px）＋ 日付 12px `#4B5563` ＋「N件」リンク（700・下線・`#238778`）
  - タイトル 18px/700、下に金額 20px/700 `#DC2626`「-99,000 円」（「円」12px `#4B5563` 400）
  - カテゴリピル（紐づく支出行のカテゴリをすべて並べる）
  - 説明 14px / lh 1.87
  - 成果物リンク 14px/700 `#238778` 下線＋外部リンクアイコン14px。URL が無い場合はグレー `#9CA3AF` テキスト（例「報告は準備中」）
- データ（第一弾）：①ボネクタ利用料 2026.6.30・1件・99,000円／②タウンミーティング会場費 2026.4.10〜7.23・3件・50,445円／③広島平和記念資料館 視察 2026.7.29・2件・44,800円。金額・件数・期間は支出群への仕訳紐づけから自動集計（admin 側仕様どおり）

### 2-3. 透明性バンド（既存 TransparencySection 準拠）
- 背景 `linear-gradient(to bottom right, #64D8C6, #BCECD3)`・radius 22px・padding 40px
- 見出し PC 27px／SP 20px 700 lh 1.5「調研費もまるごと公開。意味ある使い方か、検証できるように👀」
- 本文 PC 16px／SP 12px lh 1.75、max-width 874px。「こちらのnote」は 700 下線 `#1F2937` → `https://note.com/team_mirai_jp/n/n58fca6f9e4e8`

### 2-4. 月ごとの支出の推移（`#monthly-trends`、既存 MonthlyChart.tsx 準拠）
- アイコン `icon-barchart.svg`、見出し「峰島侑也・調研費｜月ごとの支出の推移」、サブ「今年の月ごとの支給と支出」
- 1〜12月を通年表示。データのない月（当選前の1月・未到来の9〜12月）は棒なし・月ラベル `#B6BCC6`
- 0軸の上に支給（`#2AA693`、毎月100万円）、下に支出（`#DC2626`）。棒幅 最大52.5px、高さ462
- 0軸 `#4B5563` 1px、軸線 `#E2E8F0`、Y軸ラベル 14px/500 `#4B5563`、X軸 13px
- **Y軸の目盛りと単位はリポジトリの `webapp/src/client/lib/chart-axis.ts` を使う**（1/2/5×10ⁿ刻み・0を挟んで対称・円/万円/億円の自動選択）。プロトタイプの固定50万円刻みより repo を優先
- ホバー：月単位のツールチップ「支給 100万円（`#238778`）／支出 n万円（`#DC2626`）」
- 凡例（右寄せ 14px/700 `#4B5563`、12px角）：支給 `#2AA693`／支出 `#DC2626`
- 狭幅は横スクロール（min-width 640px）

### 2-5. すべての出入金（`#transactions`）
- アイコン `icon-cashback.svg`、見出し「峰島侑也・調研費｜すべての出入金」、サブ「これまでにデータ連携された出入金の明細」
- **PC テーブル**（既存 TransactionTableRow 準拠）：ヘッダー高さ48px・14px/700。列 日付140px／カテゴリー200px／項目／金額180px（右寄せ・右 padding 24px）。行 高さ64px・下罫 `1px solid #D5DBE1`
  - 日付 16px/700「2026.5.8」形式、カテゴリーはピル、項目 16px/700 ＋ 特記事項 12px `#6B7280`（下段）、金額 20px/700 `#DC2626`「-124,747 円」
  - 用途カードに紐づく行は項目名の右に「★ 用途N」ピル（`#E2F6F3` 地）。クリックで該当カードへスムーズスクロール（上オフセット120px）し、カード枠を `#2AA693`＋`0 0 0 4px #E2F6F3` で1.8秒ハイライト
  - 用途カードの「N件」クリック → 該当行が表示範囲に入るまで展開し、先頭行へスクロール（オフセット140px）、該当行を `#E2F6F3` で2.5秒ハイライト（transition 400ms）
- **SP**（≤760px）：thead 非表示。1行を縦積み：日付12px `#4B5563` → 項目14px/700＋金額16px/700 → ピル＋用途ピル → 特記事項12px
- 並び：日付の新しい順。**複数点購入（split）は1点ずつ行を分け**、特記事項末尾に「同一注文でN点購入。1点ずつ行を分けて計上しています」
- 表示件数：先頭6件。下部に白グラデのフェード（高さ108px）＋ボタン「もっと見る」（270×48・白地・`1px solid #1F2937`・radius 6px・16px/700）→ 全件ページへ遷移
- カテゴリピル：高さ20px・padding 0 12px・pill・白地・枠と文字がカテゴリ色・12px/500
  - 注釈つき費目（現状「交通費」＝「航空券をのぞく電車・バス・タクシー代」）はピル末尾に「i」丸（13px・枠 `#C4C9D1`）。hover / focus / tap で黒ツールチップ（12px 白字・radius 6px・下向きキャレット）。SP でも出るよう title 属性に頼らない

### 2-6. データについて（`#explanation`、既存 ExplanationSection）
- 見出し 18px/700、本文 15px / lh 1.87。3ブロック：「みらい まる見え政治資金について」（既存文言）／**「調研費のデータについて」（新規）**／「免責事項」（既存）
- 下に「よくあるご質問」MainButton（270×48）
- 「調研費のデータについて」の文言内「詳細区分15分類」は、実装時のカテゴリ数（下記）に合わせて修正が必要

### 2-7. 政党ページへの導線
- 白カード radius 24px・padding `32px 48px`・space-between。テキスト 24px/700「政党・チームみらいの「まる見え政治資金」も公開中」＋右に 48px 丸ボタン（`1px solid #1F2937`・chevron 20px）。カード全体クリックでトップへ

### 2-8. チームみらいについて／応援リンク／フッター
既存 `AboutSection`・`LinkCardsSection`・`Footer` をそのまま使う。**リンク先・並びはリポジトリ側が正**（例：TikTok は repo の `@team_mirai_jp`、フッターの「貸借対照表」リンクも repo に従う。プロトタイプの一部値は古い）。
フッターのアンカーは調研費ページのセクション（収支の流れ／月ごとの収支推移／すべての出入金／データについて／チームみらいについて）を指す。

### 2-9. 全件ページ（「すべての出入金」）
- 同じカード。見出し・サブは 2-5 と同じ
- ヘッダー操作（既存 TransactionTableHeader 準拠）
  - 日付：chevron ボタン（24px・`#238778`）で新しい順⇄古い順
  - 金額：chevron で金額降順⇄昇順
  - カテゴリー：絞り込みボタン（3本線アイコン、選択中は `#E2F6F3` 地＋件数）。ポップオーバー：白・radius 4px・shadow `2px 4px 8px rgba(0,0,0,.1)`・padding 16px。見出し「支出カテゴリー」、「（すべて選択）」＋各カテゴリ（注釈があれば括弧で併記）のチェック行、下に「キャンセル」（`#F1F5F9` 地・`#238778`）「OK」（`#2AA693` 地・白）各120px。OK で確定し1ページ目へ
- 50件/ページ。フッター PC は3カラム［空／ページャー／CSVリンク］、SP は縦積み
  - ページャー：前へ／番号／次へ（40px角・radius 6px・`1px solid #D1D5DB`、現在ページ `#238778` 塗り、無効 `#C4C9D1`）、先頭・末尾・現在±1 以外は「…」
  - CSV：「出入金履歴をCSVでダウンロード」14px/700 `#238778`（処理中「ダウンロード中...」）。列：日付／詳細の区分／法律上の区分／項目／金額／特記事項。BOM つき UTF-8
  - 下に 14px/500 `#6A7383`「1〜50 / 296件を表示中　合計 2,212,581円」（絞り込み時は「（絞り込み中）」）
- 下に データについて・チームみらいについて・応援リンク（2-6, 2-8 と同じ）

---

## Interactions & Behavior（まとめ）
- 遷移：組織セレクタ／議員ボタン／政党導線カード／もっと見る。遷移時はページ先頭へ
- ホバー：ボタン類は背景 `#F9FAFB`、テキストリンクは underline のみ。transition 150ms（色・背景）
- レスポンシブ：**≤760px を SP**（ヘッダー・カード padding・見出しサイズ・KPI・テーブル・サンキー寸法・更新日位置が切替）、**≤1023px でヘッダーナビ非表示・フッターを2カラムグリッド**
- 公開データは published の仕訳のみ（CSV も同じ）
- 未使用額（支給−支出）はサンキーの末尾ノードとしてのみ表示し、KPI 化しない

## State
- トップ：`selectedPolitician`、`kubun`（plain | legal）
- 調研費ページ：`minKubun`、`shown`（初期6）、ハイライト用 `flashHl` / `flashRows`（一時状態）
- 全件ページ：`page`、`sort`（new | old | amtDesc | amtAsc）、`categories[]`（確定値）＋`draft[]`（ポップオーバー内）
- 取得データ：議員メタ（氏名・slug・公開状況）、年度の支給総額・支出総額、費目別集計（詳細区分／法律上の区分の両方、件数つき）、月別の支給・支出、支出行、用途カード（支出群）と紐づく行、活用方針

## Design Tokens
| 用途 | 値 |
|---|---|
| アクセント／リンク／選択中 | `#238778` |
| 支給・グラフ緑 | `#2AA693` |
| 支出・マイナス金額 | `#DC2626` |
| ミント面 | `#E2F6F3` |
| ページ地グラデ | `#E2F6F3 → #EEF6E2`（135deg） |
| 透明性バンド／フッター | `#64D8C6 ↔ #BCECD3` |
| 文字 | `#1F2937` / `#4B5563` / `#6B7280` / `#6A7383` / `#9CA3AF`、見出し `#000`、サブ `#85868E` |
| 罫・面 | 行罫 `#D5DBE1`、タブ罫・破線 `#D1D5DB`、カード枠 `#E5E7EB`、hover `#F9FAFB`、`#F3F4F6` |
| サンキー | 中央 `#4F566B`、流入 `#E5F7F4`、支出流 `#FBE2E7`、未使用 `#6B7280` / `#E5E7EB` |
| 角丸 | カード 24px、KPI・用途カード 16px、調研費とは 12px、ボタン 6px、セレクタ 8px、ピル 999px |
| 影 | ドロップダウンのみ（上記）。カードは影なし |

**カテゴリ色**（既存 `shared/accounting/account-category.ts` の PL_CATEGORIES 支出色を法律上の区分に割当、詳細区分は親の色を継承）

| 法律上の区分 | 色 | 詳細区分（プロトタイプ） |
|---|---|---|
| ① 人件費 | `#0369A1` | 人件費 |
| ② 光熱水費 | `#126C81` | 光熱水費 |
| ③ 備品・消耗品費 | `#4D7C0F` | PC・電子機器／文房具・備品／印刷費 |
| ④ 事務所費 | `#047857` | 通信・IT利用料／郵送・信書費／手数料 |
| ⑤ 交流費 | `#C2410C` | 来客対応費／会費 |
| ⑥ 広報紙誌の発行その他の事業費 | `#A16207` | 宣伝広報費 |
| ⑦ 調査研究費 | `#047857` | 新聞・書籍代／会議費 |
| ⑧ 寄附・交付金 | `#BE185D` | 寄附 |
| ⑨ 滞在費 | `#0369A1` | 交通費／航空券代／住居費／宿泊費／出張手配費 |
| その他 | `#334155` | その他 |

**カテゴリ数の注意**：プロトタイプは20分類（上表）、`design_handoff_choken/01_データモデル.md` の科目マスタは21分類。**実装はマスタが正**。詳細区分→法律上の区分の対応と色はマスタに持たせる。

## Assets（`design/assets/`、いずれも既存 `webapp/public/` 由来）
- `logos/`：team-mirai-logo.svg、service-logo-pc.svg、service-logo-sp.svg
- `icons/`：icon-users（議員サマリー）、icon-cashflow、icon-heart-handshake（用途）、icon-barchart、icon-cashback、icon-chevron-down、icon-outerlink、ほか
- `social-icons/`：web / yt / line / x / threads / fb / tiktok / github（Instagram は inline SVG）
- 用途バッジの星・chevron・絞り込みは inline SVG（stroke 2.2 / currentColor）。repo に同等アイコンがあればそちらを使う

## Files
| パス | 内容 |
|---|---|
| `design/調研費まる見え_最終.dc.html` | **最終デザイン（主参照）**。トップ追加分・調研費ページ・全件ページを1ファイルで切替 |
| `design/choken-data.js` | 実データ（峰島事務所 2026年2〜8月・296件）。カテゴリはプロトタイプ内で20分類へ読替 |
| `design/wireframe/choken-marumie-design-spec.md` | 公開側の設計仕様（セクション定義・やらないこと）。本書と食い違う場合は本書が新しい |
| `design/assets/`, `design/_ds/`, `design/support.js` | プロトタイプ表示用の依存ファイル。実装には使わない |

## 参照すべきリポジトリのファイル
`webapp/src/client/components/layout/header/HeaderClient.tsx`, `OrganizationYearSheet.tsx`, `layout/CardHeader.tsx`, `layout/MainColumnCard.tsx`, `ui/MainButton.tsx`, `top-page/CashFlowSection.tsx`, `top-page/features/financial-summary/*`, `top-page/features/charts/SankeyChart.tsx`, `useSankeyHelpers.ts`, `MonthlyChart.tsx`, `webapp/src/client/lib/chart-axis.ts`, `top-page/features/transactions-table/*`, `transactions/CsvDownloadLink.tsx`, `common/ExplanationSection.tsx`, `TransparencySection.tsx`, `AboutSection.tsx`, `LinkCardsSection.tsx`, `layout/footer/Footer.tsx`, `shared/accounting/account-category.ts`, `webapp/src/app/globals.css`

## 未決事項（実装前に確認）
1. 「調研費とは」の自主基準の一文がページ間で異なる（上記）
2. 「調研費のデータについて」の「15分類」表記 → マスタの分類数に合わせる
3. トップページでの議員サマリーセクションの挿入位置
4. 領収書の公開（第一弾は非表示。admin 側は原本保存済み）
