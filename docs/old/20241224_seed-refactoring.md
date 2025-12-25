# シード管理のリファクタリング設計

## 概要

現状の `prisma/seed.cjs` を TypeScript 化し、Seeder インターフェースによる拡張性の高いシード管理へ移行する。

## 現状の課題

- **型安全性がない**: CommonJS のため TypeScript の型チェックの恩恵を受けられない
- **手続き的**: for ループや条件分岐が多く、意図が読み取りにくい
- **重複コード**: 既存チェック・作成パターンが繰り返されている
- **拡張性が低い**: 新しいシードを追加する際に main 関数を直接編集する必要がある
- **データとロジックが混在**: シードデータの定義と実行ロジックが分離されていない

## 目標

- TypeScript 化による型安全性の確保
- Seeder インターフェースによる統一的なシード管理
- 新しいシードの追加が容易（配列に追加するだけ）
- 各 Seeder は独立して実装できる柔軟性

## ディレクトリ構成

```
prisma/
├── seed.ts                          # メインエントリーポイント（超シンプル）
└── seeds/
    ├── lib/
    │   └── types.ts                # Seederインターフェース定義
    ├── politicalOrganizations.ts   # 政治団体シーダー
    ├── reportProfiles.ts           # 報告書プロファイルシーダー
    └── users.ts                    # ユーザーシーダー
```

## 実装手順

### 1. 必要なパッケージの確認・追加

```bash
# tsx が未インストールの場合
pnpm add -D tsx
```

### 2. ディレクトリ構造の作成

```bash
mkdir -p prisma/seeds/lib
```

### 3. Seeder インターフェースの定義

**prisma/seeds/lib/types.ts**

```typescript
import type { PrismaClient } from '@prisma/client';

/**
 * シーダーインターフェース
 * 各シーダーはこのインターフェースを実装する
 */
export interface Seeder {
  /** シーダーの表示名 */
  name: string;
  /** シード実行処理 */
  seed(prisma: PrismaClient): Promise<void>;
}
```

### 4. 各 Seeder の実装

#### 4-1. 政治団体シーダー

**prisma/seeds/politicalOrganizations.ts**

```typescript
import type { Prisma, PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

const data: Prisma.PoliticalOrganizationCreateInput[] = [
  {
    displayName: '政党・チームみらい',
    orgName: null,
    slug: 'team-mirai',
    description:
      'チームみらい（Team Mirai）は、日本の政党。2024年東京都知事選挙でAIエンジニアの安野貴博のもとに集まった「チーム安野」を前身として、2025年5月8日に設立された。安野が党首を務めている。第27回参議院議員通常選挙において政党要件を満たし、国政政党となった。公職選挙法における略称は「みらい」。',
  },
  {
    displayName: '党首・安野の政治団体',
    orgName: 'デジタル民主主義を考える会',
    slug: 'digimin',
    description: '安野たかひろの政治団体です',
  },
];

export const politicalOrganizationsSeeder: Seeder = {
  name: 'Political Organizations',
  async seed(prisma: PrismaClient) {
    for (const item of data) {
      const existing = await prisma.politicalOrganization.findFirst({
        where: { slug: item.slug },
      });

      if (!existing) {
        await prisma.politicalOrganization.create({ data: item });
        console.log(`  ✓ Created: ${item.slug}`);
      } else {
        console.log(`  - Already exists: ${item.slug}`);
      }
    }
  },
};
```

#### 4-2. 報告書プロファイルシーダー

**prisma/seeds/reportProfiles.ts**

```typescript
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
    organizationSlug: 'digimin',
    financialYear: 2025,
    officialName: 'デジタル民主主義を考える会',
    officialNameKana: 'デジタルミンシュシュギヲカンガエルカイ',
    officeAddress: '東京都千代田区永田町一丁目2番3号',
    officeAddressBuilding: 'サンプルビル4階',
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
        {
          id: 'contact-2',
          lastName: '事務担当',
          firstName: '二郎',
          tel: '03-2345-6789',
        },
      ],
      organizationType: '01',
      activityArea: '2',
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
        type: '0',
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
        console.log(`  ⚠️  Organization '${profile.organizationSlug}' not found - skipping`);
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
        console.log(
          `  - Already exists: ${profile.organizationSlug} (${profile.financialYear})`
        );
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

      console.log(
        `  ✓ Created: ${profile.organizationSlug} (${profile.financialYear})`
      );
    }
  },
};
```

#### 4-3. ユーザーシーダー

**prisma/seeds/users.ts**

```typescript
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
      console.log('  ⚠️  SUPABASE_SERVICE_ROLE_KEY not found - skipping');
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    try {
      const { data: existingUsers, error: listError } =
        await supabase.auth.admin.listUsers();

      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      for (const userData of data) {
        const existingSupabaseUser = existingUsers.users?.find(
          (user) => user.email === userData.email
        );

        let authId: string;

        if (existingSupabaseUser) {
          authId = existingSupabaseUser.id;
        } else {
          const { data: newUser, error: createError } =
            await supabase.auth.admin.createUser({
              email: userData.email,
              password: userData.password,
              email_confirm: true,
            });

          if (createError) {
            throw new Error(
              `Failed to create user ${userData.email}: ${createError.message}`
            );
          }

          authId = newUser.user.id;
          console.log(`  ✓ Created in Supabase: ${userData.email}`);
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
          console.log(`  ✓ Created in DB: ${userData.email}`);
        } else {
          console.log(`  - Already exists: ${userData.email}`);
        }
      }

      console.log(`\n  Login credentials:`);
      console.log(`    Admin: ${data[0].email} / ${data[0].password}`);
      console.log(`    User: ${data[1].email} / ${data[1].password}`);
      console.log(`    URL: http://localhost:3001/login`);
    } catch (error) {
      console.error('  ❌ Error:', (error as Error).message);
    }
  },
};
```

### 5. メインシードファイルの作成

**prisma/seed.ts**

```typescript
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
    console.log(`📝 ${seeder.name}...`);
    await seeder.seed(prisma);
  }

  console.log('\n✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 6. package.json の更新

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### 7. 動作確認

```bash
# データベースをリセットしてシード実行
pnpm prisma migrate reset

# または、シードのみ実行
pnpm prisma db seed
```

### 8. 旧ファイルの削除

動作確認が完了したら、旧ファイルを削除：

```bash
rm prisma/seed.cjs
```

## 今後の拡張

新しいシードデータ（counterpart, transaction など）を追加する場合：

### ステップ1: 新しい Seeder ファイルを作成

**prisma/seeds/counterparts.ts**

```typescript
import type { Prisma, PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

const data: Prisma.CounterpartCreateInput[] = [
  {
    name: 'サンプル取引先A',
    address: '東京都渋谷区...',
    // ... その他のフィールド
  },
  // ...
];

export const counterpartsSeeder: Seeder = {
  name: 'Counterparts',
  async seed(prisma: PrismaClient) {
    for (const item of data) {
      const existing = await prisma.counterpart.findFirst({
        where: { name: item.name },
      });

      if (!existing) {
        await prisma.counterpart.create({ data: item });
        console.log(`  ✓ Created: ${item.name}`);
      } else {
        console.log(`  - Already exists: ${item.name}`);
      }
    }
  },
};
```

### ステップ2: メインシードファイルの配列に追加

**prisma/seed.ts**

```typescript
import { counterpartsSeeder } from './seeds/counterparts';

const seeders: Seeder[] = [
  politicalOrganizationsSeeder,
  reportProfilesSeeder,
  usersSeeder,
  counterpartsSeeder, // 追加するだけ！
];
```

## メリット

- **型安全**: Prisma の型を活用し、スキーマ変更時にコンパイルエラーで検知
- **超シンプルなメインファイル**: for ループで回すだけ
- **拡張性**: 新しい Seeder を配列に追加するだけで済む
- **柔軟性**: 各 Seeder は独立して実装でき、複雑な処理も自由に書ける
- **順序制御**: 配列の順序でシード実行順序を制御可能
- **保守性**: 各 Seeder ファイルを見れば、データとロジックが一箇所で把握できる
