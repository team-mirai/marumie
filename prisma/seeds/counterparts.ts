import type { PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface CounterpartSeedData {
  name: string;
  address: string;
  tenantSlug: string;
}

const SAMPLE_PARTY = 'sample-party';
const E2E_TEST_ORG = 'e2e-test-org';

const data: CounterpartSeedData[] = [
  // 寄附者（個人）
  { name: '寄附　太郎', address: '東京都渋谷区神南一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '寄附　花子', address: '東京都港区六本木三丁目2番1号', tenantSlug: SAMPLE_PARTY },
  { name: '寄附　次郎', address: '東京都新宿区西新宿二丁目8番1号', tenantSlug: SAMPLE_PARTY },
  { name: '寄附　三郎', address: '東京都千代田区丸の内一丁目9番2号', tenantSlug: SAMPLE_PARTY },
  { name: '寄附　四郎', address: '東京都品川区東品川二丁目2番20号', tenantSlug: SAMPLE_PARTY },

  // 寄附者（法人）
  { name: '株式会社デジタル未来', address: '東京都港区芝浦一丁目2番3号', tenantSlug: SAMPLE_PARTY },
  { name: '一般社団法人政治改革推進会', address: '東京都中央区日本橋二丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: 'NPO法人民主主義研究所', address: '東京都世田谷区三軒茶屋一丁目1番1号', tenantSlug: SAMPLE_PARTY },

  // 寄附者（政治団体）
  { name: 'デジタル政策推進団体', address: '東京都千代田区永田町二丁目1番2号', tenantSlug: SAMPLE_PARTY },
  { name: '若手政治家の会', address: '東京都港区赤坂一丁目11番28号', tenantSlug: SAMPLE_PARTY },

  // 借入先
  { name: '代表　太郎', address: '東京都千代田区永田町一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '政治資金銀行', address: '東京都中央区日本橋本町二丁目1番1号', tenantSlug: SAMPLE_PARTY },

  // 交付金支出先（本部・支部）
  { name: 'サンプル党本部', address: '東京都千代田区永田町一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: 'サンプル党東京都連', address: '東京都新宿区西新宿二丁目8番1号', tenantSlug: SAMPLE_PARTY },
  { name: 'サンプル党渋谷支部', address: '東京都渋谷区道玄坂一丁目2番3号', tenantSlug: SAMPLE_PARTY },
  { name: 'サンプル党世田谷支部', address: '東京都世田谷区三軒茶屋一丁目1番1号', tenantSlug: SAMPLE_PARTY },

  // 経常経費（光熱水費）
  { name: '東京電力株式会社', address: '東京都千代田区内幸町一丁目1番3号', tenantSlug: SAMPLE_PARTY },
  { name: '東京都水道局', address: '東京都新宿区西新宿二丁目8番1号', tenantSlug: SAMPLE_PARTY },
  { name: '東京ガス株式会社', address: '東京都港区海岸一丁目5番20号', tenantSlug: SAMPLE_PARTY },

  // 経常経費（備品・消耗品費）
  { name: '株式会社オフィスサプライ', address: '東京都中央区八重洲二丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社パソコンショップ', address: '東京都千代田区外神田一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社事務機器販売', address: '東京都品川区東品川二丁目2番20号', tenantSlug: SAMPLE_PARTY },

  // 経常経費（事務所費）
  { name: '不動産管理株式会社', address: '東京都渋谷区渋谷一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: 'NTT東日本', address: '東京都新宿区西新宿三丁目19番2号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社ネット通信', address: '東京都港区芝浦一丁目2番3号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（組織活動費）
  { name: '株式会社貸会議室', address: '東京都千代田区内幸町一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社会議施設', address: '東京都中央区日本橋二丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: 'JR東日本', address: '東京都渋谷区代々木二丁目2番2号', tenantSlug: SAMPLE_PARTY },
  { name: '事務　太郎', address: '東京都世田谷区三軒茶屋一丁目1番1号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（選挙関係費）
  { name: '株式会社印刷センター', address: '東京都台東区浅草一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社配布サービス', address: '東京都墨田区押上一丁目1番2号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（機関紙誌の発行事業費）
  { name: '株式会社政治印刷', address: '東京都文京区本郷三丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '日本郵便株式会社', address: '東京都千代田区霞が関一丁目3番2号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（宣伝事業費）
  { name: '株式会社デジタル広告', address: '東京都港区六本木六丁目10番1号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社小規模印刷', address: '東京都大田区蒲田五丁目1番1号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（その他の事業費）
  { name: '株式会社イベント会場', address: '東京都新宿区新宿三丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '講師　太郎', address: '東京都杉並区阿佐谷南一丁目1番1号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（調査研究費）
  { name: '株式会社政策研究所', address: '東京都千代田区永田町一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社政治書店', address: '東京都千代田区神田神保町一丁目1番1号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（寄附・交付金）
  { name: 'デジタル政策研究会', address: '東京都港区赤坂一丁目11番28号', tenantSlug: SAMPLE_PARTY },

  // 政治活動費（その他の経費）
  { name: '株式会社会計クラウド', address: '東京都渋谷区道玄坂一丁目2番3号', tenantSlug: SAMPLE_PARTY },
  { name: 'みずほ銀行', address: '東京都千代田区大手町一丁目5番5号', tenantSlug: SAMPLE_PARTY },
  { name: '株式会社法務コンサルティング', address: '東京都中央区銀座一丁目1番1号', tenantSlug: SAMPLE_PARTY },
  { name: '行政書士事務所山田', address: '東京都港区新橋二丁目2番2号', tenantSlug: SAMPLE_PARTY },
  { name: '税理士法人田中事務所', address: '東京都千代田区霞が関三丁目3番3号', tenantSlug: SAMPLE_PARTY },

  // E2Eテスト用
  { name: 'E2Eテスト取引先株式会社', address: '東京都渋谷区テスト一丁目1番1号', tenantSlug: E2E_TEST_ORG },
];

export const counterpartsSeeder: Seeder = {
  name: 'Counterparts',
  async seed(prisma: PrismaClient) {
    for (const item of data) {
      const existing = await prisma.counterpart.findFirst({
        where: {
          name: item.name,
          address: item.address,
        },
      });

      if (!existing) {
        const tenant = await prisma.tenant.findFirst({
          where: { slug: item.tenantSlug },
        });
        if (!tenant) {
          console.log(`⚠️  Tenant not found: ${item.tenantSlug}, skipping ${item.name}`);
          continue;
        }

        await prisma.counterpart.create({
          data: {
            name: item.name,
            address: item.address,
            tenantId: tenant.id,
          },
        });
        console.log(`✅ Created: ${item.name}`);
      } else {
        console.log(`⏭️  Already exists: ${item.name}`);
      }
    }
  },
};
