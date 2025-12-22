const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create political organizations
    await seedPoliticalOrganizations();

    // Create organization report profiles
    await seedOrganizationReportProfiles();

    // Create admin user for local development
    await seedAdminUser();

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

// Political organizations seeding function
async function seedPoliticalOrganizations() {
    console.log('Creating political organizations...');

    // 政治組織データの定義
    const organizations = [
        {
            displayName: '政党・チームみらい',
            orgName: null,
            slug: 'team-mirai',
            description: 'チームみらい（Team Mirai）は、日本の政党。2024年東京都知事選挙でAIエンジニアの安野貴博のもとに集まった「チーム安野」を前身として、2025年5月8日に設立された。安野が党首を務めている。第27回参議院議員通常選挙において政党要件を満たし、国政政党となった。公職選挙法における略称は「みらい」。',
        },
        {
            displayName: '党首・安野の政治団体',
            orgName: 'デジタル民主主義を考える会',
            slug: 'digimin',
            description: '安野たかひろの政治団体です',
        }
    ];

    // 政治組織を作成（既存チェック付き）
    for (const orgData of organizations) {
        const existing = await prisma.politicalOrganization.findFirst({
            where: { slug: orgData.slug }
        });

        if (!existing) {
            const created = await prisma.politicalOrganization.create({
                data: orgData
            });
            console.log('Created political organization:', created);
        } else {
            console.log('Political organization already exists:', existing);
        }
    }
}

// Organization report profiles seeding function
async function seedOrganizationReportProfiles() {
    console.log('Creating organization report profiles...');

    // digiminの政治団体を取得
    const digimin = await prisma.politicalOrganization.findFirst({
        where: { slug: 'digimin' }
    });

    if (!digimin) {
        console.log('⚠️  Warning: digimin organization not found - skipping report profile creation');
        return;
    }

    const financialYear = 2025;

    // 既存チェック
    const existing = await prisma.organizationReportProfile.findFirst({
        where: {
            politicalOrganizationId: digimin.id,
            financialYear: financialYear
        }
    });

    if (existing) {
        console.log(`✅ Report profile for ${financialYear} already exists`);
        return;
    }

    // OrganizationReportProfileDetails の構造に準拠したダミーデータ
    const details = {
        representative: {
            lastName: '代表',
            firstName: '太郎'
        },
        accountant: {
            lastName: '会計',
            firstName: '太郎'
        },
        contactPersons: [
            {
                id: 'contact-1',
                lastName: '事務担当',
                firstName: '一郎',
                tel: '03-1234-5678'
            },
            {
                id: 'contact-2',
                lastName: '事務担当',
                firstName: '二郎',
                tel: '03-2345-6789'
            }
        ],
        organizationType: '01', // 政党の支部
        activityArea: '2', // 一つの都道府県
        fundManagement: {
            publicPositionName: '衆議院議員',
            publicPositionType: '1',
            applicant: {
                lastName: '届出',
                firstName: '太郎'
            },
            periods: [
                {
                    id: 'period-1',
                    from: 'r7/1/1',
                    to: 'r7/12/31'
                }
            ]
        },
        dietMemberRelation: {
            type: '0' // 指定無し
        }
    };

    await prisma.organizationReportProfile.create({
        data: {
            politicalOrganizationId: digimin.id,
            financialYear: financialYear,
            officialName: 'デジタル民主主義を考える会',
            officialNameKana: 'デジタルミンシュシュギヲカンガエルカイ',
            officeAddress: '東京都千代田区永田町一丁目2番3号',
            officeAddressBuilding: 'サンプルビル4階',
            details: details
        }
    });

    console.log(`✅ Report profile for ${financialYear} created`);
}

// Admin user seeding function
async function seedAdminUser() {
    console.log('Creating admin user...');

    // Default credentials for local development
    const ADMIN_EMAIL = 'foo@example.com';
    const ADMIN_PASSWORD = 'foo@example.com';
    const USER_EMAIL = 'bar@example.com';
    const USER_PASSWORD = 'bar@example.com';

    // Get Supabase configuration from environment variables
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        console.log('⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not found - skipping admin user creation');
        console.log('   To create admin user, ensure SUPABASE_SERVICE_ROLE_KEY is set in .env');
        return;
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // Check if user already exists
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            throw new Error(`Failed to list users: ${listError.message}`);
        }

        // Check for existing users
        const existingAdmin = existingUsers.users?.find(user => user.email === ADMIN_EMAIL);
        const existingUser = existingUsers.users?.find(user => user.email === USER_EMAIL);

        // Create admin user
        if (existingAdmin) {
            console.log(`✅ Admin user '${ADMIN_EMAIL}' already exists in Supabase`);

            const existingDbAdmin = await prisma.user.findUnique({
                where: { authId: existingAdmin.id }
            });

            if (!existingDbAdmin) {
                await prisma.user.create({
                    data: {
                        authId: existingAdmin.id,
                        email: ADMIN_EMAIL,
                        role: 'admin'
                    }
                });
                console.log('✅ Database admin record created');
            }
        } else {
            const { data: newAdmin, error: adminError } = await supabase.auth.admin.createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                email_confirm: true,
            });

            if (adminError) {
                throw new Error(`Failed to create admin: ${adminError.message}`);
            }

            await prisma.user.create({
                data: {
                    authId: newAdmin.user.id,
                    email: ADMIN_EMAIL,
                    role: 'admin'
                }
            });
            console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
        }

        // Create regular user
        if (existingUser) {
            console.log(`✅ Regular user '${USER_EMAIL}' already exists in Supabase`);

            const existingDbUser = await prisma.user.findUnique({
                where: { authId: existingUser.id }
            });

            if (!existingDbUser) {
                await prisma.user.create({
                    data: {
                        authId: existingUser.id,
                        email: USER_EMAIL,
                        role: 'user'
                    }
                });
                console.log('✅ Database user record created');
            }
        } else {
            const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
                email: USER_EMAIL,
                password: USER_PASSWORD,
                email_confirm: true,
            });

            if (userError) {
                throw new Error(`Failed to create user: ${userError.message}`);
            }

            await prisma.user.create({
                data: {
                    authId: newUser.user.id,
                    email: USER_EMAIL,
                    role: 'user'
                }
            });
            console.log(`✅ Regular user created: ${USER_EMAIL}`);
        }

        console.log('✅ User seeding completed!');
        console.log(`   Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
        console.log(`   User: ${USER_EMAIL} / ${USER_PASSWORD}`);
        console.log('   You can now log in to the admin panel at http://localhost:3001/login');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        console.log('   Admin user creation failed, but database seeding will continue');
    }
}
