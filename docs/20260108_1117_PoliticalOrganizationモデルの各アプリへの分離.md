# PoliticalOrganization モデルの各アプリへの分離

## 目的

**開発者**が **Bounded Context の境界を越えた共有モデルによる設計上の問題**を解消するため。

現状、`shared/models/political-organization.ts` が webapp と admin の両方から参照されているが、DDD の原則に従い、各アプリの Bounded Context 内でドメインモデルを定義することで、コンテキストが独立して進化できる設計に改善する。

## 現状分析

### 現在のファイル構成

```
shared/models/
└── political-organization.ts  # webapp/admin 両方から参照

webapp/src/server/contexts/public-finance/
├── domain/repositories/
│   └── political-organization-repository.interface.ts  # @/shared/models を import
└── infrastructure/repositories/
    └── prisma-political-organization.repository.ts

admin/src/server/contexts/shared/
├── domain/repositories/
│   └── political-organization-repository.interface.ts  # @/shared/models を import
└── infrastructure/repositories/
    └── prisma-political-organization.repository.ts
```

### 参照箇所一覧

**webapp（3箇所）**:
- `webapp/src/server/contexts/public-finance/domain/repositories/political-organization-repository.interface.ts`
- `webapp/src/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository.ts`
- `webapp/src/server/contexts/public-finance/application/usecases/*.ts`（3ファイル）

**admin（サーバー側: 8箇所）**:
- `admin/src/server/contexts/shared/domain/repositories/political-organization-repository.interface.ts`
- `admin/src/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository.ts`
- `admin/src/server/contexts/shared/presentation/loaders/*.ts`（2ファイル）
- `admin/src/server/contexts/shared/application/usecases/*.ts`（4ファイル）

**admin（クライアント側: 8箇所）**:
- `admin/src/client/components/political-organizations/PoliticalOrganizationSelect.tsx`
- `admin/src/client/components/counterpart-assignment/CounterpartAssignmentClient.tsx`
- `admin/src/client/components/donor-assignment/DonorAssignmentClient.tsx`
- `admin/src/client/components/csv-upload/CsvUploadClient.tsx`
- `admin/src/client/components/balance-snapshots/BalanceSnapshotsClient.tsx`
- `admin/src/client/components/transactions/TransactionsClient.tsx`
- `admin/src/client/components/export-report/ExportReportSelectors.tsx`
- `admin/src/client/components/counterparts/CounterpartDetailClient.tsx`
- `admin/src/client/components/donor-csv-import/DonorCsvImportClient.tsx`

**テスト（1箇所）**:
- `admin/tests/server/contexts/shared/application/usecases/political-organization-usecases.test.ts`

### 問題点

1. **Bounded Context の境界を越えた共有モデル**: `shared/models/` に配置されたモデルが webapp と admin の両方から参照されている

2. **異なるコンテキストで異なる関心事**:
   - webapp (public-finance): 読み取り専用（`findBySlug`, `findById`, `findAll` など）
   - admin (shared): CRUD 全般（`create`, `update`, `delete`, `countTransactions`）

3. **各コンテキストの独立した進化を阻害**: 将来的に一方のコンテキストだけで必要なフィールドを追加したい場合、もう一方にも影響が及ぶ

## リファクタリング方針

### 変更後のファイル構成

```
shared/models/
└── (political-organization.ts を削除)

webapp/src/server/contexts/public-finance/
├── domain/
│   ├── models/
│   │   └── political-organization.ts  # 新規作成
│   └── repositories/
│       └── political-organization-repository.interface.ts  # import 先を変更
└── infrastructure/repositories/
    └── prisma-political-organization.repository.ts  # import 先を変更

admin/src/server/contexts/shared/
├── domain/
│   ├── models/
│   │   └── political-organization.ts  # 新規作成
│   └── repositories/
│       └── political-organization-repository.interface.ts  # import 先を変更
└── infrastructure/repositories/
    └── prisma-political-organization.repository.ts  # import 先を変更
```

### 各アプリのモデル定義

webapp と admin で同じ構造を定義する（現時点では同一だが、各コンテキストが独立して変更可能な状態を保つ）:

```typescript
// webapp/src/server/contexts/public-finance/domain/models/political-organization.ts
// admin/src/server/contexts/shared/domain/models/political-organization.ts
export interface PoliticalOrganization {
  id: string;
  displayName: string;
  orgName: string | null;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## 作業手順

### Phase 1: webapp 側の分離

1. `webapp/src/server/contexts/public-finance/domain/models/political-organization.ts` を作成
2. 以下のファイルの import を更新:
   - `webapp/src/server/contexts/public-finance/domain/repositories/political-organization-repository.interface.ts`
   - `webapp/src/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository.ts`
   - `webapp/src/server/contexts/public-finance/application/usecases/get-all-transactions-by-slug-usecase.ts`
   - `webapp/src/server/contexts/public-finance/application/usecases/get-transactions-by-slug-usecase.ts`
   - `webapp/src/server/contexts/public-finance/application/usecases/get-organizations-usecase.ts`

### Phase 2: admin 側の分離

1. `admin/src/server/contexts/shared/domain/models/political-organization.ts` を作成
2. 以下のファイルの import を更新:
   - `admin/src/server/contexts/shared/domain/repositories/political-organization-repository.interface.ts`
   - `admin/src/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository.ts`
   - `admin/src/server/contexts/shared/presentation/loaders/*.ts`
   - `admin/src/server/contexts/shared/application/usecases/*.ts`
   - `admin/src/client/components/**/*.tsx`（8ファイル）
   - `admin/tests/server/contexts/shared/application/usecases/political-organization-usecases.test.ts`

### Phase 3: 共有モデルの削除とドキュメント更新

1. `shared/models/political-organization.ts` を削除
2. `docs/backend-architecture-guide.md` を更新:
   - FAQ の「複数のコンテキストで同じエンティティを使いたい場合は?」を修正
   - PoliticalOrganization を shared の例から削除

## ドキュメント更新内容

`docs/backend-architecture-guide.md` の以下の箇所を更新:

### セクション 2.1 コンテキスト一覧

**Before:**
```
| 共通 | **shared** | 全コンテキスト共通の基盤（Transaction, PoliticalOrganization等） |
```

**After:**
```
| 共通 | **shared** | 全コンテキスト共通の基盤（Transaction等） |
```

### セクション 9 よくある質問

**Before:**
```
**Q: 複数のコンテキストで同じエンティティを使いたい場合は?**
A: sharedコンテキストに配置する（例: Transaction, PoliticalOrganization）。
```

**After:**
```
**Q: 複数のコンテキストで同じエンティティを使いたい場合は?**
A: 原則として各コンテキストで独自に定義する。たとえ現時点で構造が同じでも、各コンテキストが独立して進化できる状態を保つべき。sharedに配置するのは、コンテキスト間で共有が必要なインフラストラクチャ（Prisma client等）や、Transaction のように複数コンテキストから参照される基盤的なエンティティに限定する。
```

## 検証項目

- [ ] `pnpm build` が成功すること（webapp, admin 両方）
- [ ] `pnpm typecheck` が成功すること
- [ ] `pnpm test` が成功すること
- [ ] `pnpm depcruise` が成功すること（依存ルール違反がないこと）
