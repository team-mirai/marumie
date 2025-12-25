import type { Prisma, PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface ReportProfileSeedData {
  organizationSlug: string;
  financialYear: number;
  officialName: string;
  officialNameKana: string;
  officeAddress: string;
  officeAddressBuilding: string;
  details: Prisma.JsonValue;
}

const data: ReportProfileSeedData[] = [
  {
    organizationSlug: 'sample-party',
    financialYear: 2025,
    officialName: 'サンプル党',
    officialNameKana: 'サンプルトウ',
    officeAddress: '東京都千代田区永田町一丁目1番1号',
    officeAddressBuilding: 'テストビル4階',
    details: {
      representative: {
        lastName: '代表',
        firstName: '太郎',
      },
      accountant: {
        lastName: '会計',
        firstName: '太郎',
      },
      contactPersons: [
        {
          id: 'contact-1',
          lastName: '事務担当',
          firstName: '一郎',
          tel: '03-1234-5678',
        },
      ],
      organizationType: '01', // 政党の支部
      activityArea: '2', // 一つの都道府県
      fundManagement: {
        publicPositionName: '衆議院議員',
        publicPositionType: '1',
        applicant: {
          lastName: '届出',
          firstName: '太郎',
        },
        periods: [
          {
            id: 'period-1',
            from: 'r7/1/1',
            to: 'r7/12/31',
          },
        ],
      },
      dietMemberRelation: {
        type: '0', // 指定無し
      },
    },
  },
];

export const reportProfilesSeeder: Seeder = {
  name: 'Organization Report Profiles',
  async seed(prisma: PrismaClient) {
    for (const profile of data) {
      // 参照先の政治団体を取得
      const organization = await prisma.politicalOrganization.findFirst({
        where: { slug: profile.organizationSlug },
      });

      if (!organization) {
        console.log(`⚠️  Warning: Organization '${profile.organizationSlug}' not found - skipping`);
        continue;
      }

      // 既存チェック
      const existing = await prisma.organizationReportProfile.findFirst({
        where: {
          politicalOrganizationId: organization.id,
          financialYear: profile.financialYear,
        },
      });

      if (existing) {
        console.log(`⏭️  Already exists: ${profile.organizationSlug} (${profile.financialYear})`);
        continue;
      }

      // 作成
      await prisma.organizationReportProfile.create({
        data: {
          politicalOrganizationId: organization.id,
          financialYear: profile.financialYear,
          officialName: profile.officialName,
          officialNameKana: profile.officialNameKana,
          officeAddress: profile.officeAddress,
          officeAddressBuilding: profile.officeAddressBuilding,
          details: profile.details,
        },
      });

      console.log(`✅ Created: ${profile.organizationSlug} (${profile.financialYear})`);
    }
  },
};
