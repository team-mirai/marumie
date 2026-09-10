import type { PrismaClient, ResearchFundAccountType } from '@prisma/client';
import type { Seeder } from './lib/types';

/**
 * 調研費の法定区分（報告書における支出項目）。
 *
 * 出典: 衆議院「調査研究広報滞在費の使途の報告及び公開並びに残額の返還に関する規程 概要」
 * 第一・2「報告書における支出項目」および参考「報告書への記載項目」
 * https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/housei/pdf/kihodogaiyou.pdf
 *
 * (1) 経常経費: ①人件費 ②光熱水費 ③備品・消耗品費 ④事務所費
 * (2) 議員活動費: ⑤交流費 ⑥広報紙誌の発行その他の事業費 ⑦調査研究費 ⑧寄附 ⑨滞在費 ⑩その他の経費
 */
const LEGAL_CATEGORIES = {
  personnel: '① 人件費',
  utilities: '② 光熱水費',
  'equipment-supplies': '③ 備品・消耗品費',
  office: '④ 事務所費',
  exchange: '⑤ 交流費',
  publicity: '⑥ 広報紙誌の発行その他の事業費',
  research: '⑦ 調査研究費',
  donation: '⑧ 寄附',
  stay: '⑨ 滞在費',
  'other-expenses': '⑩ その他の経費',
} as const;

type LegalCategoryKey = keyof typeof LEGAL_CATEGORIES;

interface ResearchFundAccountSeedData {
  key: string;
  label: string;
  type: ResearchFundAccountType;
  legalCategoryKey?: LegalCategoryKey;
}

/**
 * 科目マスタ。資産2＋収入1＋費用21分類。
 * 費用の定義・代表例は docs/reference/design_handoff_choken/01_データモデル.md の21分類表が正。
 *
 * 法定区分は上記規程の「報告書への記載項目」の例示に基づいて確定した:
 * - 旅費・交通費・宿泊費・議員宿舎の宿舎費は ⑨ 滞在費
 * - 電話使用料・切手購入費など事務所の維持に通常必要な経費は ④ 事務所費
 * - 議員連盟会費・研修会費・資料費・書籍購入費は ⑦ 調査研究費
 * - 大会費・行事費・渉外費・交際費は ⑤ 交流費
 */
const data: ResearchFundAccountSeedData[] = [
  // 資産・収入
  { key: 'bank', label: '普通預金', type: 'asset' },
  { key: 'cash', label: '現金', type: 'asset' },
  { key: 'grant-income', label: '調査研究費収入', type: 'income' },

  // 費用（調研費カテゴリ 21分類）
  { key: 'pc-electronics', label: 'PC・電子機器', type: 'expense', legalCategoryKey: 'equipment-supplies' },
  { key: 'stationery-supplies', label: '文房具・備品', type: 'expense', legalCategoryKey: 'equipment-supplies' },
  { key: 'taxi', label: 'タクシー代', type: 'expense', legalCategoryKey: 'stay' },
  { key: 'airfare', label: '航空券代', type: 'expense', legalCategoryKey: 'stay' },
  { key: 'housing', label: '住居費', type: 'expense', legalCategoryKey: 'stay' },
  { key: 'public-transport', label: '電車・バス代', type: 'expense', legalCategoryKey: 'stay' },
  { key: 'telecom-it', label: '通信・IT利用料', type: 'expense', legalCategoryKey: 'office' },
  { key: 'lodging', label: '宿泊費', type: 'expense', legalCategoryKey: 'stay' },
  { key: 'books-newspapers', label: '新聞・書籍代', type: 'expense', legalCategoryKey: 'research' },
  { key: 'printing-pr', label: '印刷・広報費', type: 'expense', legalCategoryKey: 'publicity' },
  { key: 'trip-arrangement', label: '出張手配費', type: 'expense', legalCategoryKey: 'stay' },
  { key: 'utilities', label: '光熱水費', type: 'expense', legalCategoryKey: 'utilities' },
  { key: 'hospitality', label: '来客対応費', type: 'expense', legalCategoryKey: 'exchange' },
  { key: 'membership-fees', label: '会費', type: 'expense', legalCategoryKey: 'research' },
  { key: 'postage', label: '郵送・信書費', type: 'expense', legalCategoryKey: 'office' },
  { key: 'tolls-parking', label: '高速・駐車代', type: 'expense', legalCategoryKey: 'stay' },
  { key: 'meetings', label: '会議費', type: 'expense', legalCategoryKey: 'research' },
  { key: 'bank-fees', label: '手数料', type: 'expense', legalCategoryKey: 'office' },
  { key: 'misc', label: 'その他', type: 'expense', legalCategoryKey: 'other-expenses' },
  { key: 'personnel', label: '人件費', type: 'expense', legalCategoryKey: 'personnel' },
  { key: 'donation', label: '寄附', type: 'expense', legalCategoryKey: 'donation' },
];

export const researchFundAccountsSeeder: Seeder = {
  name: 'Research Fund Accounts',
  async seed(prisma: PrismaClient) {
    // 固定マスタなので、ラベルや法定区分の変更を反映できるよう upsert する
    for (const [index, item] of data.entries()) {
      const legalLabel = item.legalCategoryKey ? LEGAL_CATEGORIES[item.legalCategoryKey] : null;
      const values = {
        label: item.label,
        type: item.type,
        legalCategoryKey: item.legalCategoryKey ?? null,
        legalLabel,
        displayOrder: index,
      };
      await prisma.researchFundAccount.upsert({
        where: { key: item.key },
        create: { key: item.key, ...values },
        update: values,
      });
      console.log(`✅ Upserted: ${item.key} (${item.label}${legalLabel ? ` → ${legalLabel}` : ''})`);
    }
  },
};
