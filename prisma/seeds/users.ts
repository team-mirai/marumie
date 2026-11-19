import type { PrismaClient } from '@prisma/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import type { Seeder } from './lib/types';

interface UserSeedData {
  email: string;
  password: string;
  roles: ('admin' | 'political_fund' | 'research_fund')[];
}

const data: UserSeedData[] = [
  {
    email: 'foo@example.com',
    password: 'foo@example.com',
    roles: ['admin'],
  },
  {
    // 政治資金担当（調査研究費の画面は使えない）
    email: 'bar@example.com',
    password: 'bar@example.com',
    roles: ['political_fund'],
  },
  {
    // 調査研究費担当（議員室の秘書を想定。政治資金系の画面は使えない）
    email: 'baz@example.com',
    password: 'baz@example.com',
    roles: ['research_fund'],
  },
];

async function ensureSupabaseUser(
  supabase: SupabaseClient,
  userData: UserSeedData,
  existingUsers: { id: string; email?: string }[]
): Promise<string> {
  const existing = existingUsers.find((u) => u.email === userData.email);
  if (existing) {
    console.log(`⏭️  Already exists: ${userData.email} (${userData.roles.join(', ')})`);
    return existing.id;
  }

  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create user ${userData.email}: ${error.message}`);
  }

  console.log(`✅ Created: ${userData.email} (${userData.roles.join(', ')})`);
  return newUser.user.id;
}

async function ensureDbUser(
  prisma: PrismaClient,
  authId: string,
  userData: UserSeedData
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { authId } });
  if (!user) {
    await prisma.user.create({
      data: {
        authId,
        email: userData.email,
        roles: userData.roles,
      },
    });
    console.log(`✅ DB record created: ${userData.email}`);
  } else if (user.roles.join(',') !== userData.roles.join(',')) {
    // ロールを複数持てるようにした（#1772）より前に作られたローカルのユーザーも、シードのロールに揃える
    await prisma.user.update({ where: { authId }, data: { roles: userData.roles } });
    console.log(`DB record roles updated: ${userData.email}`);
  }
}

function printLoginCredentials(): void {
  console.log('');
  console.log('📋 Login credentials:');
  console.log(`   Admin:          ${data[0].email} / ${data[0].password}`);
  console.log(`   Political fund: ${data[1].email} / ${data[1].password}`);
  console.log(`   Research fund:  ${data[2].email} / ${data[2].password}`);
  console.log(`   URL:   http://localhost:3001/login`);
}

export const usersSeeder: Seeder = {
  name: 'Users',
  async seed(prisma: PrismaClient) {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.log('⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not found - skipping user creation');
      console.log('   To create users, ensure SUPABASE_SERVICE_ROLE_KEY is set in .env');
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      for (const userData of data) {
        const authId = await ensureSupabaseUser(supabase, userData, existingUsers.users ?? []);
        await ensureDbUser(prisma, authId, userData);
      }

      printLoginCredentials();
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      console.log('   User creation failed, but database seeding will continue');
    }
  },
};
