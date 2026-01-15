import type { DonorType, PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface DonorSeedData {
	name: string;
	address: string;
	donorType: DonorType;
	occupation: string | null;
	tenantSlug: string;
}

const SAMPLE_PARTY = 'sample-party';
const E2E_TEST_ORG = 'e2e-test-org';

const data: DonorSeedData[] = [
	// 個人（individual）
	{
		name: '寄附　太郎',
		address: '東京都渋谷区神南一丁目1番1号',
		donorType: 'individual',
		occupation: '会社員',
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '寄附　花子',
		address: '東京都港区六本木三丁目2番1号',
		donorType: 'individual',
		occupation: '自営業',
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '寄附　次郎',
		address: '東京都新宿区西新宿二丁目8番1号',
		donorType: 'individual',
		occupation: '会社役員',
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '寄附　三郎',
		address: '東京都千代田区丸の内一丁目9番2号',
		donorType: 'individual',
		occupation: '弁護士',
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '寄附　四郎',
		address: '東京都品川区東品川二丁目2番20号',
		donorType: 'individual',
		occupation: '医師',
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: 'パーティー　一郎',
		address: '東京都文京区本郷三丁目1番1号',
		donorType: 'individual',
		occupation: '公務員',
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: 'パーティー　二郎',
		address: '東京都台東区浅草一丁目1番1号',
		donorType: 'individual',
		occupation: '教員',
		tenantSlug: SAMPLE_PARTY,
	},

	// 法人その他の団体（corporation）
	{
		name: '株式会社デジタル未来',
		address: '東京都港区芝浦一丁目2番3号',
		donorType: 'corporation',
		occupation: null,
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '一般社団法人政治改革推進会',
		address: '東京都中央区日本橋二丁目1番1号',
		donorType: 'corporation',
		occupation: null,
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: 'NPO法人民主主義研究所',
		address: '東京都世田谷区三軒茶屋一丁目1番1号',
		donorType: 'corporation',
		occupation: null,
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '株式会社イノベーション',
		address: '東京都港区六本木六丁目10番1号',
		donorType: 'corporation',
		occupation: null,
		tenantSlug: SAMPLE_PARTY,
	},

	// 政治団体（political_organization）
	{
		name: 'デジタル政策推進団体',
		address: '東京都千代田区永田町二丁目1番2号',
		donorType: 'political_organization',
		occupation: null,
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '若手政治家の会',
		address: '東京都港区赤坂一丁目11番28号',
		donorType: 'political_organization',
		occupation: null,
		tenantSlug: SAMPLE_PARTY,
	},
	{
		name: '地方創生研究会',
		address: '東京都新宿区四谷一丁目1番1号',
		donorType: 'political_organization',
		occupation: null,
		tenantSlug: SAMPLE_PARTY,
	},

	// E2Eテスト用
	{
		name: 'E2Eテスト寄附太郎',
		address: '東京都渋谷区テスト二丁目2番2号',
		donorType: 'individual',
		occupation: 'テスト職業',
		tenantSlug: E2E_TEST_ORG,
	},
];

export const donorsSeeder: Seeder = {
	name: 'Donors',
	async seed(prisma: PrismaClient) {
		for (const item of data) {
			const existing = await prisma.donor.findFirst({
				where: {
					name: item.name,
					address: item.address,
					donorType: item.donorType,
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

				await prisma.donor.create({
					data: {
						name: item.name,
						address: item.address,
						donorType: item.donorType,
						occupation: item.occupation,
						tenantId: tenant.id,
					},
				});
				console.log(`✅ Created: ${item.name} (${item.donorType})`);
			} else {
				console.log(`⏭️  Already exists: ${item.name}`);
			}
		}
	},
};
