import type { DonorType, PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface DonorSeedData {
	name: string;
	address: string;
	donorType: DonorType;
	occupation: string | null;
}

const data: DonorSeedData[] = [
	// 個人（individual）
	{
		name: '寄附　太郎',
		address: '東京都渋谷区神南一丁目1番1号',
		donorType: 'individual',
		occupation: '会社員',
	},
	{
		name: '寄附　花子',
		address: '東京都港区六本木三丁目2番1号',
		donorType: 'individual',
		occupation: '自営業',
	},
	{
		name: '寄附　次郎',
		address: '東京都新宿区西新宿二丁目8番1号',
		donorType: 'individual',
		occupation: '会社役員',
	},
	{
		name: '寄附　三郎',
		address: '東京都千代田区丸の内一丁目9番2号',
		donorType: 'individual',
		occupation: '弁護士',
	},
	{
		name: '寄附　四郎',
		address: '東京都品川区東品川二丁目2番20号',
		donorType: 'individual',
		occupation: '医師',
	},
	{
		name: 'パーティー　一郎',
		address: '東京都文京区本郷三丁目1番1号',
		donorType: 'individual',
		occupation: '公務員',
	},
	{
		name: 'パーティー　二郎',
		address: '東京都台東区浅草一丁目1番1号',
		donorType: 'individual',
		occupation: '教員',
	},

	// 法人その他の団体（corporation）
	{
		name: '株式会社デジタル未来',
		address: '東京都港区芝浦一丁目2番3号',
		donorType: 'corporation',
		occupation: null,
	},
	{
		name: '一般社団法人政治改革推進会',
		address: '東京都中央区日本橋二丁目1番1号',
		donorType: 'corporation',
		occupation: null,
	},
	{
		name: 'NPO法人民主主義研究所',
		address: '東京都世田谷区三軒茶屋一丁目1番1号',
		donorType: 'corporation',
		occupation: null,
	},
	{
		name: '株式会社イノベーション',
		address: '東京都港区六本木六丁目10番1号',
		donorType: 'corporation',
		occupation: null,
	},

	// 政治団体（political_organization）
	{
		name: 'デジタル政策推進団体',
		address: '東京都千代田区永田町二丁目1番2号',
		donorType: 'political_organization',
		occupation: null,
	},
	{
		name: '若手政治家の会',
		address: '東京都港区赤坂一丁目11番28号',
		donorType: 'political_organization',
		occupation: null,
	},
	{
		name: '地方創生研究会',
		address: '東京都新宿区四谷一丁目1番1号',
		donorType: 'political_organization',
		occupation: null,
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
				await prisma.donor.create({
					data: {
						name: item.name,
						address: item.address,
						donorType: item.donorType,
						occupation: item.occupation,
					},
				});
				console.log(`✅ Created: ${item.name} (${item.donorType})`);
			} else {
				console.log(`⏭️  Already exists: ${item.name}`);
			}
		}
	},
};
