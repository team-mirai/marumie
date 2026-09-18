import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import type { Seeder } from './seeds/lib/types';
import { balanceSnapshotsSeeder } from './seeds/balanceSnapshots';
import { counterpartsSeeder } from './seeds/counterparts';
import { donorsSeeder } from './seeds/donors';
import { politicalOrganizationsSeeder } from './seeds/politicalOrganizations';
import { politiciansSeeder } from './seeds/politicians';
import { reportProfilesSeeder } from './seeds/reportProfiles';
import { researchFundJournalEntriesSeeder } from '@/prisma/seeds/researchFundJournalEntries';
import { researchFundBooksSeeder } from './seeds/researchFundBooks';
import { researchFundExpenditureGroupsSeeder } from './seeds/researchFundExpenditureGroups';
import { tenantsSeeder } from './seeds/tenants';
import { transactionsSeeder } from './seeds/transactions';
import { usersSeeder } from './seeds/users';

const prisma = new PrismaClient();

// シーダーを配列で管理（順序も制御可能）
// テナントは最初に作成する必要がある（他のエンティティがテナントを参照するため）
const seeders: Seeder[] = [
  tenantsSeeder,
  politicalOrganizationsSeeder,
  reportProfilesSeeder,
  usersSeeder,
  counterpartsSeeder,
  donorsSeeder,
  transactionsSeeder,
  balanceSnapshotsSeeder,
  // 調研費: 議員（所属は既存 political_organizations を参照） → 年度帳簿
  // 科目マスタはマイグレーション（20260916170000_seed_research_fund_accounts）で投入済み
  politiciansSeeder,
  researchFundBooksSeeder,
  researchFundJournalEntriesSeeder,
  researchFundExpenditureGroupsSeeder,
];

async function main() {
  console.log('🌱 Seeding database...\n');

  for (const seeder of seeders) {
    console.log(`📦 ${seeder.name}...`);
    await seeder.seed(prisma);
    console.log('');
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
