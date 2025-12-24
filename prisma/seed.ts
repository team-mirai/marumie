import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import type { Seeder } from './seeds/lib/types';
import { politicalOrganizationsSeeder } from './seeds/politicalOrganizations';
import { reportProfilesSeeder } from './seeds/reportProfiles';
import { usersSeeder } from './seeds/users';

const prisma = new PrismaClient();

// シーダーを配列で管理（順序も制御可能）
const seeders: Seeder[] = [
  politicalOrganizationsSeeder,
  reportProfilesSeeder,
  usersSeeder,
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
