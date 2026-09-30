// 分類の正本: docs/reference/design_handoff_choken/01_データモデル.md の20分類表。
export const RECEIPT_CATEGORIES = {
  "pc-electronics": {
    label: "PC・電子機器",
    definition:
      "パソコン、タブレット、周辺機器、プリンター消耗品（インク・トナー）、カメラ等の撮影機材の購入・関連費用",
  },
  "stationery-supplies": {
    label: "文房具・備品",
    definition: "文房具、事務用消耗品、日用什器・備品等の購入費",
  },
  transportation: {
    label: "交通費",
    definition:
      "タクシー・ハイヤー、電車・バス等公共交通機関、高速道路料金・駐車場代など、航空機以外の移動に関する費用全般",
  },
  airfare: { label: "航空券代", definition: "国内外出張時の航空券・フライト代" },
  housing: { label: "宿舎費", definition: "議員宿舎の使用料（月々の固定費用）" },
  "telecom-it": {
    label: "通信・IT利用料",
    definition: "電話料金、各種ITツール・サブスクリプションの利用料",
  },
  lodging: {
    label: "宿泊費",
    definition: "出張・視察時の宿泊費（ホテル・宿泊施設の利用料）",
  },
  "books-newspapers": {
    label: "新聞・書籍代",
    definition: "新聞、書籍、雑誌等の購読・購入費用",
  },
  advertising: {
    label: "宣伝広報費",
    definition: "チラシ、ポスター、名刺、DM作成・発送、広報用写真等、広報活動に関する制作費用",
  },
  "trip-arrangement": {
    label: "出張手配費",
    definition: "視察随行の通訳費用、現地滞在費、会場費・入場料等、出張先での手配費用",
  },
  utilities: { label: "光熱水費", definition: "議員宿舎等にかかる電気・ガス・水道料金" },
  hospitality: {
    label: "来客対応費",
    definition: "来客対応用のお茶・軽食、お土産等の飲食関連費用",
  },
  "membership-fees": { label: "会費", definition: "各種議員連盟や団体への会費" },
  postage: { label: "郵送・信書費", definition: "切手、郵送料、電報等の信書関連費用" },
  meetings: { label: "会議費", definition: "会議、打合せ、セミナー受講に伴う費用" },
  "bank-fees": { label: "手数料", definition: "銀行振込等の決済手数料" },
  printing: { label: "印刷費", definition: "文書・資料等の印刷・コピーにかかる費用" },
  misc: {
    label: "その他",
    definition: "上記いずれにも該当しない少数・一過性の特殊な支出（個別確認推奨）",
  },
  personnel: {
    label: "人件費",
    definition: "政治資金収支報告書の別区分で処理されるため該当支出なし（マスタには持つ）",
  },
  donation: {
    label: "寄附",
    definition: "政治資金収支報告書の別区分で処理されるため該当支出なし（マスタには持つ）",
  },
} as const;
