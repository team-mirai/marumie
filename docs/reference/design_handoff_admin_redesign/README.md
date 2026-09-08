# Handoff: 管理画面（/admin）Team Mirai デザインシステム適用

marumie（team-mirai/marumie）の管理画面を、Team Mirai デザインシステム（team-mir.ai のブランド）に合わせてリスタイルするためのハンドオフです。

## Overview

現状の admin はダーク系の shadcn デフォルトに近い見た目で、ブランドとの一貫性がない。
このハンドオフは「白ベース + Mirai Teal + 黒1pxボーダー + ピル形状」というブランド言語を admin 全体に適用するためのデザインリファレンスと実装指針をまとめたもの。

## About the Design Files

同梱の `Marumie Admin.dc.html` は **HTMLで作ったデザインリファレンス（モック）** であり、そのまま使うプロダクションコードではない。
実装タスクは、このモックの見た目・挙動を **admin の既存環境（Next.js 16 / React 19 / Tailwind CSS v4 / Radix ベースの ui コンポーネント群）で再現すること**。既存の `admin/src/client/components/ui/*`（button, input, select, table, dialog…）と `admin/src/app/globals.css` のトークンを書き換える方針を推奨（各画面のクラスを個別に書き換えるより、トークンと ui/* の変更で大半が波及する）。

モックはブラウザで直接開けば動く（フォントTTFは同梱していないため Noto Sans はシステムフォールバックになる。トークン・レイアウトの確認には支障なし）。

## Fidelity

**中〜高フィデリティ。** 色・タイポ・形状・状態（hover等）のトークンは確定値として扱ってよい。
一方、画面は代表4画面のみで、余白の細部やレスポンシブはラフ。「完璧にせず大まかに反映」という前提で、既存レイアウトを大きく変えずトークンとコンポーネントスタイルを差し替えるのが趣旨。

## デザイン原則（Team Mirai ブランドの要点）

- ブランド色は **Mirai Teal `#30BCA7` のみ**。青・紫・オレンジは使わない（現状の `bg-primary`(青) / `hover:bg-blue-600` は全廃）。
- **ダークUI → 白ベース** に反転。ページ背景 `#F8F8F8`、カード白。
- デフォルトボーダーは **黒 `#000` の 1px（強調は1.5px）**。カードは黒1px枠 + 角丸8px。影はほぼ使わない。
- **ピル（border-radius: 9999px）が署名形状**：ボタン・入力・selectはすべてピル。カード類の角丸は4–8pxの小さめ。
- 日本語: Hiragino Kaku Gothic（fallback Noto Sans）/ 数字・英字・日付: **Poppins**。
- 日付表記は `YYYY.MM.DD`（スラッシュでなくピリオド）。
- アイコンは **Phosphor Icons（regular weight）**。絵文字・グラデーションは使わない。
- hover は 120–200ms ease-out の色変化のみ（スケールやバウンスなし）。
- 見出しの署名的装飾：teal-soft の下線（`text-decoration: underline; text-decoration-color: #64D8C6; text-decoration-thickness: 3px; text-underline-offset: 6px`）。

## Design Tokens

`_ds/.../colors_and_type.css` に全トークン（CSS変数 `--tm-*`）あり。実装では `admin/src/app/globals.css` の Tailwind テーマ変数へ移植する。主要値:

| Token | 値 | 用途 |
|---|---|---|
| teal (primary) | `#30BCA7` | プライマリボタン、アクセント |
| teal-hover | `#089781` | primary hover、英字セクションラベル文字 |
| teal-deep | `#0F8472` | pressed、アクティブnav文字、リンク |
| teal-soft | `#64D8C6` | 見出し下線 |
| teal-100 | `#E2F6F3` | アクティブnav背景、ドロップゾーン背景、収入バッジ背景 |
| red | `#E63946` | 破壊的操作（削除）、必須マーク |
| black | `#000000` | 文字、ボーダー |
| ink | `#1F2937` | nav等のやや柔らかい文字 |
| gray ramp | `#F8F8F8 / #F0F0F0 / #E5E5E5 / #D9D9D9 / #CCC / #B1B1B1 / #939393 / #666 / #4C4C4C / #333` | 背景・罫線・補助文字 |
| radius | pill `9999px` / card `8px` / chip `4px` | |
| font-jp | Hiragino Kaku Gothic ProN → Noto Sans | 本文 |
| font-latin | Poppins | 数字・日付・英字ラベル |
| 罫線 | 黒1px（強調1.5px）、表の行罫線は `#E5E5E5` | |
| hover transition | `120–200ms ease-out`（色のみ） | |

### globals.css への移植例（Tailwind v4 `@theme` 変数の差し替え目安）

```
--background: #F8F8F8;      --foreground: #000000;
--card: #FFFFFF;            --card-foreground: #000000;
--primary: #30BCA7;         --primary-foreground: #FFFFFF;
--secondary: #F8F8F8;       --secondary-foreground: #000000;
--muted: #F0F0F0;           --muted-foreground: #666666;
--destructive: #E63946;
--border: #000000;          /* 表の行罫線など弱い線は #E5E5E5 を別途 */
--input: #FFFFFF;           --ring: #30BCA7;
--radius: 8px;              /* ボタン・入力は rounded-full を明示 */
```

## Screens / Views

モックは左サイドバー + 4画面（サイドバーのクリックで切替。未実装メニューはプレースホルダー表示）。

### 1. サイドバー（全画面共通）
対応コード: `admin/src/client/components/layout/Sidebar.tsx`, `admin/src/app/(auth)/layout.tsx`

- レイアウト: grid `236px + 1fr`、サイドバーは白背景・右罫線 `1px #E5E5E5`・sticky（`height: 100vh`）。
- ヘッダー: 「みらいまる見え政治資金」(13px/700) + 「ADMIN CONSOLE」(Poppins 10px/600/letter-spacing 0.14em/色 #089781)。**ロゴ画像は置かない**（ブランドガイド上、ロゴの改変・多用を避けるため文字のみ）。
- セクション見出し（基本情報/データ取り込み/報告書）: 11px/600、`#939393`、letter-spacing 0.12em。
- navアイテム: ピル形。アイコン(Phosphor 16px) + ラベル13px。
  - 通常: 文字 `#1F2937`、weight 500、背景透過。hover: 背景 `#E2F6F3`。
  - アクティブ: 背景 `#E2F6F3`、文字 `#0F8472`、weight 700。
  - アイコン対応: ユーザー情報 `ph-user` / 政治団体 `ph-bank` / ユーザー管理 `ph-users` / 取引一覧 `ph-list-bullets` / 取引一括削除 `ph-trash` / CSVアップロード `ph-upload-simple` / 残高登録 `ph-coins` / 取引先マスタ `ph-address-book` / 取引先紐付け `ph-link` / 寄付者マスタ `ph-hand-heart` / 寄付者紐付け `ph-link-simple` / 報告書エクスポート `ph-export`。
- 折りたたみ: ヘッダー右の控えめなアイコンボタン（枠なし、`#B1B1B1`、hoverで `#666`）。折りたたみ時は幅72pxのアイコンレール（各項目 `title` ツールチップ、中央寄せ）。
- フッター: 上罫線 `1px #E5E5E5`、`ph-user-circle`(teal-deep) + メールアドレス(Poppins 12px `#666`)、ログアウトは**黒1.5px枠の白ピル**（`ph-sign-out` + 13px/700、hover `#F8F8F8`）。現状の `variant="destructive"` はやめる（破壊的操作ではないため）。

### 2. 取引一覧（/transactions）
対応コード: `TransactionsClient.tsx`, `TransactionRow.tsx`

- ページヘッダー: 英字ラベル「Transactions」(Poppins 13px/600/ls 0.1em/#089781) + h1「取引一覧」(26px/700/ls 0.06em、teal-soft 3px下線 offset 6px)。
- コンテンツカード: 白、黒1px枠、radius 8px、padding 24px。
- ツールバー: 左に団体select（ピル、黒1.5px枠、13px）+ 件数表示（13px `#666`「全 N 件中 x - y 件を表示」）。右に「キャッシュクリア」(黒1.5px枠白ピル 12px/700 + `ph-arrows-clockwise`) と「全件削除」(**赤枠白地赤文字**ピル + `ph-trash`、hover `#FDF0F1`)。
- テーブル: ヘッダー行下罫線 **黒1.5px**、th 12px/700。行罫線 `1px #E5E5E5`。セルpadding `10px 12px`。
  - 取引No: Poppins 12px `#666` / 取引日: Poppins 13px（`YYYY.MM.DD`）/ 金額: Poppins 13px/600 右寄せ `¥1,234,567`。
  - 種別バッジ（ピル 11px/700、1.5px枠）: 現金収入=枠・文字 `#0F8472`・背景 `#E2F6F3` / 現金支出=枠・文字 `#E63946`・背景白 / 非現金仕訳=枠 `#939393`・文字 `#666`・背景 `#F8F8F8`。
  - **カテゴリピル: webapp（front）と完全に同一ルール**（下記「カテゴリピル」参照）。
  - 摘要: 12px `#666`、max-width 200px ellipsis。操作: `ph-trash` アイコンのみ（16px `#939393`）。
- ページネーション: 中央寄せ。「前へ/次へ」黒1.5px枠白ピル（無効時は `#CCC` 枠・`#B1B1B1` 文字・not-allowed）、中央に Poppins「1 / 25」。

### カテゴリピル（front と共通化すること）
参照: `webapp/src/client/components/top-page/features/transactions-table/TransactionTableRow.tsx` の `getCategoryColors` と `shared/accounting/account-category.ts` の `PL_CATEGORIES`。

- 形状: `rounded-full`、`border 1px`、padding 目安 `2px 12px`、12px/500。
- 収入: 背景=カテゴリ色、枠=カテゴリ色、文字 `#47474C`。
- 支出: 背景白、枠=カテゴリ色、文字=カテゴリ色。
- 非現金仕訳: 背景白、枠 `#CCC`、文字 `#666`、ラベル「-」。
- 色・略称は `PL_CATEGORIES` の `color` / `shortLabel` をそのまま使う（admin独自の色分岐 `getCategoryColor` 系は front のルールに揃えて共通化するのが望ましい）。

### 3. 政治団体一覧（/political-organizations）
対応コード: `admin/src/app/(auth)/political-organizations/page.tsx`

- ヘッダー行: 左に英字ラベル「Organizations」+ h1「政治団体一覧」（下線付き）。右に「新規作成」= **teal塗りピル**（`#30BCA7`、白文字13px/700、`ph-plus`、hover `#089781`）。
- 団体カード: 白、黒1px枠、radius 8px、padding `22px 26px`。
  - 団体名 17px/700 + 種別ピル（背景 `#E2F6F3`、文字 `#0F8472`、11px/700）。
  - 説明 13px `#666`、作成日 Poppins 12px `#939393`（`作成日: YYYY.MM.DD`）。
  - 右に「編集」黒1.5px枠白ピル / 「削除」赤枠白地赤文字ピル（12px/700、`white-space: nowrap`）。

### 4. 取引先マスタ（/counterparts）
対応コード: `CounterpartMasterClient.tsx`, `CounterpartTable.tsx`

- ヘッダー行: 「Counterparts」+ h1「取引先マスタ管理」+ 右に teal「新規作成」ピル。
- カード内: 検索input（ピル、黒1.5px枠、placeholder `#B1B1B1`、focusで枠teal + `box-shadow: 0 0 0 2px #E2F6F3`）+「検索」黒枠ピル（`ph-magnifying-glass`）。
- 件数「312件の取引先」13px `#666`。
- テーブル: 取引一覧と同じ罫線ルール。名前セルはリンク（`#0F8472`、hover `#089781` + 下線）。使用数は Poppins 右寄せ「N件」。操作列に小ピル「編集」（黒枠）/「削除」（赤枠）11px/700 `white-space: nowrap`。

### 5. CSVアップロード（/upload-csv）
対応コード: `CsvUploadClient.tsx`（モックはレイアウト推定を含む）

- 「Data Import」+ h1「CSVアップロード」。カードは max-width 720px。
- フォーム: 政治団体 / データソース の2 select（ラベル12px/700 + 赤 `*`、ピルselect）。
- ドロップゾーン: `1.5px dashed #30BCA7`、背景 `#E2F6F3`、radius 8px、padding `48px 24px` 中央寄せ。`ph-upload-simple` 36px `#0F8472`、「CSVファイルをドラッグ＆ドロップ」14px/700、「ファイルを選択」黒枠白ピル、注記「UTF-8 / Shift-JIS ・ 最大 10MB」Poppins 11px `#939393`。
- 右下に「プレビューを表示」teal塗りピル + `ph-arrow-right`。

### 6. その他の画面（紐付け・報告書エクスポート等）
モックでは未作成。上記と同じ語彙で展開する:
ページヘッダー（英字ラベル+下線付きh1）/ 白カード黒枠 / ピルボタン（primary=teal塗り、secondary=黒枠白、destructive=赤枠白地）/ ピル入力・select / テーブル罫線ルール。ダイアログ（Radix Dialog）は白背景・黒1px枠・radius 8px・タイトル墨文字に置き換え。

## Interactions & Behavior

- hover: 色のみ 150ms ease-out。teal塗り→ `#089781`、白ピル→ `#F8F8F8`、赤枠→ `#FDF0F1`、navアイテム→背景 `#E2F6F3`。
- focus-visible: `2px solid #30BCA7` リング（offset 2px）。入力は枠teal + `0 0 0 2px #E2F6F3`。
- 無効ボタン: 枠 `#CCC`、文字 `#B1B1B1`、cursor not-allowed（opacityトリックは使わない）。
- サイドバー折りたたみ: 幅 236px ↔ 72px。折りたたみ状態はローカル（persist不要、してもよい）。
- ローディング/スピナー: 既存挙動を踏襲しつつ色を teal に（`border-t-transparent` のスピナーは `#30BCA7`）。
- アニメーション: バウンス・スケール・パララックス禁止。

## State Management

既存のまま（このハンドオフは見た目の差し替えが主）。モック固有の状態は `screen`（表示画面）と `collapsed`（サイドバー）のみで、実装では Next.js のルーティングと置き換わる。

## Assets

- Phosphor Icons regular: CDN `https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css`（React なら `@phosphor-icons/react` を regular weight で。**lucide-react から置き換え推奨**、少なくとも新規はPhosphor）。
- フォント: Poppins（Google Fonts等から）。日本語は Hiragino → Noto Sans fallback のスタック指定のみでよい。
- ロゴ画像: admin では不使用。

## Files

- `Marumie Admin.dc.html` — モック本体（ブラウザで直接開ける。サイドバーのメニューで画面切替）
- `support.js` — モックのランタイム（参照不要）
- `_ds/.../colors_and_type.css` — デザイントークン一式（`--tm-*` CSS変数。実装時の正）
- `_ds/.../_ds_bundle.js` — モック用バンドル（参照不要）

## 実装順の提案

1. `admin/src/app/globals.css` のテーマ変数をライト+tealに差し替え（上記移植例）
2. `ui/button.tsx` `ui/input.tsx` `ui/select.tsx` を ピル形状 + 黒枠/teal塗り/赤枠 の3バリアントへ
3. `Sidebar.tsx`（白背景・ピルnav・アイコン・折りたたみ）と `(auth)/layout.tsx`（背景 `#F8F8F8`）
4. 各画面の `text-white` / `bg-blue-600` 等のハードコードをトークン参照へ置換、ページヘッダー（英字ラベル+下線h1）を共通コンポーネント化
5. カテゴリピルを front とルール共通化（shared に移すのが理想）
