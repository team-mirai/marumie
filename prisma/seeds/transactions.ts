import type { DonorType, PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface TransactionSeedData {
  transactionNo: string;
  transactionDate: string;
  transactionType: 'income' | 'expense';
  debitAccount: string;
  debitAmount: string;
  creditAccount: string;
  creditAmount: string;
  description: string;
  categoryKey: string;
  counterpartName?: string;
  donorName?: string;
  donorAddress?: string;
  donorType?: DonorType;
  friendlyCategory?: string;
  isGrantExpenditure?: boolean; // 交付金に係る支出フラグ（支出のみ）
}

const data: TransactionSeedData[] = [
  // SYUUSHI07_03: 事業による収入
  {
    transactionNo: 'T2025-0001',
    transactionDate: '2025-04-15',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '120000',
    creditAccount: '機関紙誌の発行その他の事業による収入',
    creditAmount: '120000',
    description: '機関紙発行収入',
    categoryKey: 'publication-income',
    friendlyCategory: '機関紙発行事業',
  },
  {
    transactionNo: 'T2025-0002',
    transactionDate: '2025-05-20',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '20000',
    creditAccount: 'その他の収入',
    creditAmount: '20000',
    description: '売店販売収入',
    categoryKey: 'other-income',
    friendlyCategory: '物品販売収入',
  },
  {
    transactionNo: 'T2025-0003',
    transactionDate: '2025-06-25',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '500000',
    creditAccount: 'その他の収入',
    creditAmount: '500000',
    description: 'セミナー開催収入',
    categoryKey: 'other-income',
    friendlyCategory: 'セミナー参加費',
  },

  // SYUUSHI07_04: 借入金
  {
    transactionNo: 'T2025-0004',
    transactionDate: '2025-02-10',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '1000000',
    creditAccount: '借入金',
    creditAmount: '1000000',
    description: '代表者からの借入',
    categoryKey: 'loans',
    counterpartName: '代表　太郎',
  },
  {
    transactionNo: 'T2025-0005',
    transactionDate: '2025-03-15',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '3000000',
    creditAccount: '借入金',
    creditAmount: '3000000',
    description: '金融機関からの借入',
    categoryKey: 'loans',
    counterpartName: '政治資金銀行',
  },

  // SYUUSHI07_05: 本部または支部から供与された交付金
  {
    transactionNo: 'T2025-0006',
    transactionDate: '2025-04-01',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '5000000',
    creditAccount: '本部又は支部から供与された交付金に係る収入',
    creditAmount: '5000000',
    description: '本部からの交付金',
    categoryKey: 'grants',
    counterpartName: 'サンプル党本部',
  },
  {
    transactionNo: 'T2025-0007',
    transactionDate: '2025-07-15',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '1500000',
    creditAccount: '本部又は支部から供与された交付金に係る収入',
    creditAmount: '1500000',
    description: '支部からの交付金',
    categoryKey: 'grants',
    counterpartName: 'サンプル党東京都連',
  },

  // SYUUSHI07_06: その他の収入（境界値テスト: 10万円）
  {
    transactionNo: 'T2025-0008',
    transactionDate: '2025-03-31',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '80000',
    creditAccount: 'その他の収入',
    creditAmount: '80000',
    description: '預金利息',
    categoryKey: 'other-income',
    friendlyCategory: '受取利息',
  },
  {
    transactionNo: 'T2025-0009',
    transactionDate: '2025-06-30',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '30000',
    creditAccount: 'その他の収入',
    creditAmount: '30000',
    description: '雑収入',
    categoryKey: 'other-income',
    friendlyCategory: '雑収入',
  },
  {
    transactionNo: 'T2025-0010',
    transactionDate: '2025-09-30',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '150000',
    creditAccount: 'その他の収入',
    creditAmount: '150000',
    description: '助成金収入',
    categoryKey: 'other-income',
    friendlyCategory: '助成金',
  },
  {
    transactionNo: 'T2025-0011',
    transactionDate: '2025-01-01',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '200000',
    creditAccount: 'その他の収入',
    creditAmount: '200000',
    description: '前期繰越金の調整',
    categoryKey: 'other-income',
    friendlyCategory: '繰越金調整',
  },

  // SYUUSHI07_07: 寄附の明細（KUBUN1: 個人、境界値テスト: 5万円）
  // 注: 寄附はcounterpart必須ではないため、counterpartNameは削除
  {
    transactionNo: 'T2025-0012',
    transactionDate: '2025-03-15',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '40000',
    creditAccount: '個人からの寄附',
    creditAmount: '40000',
    description: '個人寄附（寄附　太郎）',
    categoryKey: 'individual-donations',
    donorName: '寄附　太郎',
    donorAddress: '東京都渋谷区神南一丁目1番1号',
    donorType: 'individual',
  },
  {
    transactionNo: 'T2025-0013',
    transactionDate: '2025-06-20',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '30000',
    creditAccount: '個人からの寄附',
    creditAmount: '30000',
    description: '個人寄附（寄附　花子）',
    categoryKey: 'individual-donations',
    donorName: '寄附　花子',
    donorAddress: '東京都港区六本木三丁目2番1号',
    donorType: 'individual',
  },
  {
    transactionNo: 'T2025-0014',
    transactionDate: '2025-05-10',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '60000',
    creditAccount: '個人からの寄附',
    creditAmount: '60000',
    description: '個人寄附（寄附　次郎）',
    categoryKey: 'individual-donations',
    donorName: '寄附　次郎',
    donorAddress: '東京都新宿区西新宿二丁目8番1号',
    donorType: 'individual',
  },
  {
    transactionNo: 'T2025-0015',
    transactionDate: '2025-09-30',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '100000',
    creditAccount: '個人からの寄附',
    creditAmount: '100000',
    description: '個人寄附（寄附　三郎）',
    categoryKey: 'individual-donations',
    donorName: '寄附　三郎',
    donorAddress: '東京都千代田区丸の内一丁目9番2号',
    donorType: 'individual',
  },
  {
    transactionNo: 'T2025-0016',
    transactionDate: '2025-11-05',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '50000',
    creditAccount: '個人からの寄附',
    creditAmount: '50000',
    description: '個人寄附（寄附　四郎、境界値: ちょうど5万円）',
    categoryKey: 'individual-donations',
    donorName: '寄附　四郎',
    donorAddress: '東京都品川区東品川二丁目2番20号',
    donorType: 'individual',
  },

  // SYUUSHI07_07: 寄附の明細（KUBUN2: 法人）
  {
    transactionNo: 'T2025-0017',
    transactionDate: '2025-04-25',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '45000',
    creditAccount: '法人その他の団体からの寄附',
    creditAmount: '45000',
    description: '法人寄附（株式会社デジタル未来）',
    categoryKey: 'corporate-donations',
    donorName: '株式会社デジタル未来',
    donorAddress: '東京都港区芝浦一丁目2番3号',
    donorType: 'corporation',
  },
  {
    transactionNo: 'T2025-0018',
    transactionDate: '2025-07-08',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '80000',
    creditAccount: '法人その他の団体からの寄附',
    creditAmount: '80000',
    description: '法人寄附（一般社団法人政治改革推進会）',
    categoryKey: 'corporate-donations',
    donorName: '一般社団法人政治改革推進会',
    donorAddress: '東京都中央区日本橋二丁目1番1号',
    donorType: 'corporation',
  },
  {
    transactionNo: 'T2025-0019',
    transactionDate: '2025-10-15',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '150000',
    creditAccount: '法人その他の団体からの寄附',
    creditAmount: '150000',
    description: '法人寄附（NPO法人民主主義研究所）',
    categoryKey: 'corporate-donations',
    donorName: 'NPO法人民主主義研究所',
    donorAddress: '東京都世田谷区三軒茶屋一丁目1番1号',
    donorType: 'corporation',
  },

  // SYUUSHI07_07: 寄附の明細（KUBUN3: 政治団体）
  {
    transactionNo: 'T2025-0020',
    transactionDate: '2025-06-01',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '200000',
    creditAccount: '政治団体からの寄附',
    creditAmount: '200000',
    description: '政治団体からの寄附（デジタル政策推進団体）',
    categoryKey: 'political-donations',
    donorName: 'デジタル政策推進団体',
    donorAddress: '東京都千代田区永田町二丁目1番2号',
    donorType: 'political_organization',
  },
  {
    transactionNo: 'T2025-0021',
    transactionDate: '2025-08-20',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '300000',
    creditAccount: '政治団体からの寄附',
    creditAmount: '300000',
    description: '政治団体からの寄附（若手政治家の会）',
    categoryKey: 'political-donations',
    donorName: '若手政治家の会',
    donorAddress: '東京都港区赤坂一丁目11番28号',
    donorType: 'political_organization',
  },

  // SYUUSHI07_14: 経常経費の支出（KUBUN1: 光熱水費、境界値テスト: 5万円）
  {
    transactionNo: 'T2025-0022',
    transactionDate: '2025-02-28',
    transactionType: 'expense',
    debitAccount: '光熱水費',
    debitAmount: '45000',
    creditAccount: '普通預金',
    creditAmount: '45000',
    description: '事務所電気代',
    categoryKey: 'utilities',
    counterpartName: '東京電力株式会社',
    friendlyCategory: '電気料金',
  },
  {
    transactionNo: 'T2025-0023',
    transactionDate: '2025-02-28',
    transactionType: 'expense',
    debitAccount: '光熱水費',
    debitAmount: '30000',
    creditAccount: '普通預金',
    creditAmount: '30000',
    description: '事務所水道代',
    categoryKey: 'utilities',
    counterpartName: '東京都水道局',
    friendlyCategory: '水道料金',
  },
  {
    transactionNo: 'T2025-0024',
    transactionDate: '2025-01-31',
    transactionType: 'expense',
    debitAccount: '光熱水費',
    debitAmount: '60000',
    creditAccount: '普通預金',
    creditAmount: '60000',
    description: '事務所ガス代',
    categoryKey: 'utilities',
    counterpartName: '東京ガス株式会社',
    friendlyCategory: 'ガス料金',
  },

  // SYUUSHI07_14: 経常経費の支出（KUBUN2: 備品・消耗品費）
  {
    transactionNo: 'T2025-0025',
    transactionDate: '2025-03-10',
    transactionType: 'expense',
    debitAccount: '備品・消耗品費',
    debitAmount: '40000',
    creditAccount: '普通預金',
    creditAmount: '40000',
    description: '文房具購入',
    categoryKey: 'equipment-supplies',
    counterpartName: '株式会社オフィスサプライ',
    friendlyCategory: '事務用品費',
  },
  {
    transactionNo: 'T2025-0026',
    transactionDate: '2025-04-05',
    transactionType: 'expense',
    debitAccount: '備品・消耗品費',
    debitAmount: '150000',
    creditAccount: '普通預金',
    creditAmount: '150000',
    description: 'PC購入',
    categoryKey: 'equipment-supplies',
    counterpartName: '株式会社パソコンショップ',
    friendlyCategory: 'パソコン購入',
  },
  {
    transactionNo: 'T2025-0027',
    transactionDate: '2025-05-20',
    transactionType: 'expense',
    debitAccount: '備品・消耗品費',
    debitAmount: '80000',
    creditAccount: '普通預金',
    creditAmount: '80000',
    description: 'プリンター購入',
    categoryKey: 'equipment-supplies',
    counterpartName: '株式会社事務機器販売',
    friendlyCategory: '事務機器購入',
  },

  // SYUUSHI07_14: 経常経費の支出（KUBUN3: 事務所費）
  {
    transactionNo: 'T2025-0028',
    transactionDate: '2025-01-31',
    transactionType: 'expense',
    debitAccount: '事務所費',
    debitAmount: '200000',
    creditAccount: '普通預金',
    creditAmount: '200000',
    description: '事務所家賃',
    categoryKey: 'office-expenses',
    counterpartName: '不動産管理株式会社',
    friendlyCategory: '事務所賃借料',
  },
  // 【交付金フラグ】支部への事務所費補助（シート14+シート16に出力）
  {
    transactionNo: 'T2025-0057',
    transactionDate: '2025-03-15',
    transactionType: 'expense',
    debitAccount: '事務所費',
    debitAmount: '100000',
    creditAccount: '普通預金',
    creditAmount: '100000',
    description: '東京支部事務所費補助',
    categoryKey: 'office-expenses',
    counterpartName: 'サンプル党東京都連',
    friendlyCategory: '支部事務所費補助',
    isGrantExpenditure: true,
  },
  {
    transactionNo: 'T2025-0029',
    transactionDate: '2025-02-28',
    transactionType: 'expense',
    debitAccount: '事務所費',
    debitAmount: '35000',
    creditAccount: '普通預金',
    creditAmount: '35000',
    description: '電話代',
    categoryKey: 'office-expenses',
    counterpartName: 'NTT東日本',
    friendlyCategory: '通信費',
  },
  {
    transactionNo: 'T2025-0030',
    transactionDate: '2025-02-28',
    transactionType: 'expense',
    debitAccount: '事務所費',
    debitAmount: '48000',
    creditAccount: '普通預金',
    creditAmount: '48000',
    description: 'インターネット回線費',
    categoryKey: 'office-expenses',
    counterpartName: '株式会社ネット通信',
    friendlyCategory: 'インターネット接続料',
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN1: 組織活動費）
  {
    transactionNo: 'T2025-0031',
    transactionDate: '2025-03-15',
    transactionType: 'expense',
    debitAccount: '組織活動費',
    debitAmount: '40000',
    creditAccount: '普通預金',
    creditAmount: '40000',
    description: '会議室利用料',
    categoryKey: 'organizational-activities',
    counterpartName: '株式会社貸会議室',
    friendlyCategory: '会議費',
  },
  // 【交付金フラグ】支部への組織活動費補助（シート15+シート16に出力）
  {
    transactionNo: 'T2025-0058',
    transactionDate: '2025-04-01',
    transactionType: 'expense',
    debitAccount: '組織活動費',
    debitAmount: '150000',
    creditAccount: '普通預金',
    creditAmount: '150000',
    description: '大阪支部活動支援金',
    categoryKey: 'organizational-activities',
    counterpartName: 'サンプル党本部',
    friendlyCategory: '支部活動支援',
    isGrantExpenditure: true,
  },
  {
    transactionNo: 'T2025-0032',
    transactionDate: '2025-04-20',
    transactionType: 'expense',
    debitAccount: '組織活動費',
    debitAmount: '45000',
    creditAccount: '普通預金',
    creditAmount: '45000',
    description: '月例会議費用',
    categoryKey: 'organizational-activities',
    counterpartName: '株式会社会議施設',
    friendlyCategory: '会議費',
  },
  {
    transactionNo: 'T2025-0033',
    transactionDate: '2025-06-10',
    transactionType: 'expense',
    debitAccount: '組織活動費',
    debitAmount: '80000',
    creditAccount: '普通預金',
    creditAmount: '80000',
    description: '地方視察交通費',
    categoryKey: 'organizational-activities',
    counterpartName: 'JR東日本',
    friendlyCategory: '旅費交通費',
  },
  {
    transactionNo: 'T2025-0034',
    transactionDate: '2025-01-31',
    transactionType: 'expense',
    debitAccount: '人件費',
    debitAmount: '250000',
    creditAccount: '普通預金',
    creditAmount: '250000',
    description: '事務職員給与',
    categoryKey: 'personnel-costs',
    friendlyCategory: '人件費',
  },
  // SYUUSHI07_15: 政治活動費の支出（KUBUN1: 組織活動費）
  {
    transactionNo: 'T2025-0061',
    transactionDate: '2025-03-15',
    transactionType: 'expense',
    debitAccount: '組織活動費',
    debitAmount: '85000',
    creditAccount: '普通預金',
    creditAmount: '85000',
    description: '支部総会開催費用',
    categoryKey: 'organizational-activities',
    counterpartName: '株式会社会議室サービス',
    friendlyCategory: '会議費',
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN2: 選挙関係費）
  {
    transactionNo: 'T2025-0035',
    transactionDate: '2025-05-20',
    transactionType: 'expense',
    debitAccount: '選挙関係費',
    debitAmount: '120000',
    creditAccount: '普通預金',
    creditAmount: '120000',
    description: 'ポスター印刷',
    categoryKey: 'election-expenses',
    counterpartName: '株式会社印刷センター',
    friendlyCategory: '選挙ポスター印刷',
  },
  {
    transactionNo: 'T2025-0036',
    transactionDate: '2025-06-05',
    transactionType: 'expense',
    debitAccount: '選挙関係費',
    debitAmount: '48000',
    creditAccount: '普通預金',
    creditAmount: '48000',
    description: 'ビラ配布費用',
    categoryKey: 'election-expenses',
    counterpartName: '株式会社配布サービス',
    friendlyCategory: 'ビラ配布',
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN3: 機関紙誌の発行事業費）
  {
    transactionNo: 'T2025-0037',
    transactionDate: '2025-04-30',
    transactionType: 'expense',
    debitAccount: '機関紙誌の発行事業費',
    debitAmount: '100000',
    creditAccount: '普通預金',
    creditAmount: '100000',
    description: '機関紙印刷',
    categoryKey: 'publication-expenses',
    counterpartName: '株式会社政治印刷',
    friendlyCategory: '印刷費',
  },
  {
    transactionNo: 'T2025-0038',
    transactionDate: '2025-05-10',
    transactionType: 'expense',
    debitAccount: '機関紙誌の発行事業費',
    debitAmount: '35000',
    creditAccount: '普通預金',
    creditAmount: '35000',
    description: '機関紙郵送費',
    categoryKey: 'publication-expenses',
    counterpartName: '日本郵便株式会社',
    friendlyCategory: '発送費',
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN4: 宣伝事業費）
  {
    transactionNo: 'T2025-0039',
    transactionDate: '2025-07-15',
    transactionType: 'expense',
    debitAccount: '宣伝事業費',
    debitAmount: '180000',
    creditAccount: '普通預金',
    creditAmount: '180000',
    description: 'Web広告費用',
    categoryKey: 'advertising-expenses',
    counterpartName: '株式会社デジタル広告',
    friendlyCategory: 'インターネット広告',
  },
  {
    transactionNo: 'T2025-0040',
    transactionDate: '2025-08-20',
    transactionType: 'expense',
    debitAccount: '宣伝事業費',
    debitAmount: '45000',
    creditAccount: '普通預金',
    creditAmount: '45000',
    description: 'チラシ印刷',
    categoryKey: 'advertising-expenses',
    counterpartName: '株式会社小規模印刷',
    friendlyCategory: 'チラシ印刷',
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN6: その他の事業費）
  {
    transactionNo: 'T2025-0041',
    transactionDate: '2025-09-10',
    transactionType: 'expense',
    debitAccount: 'その他の事業費',
    debitAmount: '70000',
    creditAccount: '普通預金',
    creditAmount: '70000',
    description: 'セミナー会場費',
    categoryKey: 'other-business-expenses',
    counterpartName: '株式会社イベント会場',
    friendlyCategory: '会場費',
  },
  {
    transactionNo: 'T2025-0042',
    transactionDate: '2025-09-10',
    transactionType: 'expense',
    debitAccount: 'その他の事業費',
    debitAmount: '50000',
    creditAccount: '普通預金',
    creditAmount: '50000',
    description: '講師謝礼（境界値: ちょうど5万円）',
    categoryKey: 'other-business-expenses',
    counterpartName: '講師　太郎',
    friendlyCategory: '講師謝礼',
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN7: 調査研究費）
  {
    transactionNo: 'T2025-0043',
    transactionDate: '2025-10-15',
    transactionType: 'expense',
    debitAccount: '調査研究費',
    debitAmount: '300000',
    creditAccount: '普通預金',
    creditAmount: '300000',
    description: '政策調査委託',
    categoryKey: 'research-expenses',
    counterpartName: '株式会社政策研究所',
    friendlyCategory: '調査委託費',
  },
  {
    transactionNo: 'T2025-0044',
    transactionDate: '2025-11-05',
    transactionType: 'expense',
    debitAccount: '調査研究費',
    debitAmount: '30000',
    creditAccount: '普通預金',
    creditAmount: '30000',
    description: '書籍購入',
    categoryKey: 'research-expenses',
    counterpartName: '株式会社政治書店',
    friendlyCategory: '書籍購入費',
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN8: 寄附・交付金）
  {
    transactionNo: 'T2025-0045',
    transactionDate: '2025-12-10',
    transactionType: 'expense',
    debitAccount: '寄附・交付金',
    debitAmount: '500000',
    creditAccount: '普通預金',
    creditAmount: '500000',
    description: '政治団体への寄附',
    categoryKey: 'donations-grants-expenses',
    counterpartName: 'デジタル政策研究会',
    friendlyCategory: '政治団体寄附',
  },
  // 【交付金フラグ】支部への交付金（シート15+シート16に出力）
  {
    transactionNo: 'T2025-0059',
    transactionDate: '2025-06-20',
    transactionType: 'expense',
    debitAccount: '寄附・交付金',
    debitAmount: '300000',
    creditAccount: '普通預金',
    creditAmount: '300000',
    description: '東京支部への交付金',
    categoryKey: 'donations-grants-expenses',
    counterpartName: 'サンプル党東京都連',
    friendlyCategory: '支部交付金',
    isGrantExpenditure: true,
  },
  // 【交付金フラグ】本部への交付金（シート15+シート16に出力）
  {
    transactionNo: 'T2025-0060',
    transactionDate: '2025-09-15',
    transactionType: 'expense',
    debitAccount: '寄附・交付金',
    debitAmount: '200000',
    creditAccount: '普通預金',
    creditAmount: '200000',
    description: '本部への上納金',
    categoryKey: 'donations-grants-expenses',
    counterpartName: 'サンプル党本部',
    friendlyCategory: '本部上納金',
    isGrantExpenditure: true,
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN9: その他の経費、境界値テスト: 5万円）
  {
    transactionNo: 'T2025-0046',
    transactionDate: '2025-12-31',
    transactionType: 'expense',
    debitAccount: 'その他の経費',
    debitAmount: '40000',
    creditAccount: '普通預金',
    creditAmount: '40000',
    description: '会計ソフト利用料',
    categoryKey: 'other-expenses',
    counterpartName: '株式会社会計クラウド',
    friendlyCategory: 'ソフトウェア利用料',
  },
  {
    transactionNo: 'T2025-0047',
    transactionDate: '2025-12-31',
    transactionType: 'expense',
    debitAccount: 'その他の経費',
    debitAmount: '5000',
    creditAccount: '普通預金',
    creditAmount: '5000',
    description: '銀行手数料',
    categoryKey: 'other-expenses',
    counterpartName: 'みずほ銀行',
    friendlyCategory: '振込手数料',
  },
  {
    transactionNo: 'T2025-0050',
    transactionDate: '2025-10-20',
    transactionType: 'expense',
    debitAccount: 'その他の経費',
    debitAmount: '80000',
    creditAccount: '普通預金',
    creditAmount: '80000',
    description: '法務相談費用',
    categoryKey: 'other-expenses',
    counterpartName: '株式会社法務コンサルティング',
    friendlyCategory: '法務相談料',
  },
  {
    transactionNo: 'T2025-0051',
    transactionDate: '2025-11-15',
    transactionType: 'expense',
    debitAccount: 'その他の経費',
    debitAmount: '50000',
    creditAccount: '普通預金',
    creditAmount: '50000',
    description: '届出書類作成代行（境界値: ちょうど5万円）',
    categoryKey: 'other-expenses',
    counterpartName: '行政書士事務所山田',
    friendlyCategory: '行政書士報酬',
  },
  {
    transactionNo: 'T2025-0052',
    transactionDate: '2025-12-10',
    transactionType: 'expense',
    debitAccount: 'その他の経費',
    debitAmount: '150000',
    creditAccount: '普通預金',
    creditAmount: '150000',
    description: '税務顧問料',
    categoryKey: 'other-expenses',
    counterpartName: '税理士法人田中事務所',
    friendlyCategory: '税理士報酬',
  },

  // パーティー対価収入（政治資金パーティー）
  {
    transactionNo: 'T2025-0053',
    transactionDate: '2025-07-20',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '200000',
    creditAccount: '政治資金パーティーの対価に係る収入',
    creditAmount: '200000',
    description: 'パーティー対価収入（個人）',
    categoryKey: 'party-income',
    donorName: 'パーティー　一郎',
    donorAddress: '東京都文京区本郷三丁目1番1号',
    donorType: 'individual',
    friendlyCategory: 'パーティー対価（個人）',
  },
  {
    transactionNo: 'T2025-0054',
    transactionDate: '2025-07-20',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '150000',
    creditAccount: '政治資金パーティーの対価に係る収入',
    creditAmount: '150000',
    description: 'パーティー対価収入（個人）',
    categoryKey: 'party-income',
    donorName: 'パーティー　二郎',
    donorAddress: '東京都台東区浅草一丁目1番1号',
    donorType: 'individual',
    friendlyCategory: 'パーティー対価（個人）',
  },
  {
    transactionNo: 'T2025-0055',
    transactionDate: '2025-07-20',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '500000',
    creditAccount: '政治資金パーティーの対価に係る収入',
    creditAmount: '500000',
    description: 'パーティー対価収入（法人）',
    categoryKey: 'party-income',
    donorName: '株式会社イノベーション',
    donorAddress: '東京都港区六本木六丁目10番1号',
    donorType: 'corporation',
    friendlyCategory: 'パーティー対価（法人）',
  },
  {
    transactionNo: 'T2025-0056',
    transactionDate: '2025-07-20',
    transactionType: 'income',
    debitAccount: '普通預金',
    debitAmount: '300000',
    creditAccount: '政治資金パーティーの対価に係る収入',
    creditAmount: '300000',
    description: 'パーティー対価収入（政治団体）',
    categoryKey: 'party-income',
    donorName: '地方創生研究会',
    donorAddress: '東京都新宿区四谷一丁目1番1号',
    donorType: 'political_organization',
    friendlyCategory: 'パーティー対価（政治団体）',
  },
];

export const transactionsSeeder: Seeder = {
  name: 'Transactions',
  async seed(prisma: PrismaClient) {
    // サンプル党の取得
    const organization = await prisma.politicalOrganization.findFirst({
      where: { slug: 'sample-party' },
    });

    if (!organization) {
      console.log('⚠️  Warning: Organization "sample-party" not found - skipping');
      return;
    }

    for (const item of data) {
      // 既存チェック
      const existing = await prisma.transaction.findFirst({
        where: {
          politicalOrganizationId: organization.id,
          transactionNo: item.transactionNo,
        },
      });

      if (existing) {
        console.log(`⏭️  Already exists: ${item.transactionNo}`);
        continue;
      }

      // Counterpartの取得（存在する場合）
      let counterpartId: bigint | undefined;
      if (item.counterpartName) {
        const counterpart = await prisma.counterpart.findFirst({
          where: { name: item.counterpartName },
        });
        if (counterpart) {
          counterpartId = counterpart.id;
        } else {
          console.log(`⚠️  Warning: Counterpart "${item.counterpartName}" not found`);
        }
      }

      // Donorの取得（存在する場合）
      // name, address, donorTypeの3要素で検索
      let donorId: bigint | undefined;
      if (item.donorName && item.donorAddress && item.donorType) {
        const donor = await prisma.donor.findFirst({
          where: {
            name: item.donorName,
            address: item.donorAddress,
            donorType: item.donorType,
          },
        });
        if (donor) {
          donorId = donor.id;
        } else {
          console.log(
            `⚠️  Warning: Donor "${item.donorName}" (${item.donorAddress}, ${item.donorType}) not found`,
          );
        }
      }

      // Transactionの作成
      const transaction = await prisma.transaction.create({
        data: {
          politicalOrganizationId: organization.id,
          transactionNo: item.transactionNo,
          transactionDate: new Date(item.transactionDate),
          financialYear: 2025,
          transactionType: item.transactionType,
          debitAccount: item.debitAccount,
          debitAmount: item.debitAmount,
          creditAccount: item.creditAccount,
          creditAmount: item.creditAmount,
          description: item.description,
          categoryKey: item.categoryKey,
          friendlyCategory: item.friendlyCategory,
          isGrantExpenditure: item.isGrantExpenditure ?? false,
        },
      });

      // TransactionCounterpartの作成（counterpartIdが存在する場合）
      if (counterpartId) {
        await prisma.transactionCounterpart.create({
          data: {
            transactionId: transaction.id,
            counterpartId: counterpartId,
          },
        });
      }

      // TransactionDonorの作成（donorIdが存在する場合）
      if (donorId) {
        await prisma.transactionDonor.create({
          data: {
            transactionId: transaction.id,
            donorId: donorId,
          },
        });
      }

      console.log(`✅ Created: ${item.transactionNo} - ${item.description}`);
    }
  },
};
