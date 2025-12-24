import type { PrismaClient } from '@prisma/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import type { Seeder } from './lib/types';

interface UserSeedData {
  email: string;
  password: string;
  role: 'admin' | 'user';
}

const data: UserSeedData[] = [
  {
    email: 'foo@example.com',
    password: 'foo@example.com',
    role: 'admin',
  },
  {
    email: 'bar@example.com',
    password: 'bar@example.com',
    role: 'user',
  },
];

async function ensureSupabaseUser(
  supabase: SupabaseClient,
  userData: UserSeedData,
  existingUsers: { id: string; email?: string }[]
): Promise<string> {
  const existing = existingUsers.find((u) => u.email === userData.email);
  if (existing) {
    console.log(`⏭️  Already exists: ${userData.email} (${userData.role})`);
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

  console.log(`✅ Created: ${userData.email} (${userData.role})`);
  return newUser.user.id;
}

async function ensureDbUser(
  prisma: PrismaClient,
  authId: string,
  userData: UserSeedData
): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { authId } });
  if (existing) {
    return;
  }

  await prisma.user.create({
    data: {
      authId,
      email: userData.email,
      role: userData.role,
    },
  });
  console.log(`✅ DB record created: ${userData.email}`);
}

function printLoginCredentials(): void {
  console.log('');
  console.log('📋 Login credentials:');
  console.log(`   Admin: ${data[0].email} / ${data[0].password}`);
  console.log(`   User:  ${data[1].email} / ${data[1].password}`);
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
