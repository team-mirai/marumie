import type { PrismaClient } from '@prisma/client';
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

export const usersSeeder: Seeder = {
  name: 'Users',
  async seed(prisma: PrismaClient) {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.log('  Warning: SUPABASE_SERVICE_ROLE_KEY not found - skipping user creation');
      console.log('  To create users, ensure SUPABASE_SERVICE_ROLE_KEY is set in .env');
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    try {
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      for (const userData of data) {
        const existingSupabaseUser = existingUsers.users?.find(
          (user) => user.email === userData.email
        );

        let authId: string;

        if (existingSupabaseUser) {
          console.log(`  ${userData.role === 'admin' ? 'Admin' : 'Regular'} user '${userData.email}' already exists in Supabase`);
          authId = existingSupabaseUser.id;
        } else {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
          });

          if (createError) {
            throw new Error(`Failed to create user ${userData.email}: ${createError.message}`);
          }

          authId = newUser.user.id;
          console.log(`  ${userData.role === 'admin' ? 'Admin' : 'Regular'} user created: ${userData.email}`);
        }

        // データベースレコード作成
        const existingDbUser = await prisma.user.findUnique({
          where: { authId },
        });

        if (!existingDbUser) {
          await prisma.user.create({
            data: {
              authId,
              email: userData.email,
              role: userData.role,
            },
          });
          console.log(`  Database ${userData.role} record created`);
        }
      }

      console.log(`\n  User seeding completed!`);
      console.log(`    Admin: ${data[0].email} / ${data[0].password}`);
      console.log(`    User: ${data[1].email} / ${data[1].password}`);
      console.log(`    You can now log in to the admin panel at http://localhost:3001/login`);
    } catch (error) {
      console.error('  Error creating users:', (error as Error).message);
      console.log('  User creation failed, but database seeding will continue');
    }
  },
};
