// 分類の正本: docs/reference/design_handoff_choken/01_データモデル.md の21分類表。
export const RECEIPT_CATEGORIES = {
  "pc-electronics": {
    label: "PC・電子機器",
    definition: "PC・タブレット・周辺機器・プリンター消耗品（インク・トナー）・撮影機材",
  },
  "stationery-supplies": {
    label: "文房具・備品",
    definition: "文房具、事務用消耗品、日用什器・備品",
  },
  taxi: { label: "タクシー代", definition: "タクシー・ハイヤー・配車アプリ（GO等）" },
  airfare: { label: "航空券代", definition: "国内外出張の航空券・フライト代" },
  housing: { label: "住居費", definition: "議員宿舎の使用料（月々の固定費用）" },
  "public-transport": {
    label: "電車・バス代",
    definition: "公共交通機関・ガソリン代・モバイルWi-Fi等、タクシー以外の移動関連",
  },
  "telecom-it": { label: "通信・IT利用料", definition: "電話料金、ITツール・サブスクリプション" },
  lodging: { label: "宿泊費", definition: "出張・視察時の宿泊費" },
  "books-newspapers": { label: "新聞・書籍代", definition: "新聞・書籍・雑誌の購読・購入" },
  "printing-pr": { label: "印刷・広報費", definition: "チラシ・ポスター・名刺等印刷物" },
  "trip-arrangement": {
    label: "出張手配費",
    definition: "視察随行の通訳・現地滞在費・会場費・入場料・視察先での移動手配",
  },
  utilities: { label: "光熱水費", definition: "議員宿舎等の電気・ガス・水道" },
  hospitality: { label: "来客対応費", definition: "来客用のお茶・軽食・土産等" },
  "membership-fees": { label: "会費", definition: "議員連盟や団体への会費" },
  postage: { label: "郵送・信書費", definition: "切手・郵送料・電報等" },
  "tolls-parking": { label: "高速・駐車代", definition: "高速道路料金（ETC含む）・駐車場" },
  meetings: { label: "会議費", definition: "会議・打合せ・セミナー受講" },
  "bank-fees": { label: "手数料", definition: "銀行振込等の決済手数料" },
  misc: {
    label: "その他",
    definition: "上記いずれにも該当しない少数・一過性の支出（個別確認推奨）",
  },
  personnel: {
    label: "人件費",
    definition: "収支報告書の別区分で処理（該当支出なし・マスタには持つ）",
  },
  donation: {
    label: "寄附",
    definition: "収支報告書の別区分で処理（該当支出なし・マスタには持つ）",
  },
} as const;
