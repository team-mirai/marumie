import type { PrismaClient } from '@prisma/client';
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
  },
  {
    transactionNo: 'T2025-0034',
    transactionDate: '2025-01-31',
    transactionType: 'expense',
    debitAccount: '組織活動費',
    debitAmount: '250000',
    creditAccount: '普通預金',
    creditAmount: '250000',
    description: '事務職員給与',
    categoryKey: 'organizational-activities',
    counterpartName: '事務　太郎',
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
  },

  // SYUUSHI07_15: 政治活動費の支出（KUBUN9: その他の経費）
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
  },

  // SYUUSHI07_16: 本部または支部に対する交付金の支出
  {
    transactionNo: 'T2025-0048',
    transactionDate: '2025-04-30',
    transactionType: 'expense',
    debitAccount: '本部又は支部に対する交付金',
    debitAmount: '1000000',
    creditAccount: '普通預金',
    creditAmount: '1000000',
    description: '支部への活動費交付',
    categoryKey: 'branch-grants-expenses',
    counterpartName: 'サンプル党渋谷支部',
  },
  {
    transactionNo: 'T2025-0049',
    transactionDate: '2025-06-15',
    transactionType: 'expense',
    debitAccount: '本部又は支部に対する交付金',
    debitAmount: '500000',
    creditAccount: '普通預金',
    creditAmount: '500000',
    description: '支部への選挙応援金',
    categoryKey: 'branch-grants-expenses',
    counterpartName: 'サンプル党世田谷支部',
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

      console.log(`✅ Created: ${item.transactionNo} - ${item.description}`);
    }
  },
};
