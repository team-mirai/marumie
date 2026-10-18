# Handoff: 調研費 admin — 仕訳の確認・編集画面のレイアウト改善（最終案 1a）

リポジトリ `team-mirai/marumie` の **admin** にある「仕訳の確認・編集」画面（`/politicians/[id]/books/[bookId]/entries`）を、一覧性と操作ミスの少なさを優先して組み替えるためのデザイン。2ペイン（一覧｜詳細）の構成はそのまま残し、詳細パネルを仕訳の状態に応じて組み替える。

推奨配置：このフォルダごと `docs/reference/design_handoff_journal_review/` にコミット。

対象ファイル（現行）

- `admin/src/client/components/research-fund/JournalReview.tsx` — ページ見出し・タブ・フィルター・未精算カード・まとめて操作バー・一覧・詳細カード
- `admin/src/client/components/research-fund/JournalEditor.tsx` — 領収書プレビュー・公開中の注意・仕訳フォーム・source 表示
- `JournalAdvanceField.tsx` / `JournalPayeeField.tsx` / `JournalReceiptAbsenceField.tsx` — 立替者・支払先・書類の事情の欄

ドメインモデル（`journal-review` / `advance` / `payee` / `receipt-absence` / `scan-reread`）とサーバーアクション（`mutateJournalReview` ほか）は**変更しない**のが前提。例外は「未決事項」に記載。

---

## About the Design Files

`design/` 配下は **HTML で作ったデザインリファレンス**で、本番コードではない。タスクは admin の既存環境（Next.js App Router / Tailwind / `@/client/components/ui` の Button・Card・Table・Input・NativeSelect・Textarea・Checkbox・Tabs・Dialog）で**再現実装**すること。

- `design/journal-review-1a.dc.html` をブラウザで直接開くと表示される（同階層の `support.js` を参照。フォントと Phosphor アイコンは CDN）
- 2つのアートボード（1440×900）が並んでいる
  - **1a 2ペイン整理**：公開中の仕訳を選んだ状態（読み取り表示）
  - **1a 編集ビュー**：下書きの仕訳を選んだ状態（入力欄）
- 静的なモックで、クリックしても動かない。挙動は本書の「Interactions & Behavior」が正
- **inline style は移植しない**。既存の UI コンポーネントと Tailwind のトークンで組む。色の対応は「Design Tokens」を参照

## Fidelity

**High-fidelity（レイアウト・寸法）**。各要素の配置・幅・高さ・文字サイズはモックに合わせる。色とコンポーネントの見た目は admin の既存トークン・既存コンポーネントを使い、近い値に寄せる（モックは既存の配色を写してある）。

---

## 画面全体

1440×900（サイドバー 236px 含む）で、**ページ全体をスクロールさせずに**一覧と詳細が収まることを目標にする。

```
┌ Sidebar 236 ┬ main（padding 16px 20px / 縦 gap 10px）──────────────────────────┐
│             │ ① 見出し行 36px                                                 │
│             │ ② ツールバー行 32px（タブ｜月｜立替者｜……｜要対応チップ）      │
│             │ ┌③ 一覧カード minmax(0,1fr) ───────┐ gap12 ┌④ 詳細カード 452px ┐ │
│             │ │ ヘッダー 34 / 行 38 ×n / フッター36│       │ ヘッダー固定       │ │
│             │ │（本文だけスクロール）              │       │ 本文スクロール     │ │
│             │ └───────────────────────────────────┘       │ フッター固定       │ │
│             │                                              └────────────────────┘ │
└─────────────┴─────────────────────────────────────────────────────────────────────┘
```

- ③④を並べるグリッド：`grid-template-columns: minmax(0,1fr) 452px; gap: 12px`。高さは「ビューポート − 見出し − ツールバー − 余白」いっぱい（`flex:1; min-height:0`）。③④それぞれの内部でスクロールさせる
- 現行の `xl:` 未満（1280px 未満）は現行と同じく縦積みでよい（詳細カードは一覧の下）
- 1280〜1439px は詳細カードを 400px に縮める（`minmax(0,1fr) 400px`）。一覧の列も詰める（「③ 一覧カード」の列を参照）
- 現行から**なくなるもの**：PageHeader の説明文（「領収書と並べて…↑↓キーで移動できます。」）、未精算カード（②のチップに集約）、一覧の上に差し込まれるまとめて操作バー（③の下部に重ねる）

### ① 見出し行（高さ 36px、`display:flex; align-items:center; gap:12px`）

- 左：タイトル「仕訳の確認・編集」18px / 700 / letter-spacing 0.04em
- その右：対象「峰島ゆうや・2026年」12px / muted（`${target.name}・${target.year}年`）
- 右端：既存のボタン2つ（高さ 32px のピル、12px / 700）
  - outline「領収書等番号を振る」
  - primary「＋ 手動で仕訳を作成」（`ph-plus`）
- PageHeader の英字ラベル「Journal entries」と説明文は出さない（PageHeader に `compact` のような変種を足すか、この画面だけ専用の見出しを置く）

### ② ツールバー行（`display:flex; align-items:center; gap:8px; flex-wrap:wrap`）

左から順に並べる。

1. **状態タブ**：既存 Tabs。各トリガーは高さ 28px・横 padding 14px・12px。選択中は白地＋teal 枠＋teal 文字・700。件数は Poppins
   - 「すべて 587」「下書き 49」「確認済 2」「公開中 536」（件数の数え方は現行どおり `filtered` から）
2. 区切り線（1px × 20px、`#ddd`、左右 margin 4px）
3. **月**：NativeSelect（高さ 32px のピル、12px）「すべての月」。ラベル「月」は表示しない（`aria-label="月"`）
4. **立替者**：NativeSelect「すべての立替者」。ラベル「立替者で絞り込み」は表示しない（`aria-label`）
5. `margin-left:auto` で右寄せし、見出し「要対応」11px / 700 / muted
6. **要対応チップ**（トグル。高さ 32px のピル、12px、横 padding 12px、gap 6px、件数は Poppins 700）
   - 「支払先 未設定 **579**」= 現行の `payeeUnsetOnly`。件数 > 0 のとき枠と数字を destructive（`#E63946`）
   - 「書類なし・徴難なし **0**」= 現行の `receiptMissingOnly`（書類が無く徴難も付いていない支出。#1778）。件数 0 のときは枠 `#ccc`・文字 `#939393`
   - 「未精算の立替 **1件 ¥4,490**」= 現行の `unsettledOnly`。帳簿全体の `summarizeUnsettledAdvances(entries)` の件数合計と金額合計を出す。mint 地（accent）＋teal 枠。未精算が無いときはチップごと出さない
   - ONのときは塗り（destructive チップは destructive 地＋白文字、未精算チップは primary 地＋白文字）にする
   - 立替者ごとの内訳（現行カードの「伊藤淳：¥4,490（1件）」）は、未精算チップの `title` かホバーのポップオーバーで出す。2名以上いても1チップのまま

### ③ 一覧カード

カード（`border:1px solid #000; radius 8px; overflow:hidden`）。`display:flex; flex-direction:column`。

**列**（ヘッダーと行で共通）：`grid-template-columns: 36px 52px 116px minmax(0,1fr) 170px 84px 64px; padding-right:12px`

1280〜1439px では `36px 52px 96px minmax(120px,1fr) 120px 84px 64px` にする（科目 96px・支払先 120px。科目ピル・支払先名は省略 `…` で収める）。この幅では項目列の補助チップは「分割」以外を省略し、`title` に回す。サイドバー展開時（236px）の 1280px で項目列はおよそ 128px 残る

| 列 | 中身 |
|---|---|
| 36px | Checkbox（14px、中央）。支給の行は空 |
| 52px | 日付 `MM.DD`（Poppins 12px）。帳簿は年度単位なので年は省く |
| 116px | 科目ピル（11px / 700、teal 文字・teal 枠・白地、padding 1px 8px）。支給は「支給」ピル（accent 地）。**要確認の科目**は destructive の枠・文字で「要確認」 |
| 1fr | 項目名（13px、1行で省略 `…`）＋右に補助チップ（10.5px、`#ccc` 枠、padding 0 6px）：「分割 n/m」「立替 伊藤淳」（teal 枠・teal 文字）、「同じ内容の書類あり」「書類なし・徴難なし」「徴難・事情未入力」（destructive）、「徴難」「書類なし」、「精算済 MM.DD」（accent 地） |
| 170px | 支払先名（12px、`#333`、省略 `…`）。未設定は destructive の「⚠ 未設定」（`ph-warning-circle`）。支給は空 |
| 84px | 金額（Poppins 12.5px、右揃え）。`isEmphasizedJournalAmount` のときは 700 |
| 64px | 状態ピル（10.5px、padding 0 7px、中央）。公開中・確認済＝accent 地＋teal 枠、下書き＝白地＋`#ccc` 枠＋muted 文字 |

- **ヘッダー行**：高さ 34px、下罫 `1px solid #000`、11.5px / 700。「日付・科目・項目・支払先・金額（右揃え）・状態（中央）」。先頭は全選択 Checkbox（現行の `allChecked`）
- **行**：高さ 38px 固定、下罫 `1px solid #EEEEEE`、白地
  - 選択中：accent 地（`#E2F6F3`）＋左 3px の teal 線（`box-shadow: inset 3px 0 0 #30BCA7`）
  - 要確認の科目（`isAccountUnconfirmed`）：左 3px の destructive 線（現行の `border-l-4 border-l-destructive` を 3px の inset に置き換え、行の高さを揃える）
  - ホバー：`#F8F8F8`
- **法律上の区分（LegalCategoryLabel）は一覧に出さない**。科目から決まり、詳細パネルに出る
- 現行の「支払先：〇〇」チップは支払先列に移したので出さない
- **フッター**：高さ 36px、上罫 `1px solid #000`、11.5px / muted。左「587件」（`visible.length`）、右「⌨ ↑↓ で移動」（`ph-keyboard`）
- 本文（行のリスト）だけを `overflow-y:auto` にする。587行は仮想化なしでよい
- 選択中の行が見えない位置に来たら、一覧の本文だけをスクロールさせて見える位置に戻す（`scrollIntoView` は使わず、本文コンテナの `scrollTop` を計算して変える）

#### まとめて操作バー（モック未掲載）

チェックが1件以上あるとき、一覧カードの**下部に重ねて**出す（一覧を下にずらさない）。

- `position:absolute; left:10px; right:10px; bottom:12px`（一覧カードを `position:relative` に）、白地、`border:1px solid #000`、ピル、`box-shadow:0 8px 24px rgba(0,0,0,0.12)`、padding `6px 6px 6px 16px`、gap 6px
- 左「3件選択」12px / 700（状態が混ざるときは「3件の仕訳を選択中」とし、補足「（状態が混ざっているため…）」は `title` に）
- 右に高さ 30px の小ピルボタンを、現行と同じ表示条件で並べる：「選択を解除」「支払先をまとめて設定」「立替者をまとめて設定」「まとめて未精算に戻す」「LLMで読み直す」「まとめて破棄」（destructive）「まとめて下書きに戻す」「まとめて精算」「まとめて確認済にする」（primary、右端）
- 幅が足りないときは、primary 以外を「…」（`ph-dots-three`、30px 丸）のメニューに入れる。一覧フッターはバーの下に隠れてよい

### ④ 詳細カード（幅 452px）

カード（`border:1px solid #000; radius 8px; overflow:hidden`）。`display:flex; flex-direction:column`。**ヘッダーとフッターを固定し、本文だけをスクロール**させる（現行のカード全体の `sticky` + `max-h` + `overflow-y-auto` は置き換える）。

#### ヘッダー（固定、padding 10px 14px、下罫 `#E5E5E5`）

- 左（`flex:1; min-width:0`）
  - 1段目：項目名 14.5px / 700（1行省略）＋状態ピル（一覧と同じ）
  - 2段目：位置「15 / 587」11px / muted（`index + 1` / `visible.length`）
- 右：32px の丸い outline ボタン2つ（`ph-caret-up` = 前へ、`ph-caret-down` = 次へ）。`aria-label` は「前へ」「次へ」。無効化の条件は現行どおり
- 二重スキャンの警告（`DuplicateDocumentWarning`）はヘッダー直下に、本文の先頭として1行のバナー（destructive 枠・12px）で出す

#### 本文（padding 12px 14px、縦 gap 12px、`overflow-y:auto`）

上から：

**a. 領収書プレビュー**（高さ 168px、`border:1px solid #ddd; radius 6px`、背景 `#3A3A3A`）

- iframe は高さ 168px（現行 `h-72` = 288px から縮小）
- 右下に重ねて小ピル2つ（高さ 26px、白地、`1px solid #000`、11px / 700、gap 6px）
  - 「⤢ 拡大」（`ph-arrows-out`）：Dialog で大きく表示（幅 `min(960px, 90vw)`・高さ 85vh の iframe）
  - 「↗ 原寸」（`ph-arrow-square-out`）：現行の「原寸で開く」と同じく新しいタブ
- 書類なし：現行の破線ボックス「領収書なし（手動作成）」を高さ 56px に縮める。支給も同様に「支給（金額・項目名は支給の月から決まるため変更できません）」

**b. 公開中の注意**（公開中のときだけ、1行）

- padding 7px 10px、radius 6px、背景 `#F2F2F2`、12px
- 「🔒 公開中のため、公開される内容は編集できません」（`ph-lock-simple`）＋右端にテキストリンク「確認済に戻す」（12px / 700 / teal、underline）。クリックで現行の `setUnpublishing(true)`（確認ダイアログは現行のまま）

**c. グループ「公開される内容」**

- 見出し：11px / 700 / teal（`#089781`）/ letter-spacing 0.06em、`ph-globe-simple` 13px
- 行は `grid-template-columns: 76px minmax(0,1fr); gap:10px`。ラベル 11.5px / muted

*閲覧時（公開中・または編集できない項目）*：読み取り表示。各行 padding 6px 0、下罫 `1px solid #F0F0F0`、値 13px

| ラベル | 値 |
|---|---|
| 日付 | `2026.08.21` |
| 金額 | `¥3,280` |
| 項目名 | `Adobe Premiereプラン利用料` |
| 科目 | `通信・IT利用料` ＋右に 11px / muted「法律上の区分 ④ 事務所費」 |
| 特記事項 | 本文。空なら「—」（`#939393`） |

*編集時（下書き・確認済）*：同じ並び・同じラベル幅のまま入力欄にする。入力欄は高さ 32px、`1px solid #000`、radius 6px、12.5px

- 1行目：`76px | 1fr | 36px | 120px` で「日付 [date] 金額 [number 右揃え]」を1行に
- 項目名：Input
- 科目：NativeSelect（全幅）。下に 11px / muted で「法律上の区分 ④ 事務所費」と「ⓘ 複式は自動」（`ph-info`。`title` に「借方 〇〇／貸方 普通預金 の複式仕訳を自動で作成」）。要確認の科目のときは、その下に destructive 12px / 700「要確認：科目を確定してください」
- 特記事項：Textarea 高さ 48px（2行）、`resize: vertical`
- **変更した欄**：枠を `1.5px solid #30BCA7` にし、枠の右上に重ねて「変更あり」（10px / 700 / teal、白地 padding 0 4px）
- 精算済のとき：金額を読み取り表示にし、右に `ph-lock-simple` と `title`「精算済の仕訳は金額を変更できません。先に未精算に戻してください」。現行の太字の注意文は出さない
- 支給のとき：日付だけを入力欄にし、他は読み取り表示。日付の下に 11px / muted「支給日はその月の中の日付だけを指定できます（当選月は当選日以降）」

**d. グループ「事務所内の管理」**

- 見出し：11px / 700 / `#333`、`ph-lock-key` 13px ＋ 補足ピル「公開されない・公開中も編集可」（10px、muted、`#ccc` 枠）
- 各行 `grid-template-columns: 76px minmax(0,1fr) auto; gap:10px; padding:7px 0`、下罫 `#F0F0F0`。右端の `auto` 列に操作を置く
- 現行の各欄の背景ボックス（`rounded-lg bg-background p-3`）と、常に出ている説明文はなくす

| 行 | 表示 | 操作 |
|---|---|---|
| **支払先**（支給以外） | 紐づけ済み：支払先名（12.5px / 700 / teal のリンク → 支払先詳細。遷移前に `allowLeave()`）＋ 11px `#939393` で紐づけ元（「手動で紐づけ」「ルール照合で紐づけ」「AIで紐づけ」）。住所・登録番号は `title` で | テキストボタン「変更」→ 現行の PayeeLinkDialog |
| | 未設定：destructive 700「⚠ 未設定」、その下に 11px / muted「書類の発行元：Adobe KK（T7010…）」（`entry.issuer` があるとき） | 発行元があるとき primary 小ピル「発行元で作成」（= `payeeFormInputFromIssuer` で作成して紐づけ）＋ outline 小ピル「選ぶ」（PayeeLinkDialog）。小ピルは高さ 28px・11.5px / 700 |
| | 同じ書類の仕訳が2件以上（`withSameDocumentEntries`）のとき、行の下に Checkbox「同じ書類の N 件にもまとめて紐づける」（11px、既定 ON） | |
| **立替者**（支給以外） | 閲覧時：名前、または `#666`「なし（調研費口座から支出）」 | 鉛筆アイコン（`ph-pencil-simple` 15px / teal）で編集モード：入力欄（高さ 30px・`#ccc` 枠・datalist は現行の `advancers`）＋「保存」「キャンセル」 |
| | 編集ビュー（下書き・確認済）：最初から入力欄（高さ 30px） | 立替者があり未精算なら右に「未精算」ピル（10.5px、`#ccc` 枠） |
| | 精算できない理由（`settlementRejection`）があるとき、行の下に 11px / muted「ⓘ 精算は確認済にしてからできます」などを1行で（左 padding 86px でラベル列を避ける） | 精算できるとき：右にテキストボタン「精算済にする」→ 精算日のポップオーバー（date Input、min = 仕訳の日付、max = 今日（JST）、「キャンセル」「精算する」） |
| | 精算済：「伊藤淳 ／ 精算済 2026.10.01」 | テキストボタン「未精算に戻す」 |
| **徴難**（`canMarkReceiptAbsent` のとき。書類の有無は問わない。#1778） | チェックボックス「領収書等を徴し難かった」 | チェックの操作だけで保存（`set-receipt-absent`）。外すとき事情が入力済みなら確認し、事情も消す |
| **書類の事情**（`canHaveReceiptAbsenceReason` = 徴難のときだけ） | 本文、または destructive 700「⚠ 未入力」 | 鉛筆で編集：Textarea（2行、placeholder「例: 自動券売機で購入したため」）＋「保存」「キャンセル」 |
| **備考**（支給以外） | 本文、または「—」（`#939393`） | 編集ビューでは高さ 30px の Input（placeholder「事務所内のメモ」）。閲覧時は「未決事項 1」を参照 |

現行の長い説明文（「立て替えた人を入力すると…」「議員課に提出する帳簿に記載します…」）は、グループ見出しの補足ピルに `title` で入れる。

**e. source 表示**（本文の最下部、`margin-top:auto`）

- 10.5px / `#939393`、`ph-info` 13px ＋「scan ／ claude-sonnet-5 ／ プロンプト版 2」（`source` / `model` / `promptVersion`）
- 閲覧時（公開中）はフッターの代わりにこの行を固定フッター（padding 8px 14px、上罫 `#E5E5E5`）として出す

#### フッター（編集ビューのときだけ固定、padding 10px 14px、上罫 `1px solid #000`、白地）

`display:flex; align-items:center; gap:8px`

- 左：テキストボタン「🗑 破棄」（12px / 700 / destructive、`ph-trash`）。現行と同じく `entry && !grant && !settled` のときだけ
- `margin-left:auto` で右へ：
  - 未保存の変更があるとき：「● 未保存の変更」（7px の teal ドット＋11px / 700 / teal）
  - outline「保存」（高さ 36px のピル、12.5px / 700）
  - 下書き：primary「確認済にする」（`isAccountUnconfirmed` のとき disabled ＋ `title`「科目を確定してください」）
  - 確認済：outline「下書きに戻す」（支給以外）

---

## Interactions & Behavior

- **行の選択・↑↓移動・未保存チェック（`allowLeave`）・`data-journal-dirty`・`beforeunload`** は現行のまま
- **保存の単位**：フッターの「保存」「確認済にする」は、現行どおり JournalEdit（日付・金額・項目名・科目・特記事項・備考）を `save` / `approve` で送る。編集ビューで立替者の入力欄を変えていた場合は、続けて `set-advanced-by` も送る（仕訳の保存が成功したあと。片方が失敗したら toast でどちらが失敗したかを出す）。立替者を変えて「確認済にする」を押したときも同じ順序
- **閲覧時の行ごとの編集**（立替者・書類の事情）は行ごとに保存し、現行と同じミューテーション（`set-advanced-by` / `set-receipt-absence-reason`）を使う。編集モードの行は1つだけ開く（別の行の鉛筆を押したら前の行を閉じる。未保存なら確認）
- **支払先**の操作は現行どおり即時に送る（`set-payee` / `create-payee-and-link`）
- **「変更あり」表示**：JournalEditor の `input` と `entry` を項目ごとに比べ、違う項目の入力欄に付ける。フッターの「未保存の変更」は現行の `dirty` と同じ
- **「確認済に戻す」**：現行の `unpublish` 確認ダイアログを開く
- **拡大**：Dialog で iframe を大きく表示。Esc で閉じる
- **要対応チップ**：押すと ON/OFF。現行のチェックボックスと同じく、切り替え時に `setSelectedId(null)`・`setChecked([])`（`allowLeave()` を通す）
- **ホバー・フォーカス**：ピルボタンは既存の Button の状態に従う。テキストボタン（確認済に戻す・変更・精算済にする・破棄）はホバーで underline。focus-visible は `2px solid #30BCA7`・offset 2px
- **トランジション**：色・背景のみ 150ms ease-out。パネルの開閉アニメーションは付けない

## State Management

JournalReview に追加する state：なし（要対応チップは既存の `payeeUnsetOnly` / `receiptMissingOnly` / `unsettledOnly` をそのまま使う）。

詳細パネルに追加する state：

- `previewOpen: boolean` — 拡大ダイアログ
- `editingRow: "advance" | "receiptAbsence" | null` — 閲覧時の行ごとの編集
- `settlingOpen: boolean` — 精算日のポップオーバー（現行 JournalAdvanceField の `settling` を移す）
- JournalEditor に `advancedBy` の入力値を持たせるか、JournalAdvanceField の値を親に持ち上げて、フッターの保存で一緒に送れるようにする

## Design Tokens（admin の既存トークンへの対応）

| 用途 | 値 | 既存トークンの目安 |
|---|---|---|
| primary | `#30BCA7` | `bg-primary` |
| primary 文字・見出し | `#089781` | `text-primary-hover` |
| リンク・強調文字 | `#0F8472` | `text-primary-active` |
| 選択行・未精算チップの地 | `#E2F6F3` | `bg-accent` |
| destructive | `#E63946` | `destructive` |
| 本文 | `#000` / 補助 `#333` | `foreground` |
| ラベル・補助文字 | `#666` | `text-muted-foreground` |
| 薄い補助文字 | `#939393` | `text-subtle-foreground` |
| カード枠・表ヘッダー下罫 | `1px solid #000` | `border` |
| 行の下罫 | `#EEEEEE` / `#F0F0F0` | `border-border-soft` |
| 区切り | `#E5E5E5` / `#ddd` / `#ccc` | — |
| 公開中の注意の地 | `#F2F2F2` | `bg-muted` |
| 領収書プレビューの地 | `#3A3A3A` | — |
| ページ地 | `#F8F8F8` | `bg-background` |

- 文字：和文 `'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif`、数字・日付・金額は `font-latin`（Poppins）
- 文字サイズ：18（タイトル）/ 14.5（詳細の項目名）/ 13（一覧・値）/ 12.5（入力欄）/ 12（ボタン・チップ）/ 11.5（ラベル・ヘッダー）/ 11（グループ見出し・補足）/ 10.5（ピル・source）
- 角丸：カード 8px、入力欄・プレビュー・注意 6px、ボタン・チップ・ピル 999px、Checkbox 3px
- 影：まとめて操作バーのみ `0 8px 24px rgba(0,0,0,0.12)`
- 高さ：見出し行 36、ツールバーの部品 32、表ヘッダー 34、行 38、一覧フッター 36、入力欄 32（事務所内の管理は 30）、詳細フッターのボタン 36、小ピル 28 / 26

## Assets

- アイコン：Phosphor（regular）。admin は `@phosphor-icons/react` を使っているので同名のアイコンを使う — `Plus` `CaretDown` `CaretUp` `WarningCircle` `Keyboard` `ArrowsOut` `ArrowSquareOut` `LockSimple` `LockKey` `GlobeSimple` `PencilSimple` `Info` `Trash` `CalendarBlank` `DotsThree`
- 領収書はモックでは HTML で描いた仮の画像。実装では既存の `/api/research-fund/documents/[id]` の iframe

## 未決事項

1. **公開中の備考の編集**：モックの閲覧時（公開中）では備考に鉛筆を出しているが、現行の備考（`memo`）は JournalEdit の一部で、公開中は編集できない。
   - A（変更なし）：公開中は備考を読み取り表示にし、鉛筆を出さない
   - B：備考だけを更新するミューテーション（例：`set-memo`）を追加し、公開中も編集できるようにする（備考は公開されないので、立替者と同じ扱いにそろう）
   - 決まるまでは A で実装する
2. ~~画面幅 1280〜1440px~~：「画面全体」と「③ 一覧カード」の列に、1280〜1439px の幅を決めたので解消

## Files

- `design/journal-review-1a.dc.html` — 最終案 1a のモック（公開中の閲覧／下書きの編集の2画面）
- `design/support.js` — モックの表示に必要なランタイム（実装には不要）
