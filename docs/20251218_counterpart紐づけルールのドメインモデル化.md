# Counterpart紐づけルールのドメインモデル化

## 概要

政治資金報告書におけるCounterpart（取引先）紐づけのビジネスルールをドメイン層で定義し、インフラ層がそれを参照する設計への移行。

## 背景

### 現状の課題

現在、[prisma-report-transaction.repository.ts](../admin/src/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository.ts:597-608)では、Counterpart紐づけ対象のカテゴリがインフラ層にハードコードされている：

```typescript
// Infrastructure層にビジネスルールが埋め込まれている
const counterpartTargetCondition: Prisma.TransactionWhereInput = {
  OR: [
    { transactionType: "expense" },
    { transactionType: "income", categoryKey: CATEGORY_KEYS.LOAN },
    { transactionType: "income", categoryKey: CATEGORY_KEYS.GRANT },
  ],
};
```

この実装には以下の問題がある：

1. **ビジネスルールがインフラ層に漏れている**: 「どのカテゴリがCounterpart対象か」というドメイン知識がRepository実装に埋め込まれている
2. **再利用不可**: PostgreSQL Triggerや他のコンテキストで同じルールを参照できない
3. **金額閾値が未実装**: 政治資金規正法では10万円以上の支出について明細記載が必要だが、この条件が実装されていない
4. **テストしにくい**: ドメインルールをテストするためにRepository全体をモックする必要がある

### 追加要件

`docs/report_format.md`の仕様に従い、以下の条件を実装する必要がある：

1. **Counterpart紐づけ対象カテゴリ**:
   - 収入: 借入金（SYUUSHI07_04）、本部・支部交付金（SYUUSHI07_05）
   - 支出: 経常経費（SYUUSHI07_14）、政治活動費（SYUUSHI07_15）の全カテゴリ
   - 除外: 寄附関連（別途Donorテーブルで管理）

2. **金額閾値**:
   - 10万円以上の取引について明細記載が必要
   - 10万円未満は「その他の支出」として合算可能

## 設計方針

### 原則

1. **ドメイン知識をDomain層に集約**: ビジネスルール（対象カテゴリ、閾値）はドメインモデルとして定義
2. **Infrastructure層はドメインルールを参照**: Repositoryはドメインモデルを利用してクエリを構築
3. **純粋関数で実装**: ドメインロジックは副作用のない純粋関数として実装し、テスタビリティを確保
4. **型安全性**: TypeScriptの型推論を活用し、カテゴリ定義を型安全に管理

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (loaders/actions)                        │
│ - TransactionWithCounterpartFilters.aboveThresholdOnly      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Domain Layer                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ counterpart-assignment-rules.ts                         │ │
│ │ - COUNTERPART_REQUIRED_INCOME_CATEGORIES (const)        │ │
│ │ - COUNTERPART_REQUIRED_EXPENSE_CATEGORIES (const)       │ │
│ │ - COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD (const)  │ │
│ │ - isCounterpartRequired(type, category): boolean        │ │
│ │ - isAboveDetailThreshold(amount): boolean               │ │
│ │ - requiresCounterpartDetail(...): boolean               │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ import & use
┌────────────────────────▼────────────────────────────────────┐
│ Infrastructure Layer (repositories)                          │
│ - PrismaReportTransactionRepository                          │
│   - findTransactionsWithCounterparts()                       │
│     → ドメイン定数を使ってPrisma条件を構築                  │
└─────────────────────────────────────────────────────────────┘
```

## 実装詳細

### 1. ドメインモデルの作成

**新規ファイル**: `admin/src/server/contexts/report/domain/models/counterpart-assignment-rules.ts`

```typescript
/**
 * 政治資金報告書におけるCounterpart紐づけルールを定義するドメインモデル
 *
 * このファイルは報告書の仕様（docs/report_format.md）に基づき、
 * どのトランザクションがCounterpart情報を必要とするかを定義します。
 */

/**
 * Counterpart紐づけが必要な収入カテゴリ
 * - income_loan: 借入金（SYUUSHI07_04）
 * - income_grant_from_hq: 本部・支部交付金（SYUUSHI07_05）
 */
export const COUNTERPART_REQUIRED_INCOME_CATEGORIES = [
  'income_loan',
  'income_grant_from_hq',
] as const;

/**
 * Counterpart紐づけが必要な支出カテゴリ
 * 経常経費（SYUUSHI07_14）と政治活動費（SYUUSHI07_15）のすべて
 */
export const COUNTERPART_REQUIRED_EXPENSE_CATEGORIES = [
  // 経常経費 (SYUUSHI07_14)
  'expense_utility_costs',
  'expense_office_supplies',
  'expense_office_expenses',
  // 政治活動費 (SYUUSHI07_15)
  'expense_organizational_activity',
  'expense_election_related',
  'expense_publication',
  'expense_publicity',
  'expense_party_event',
  'expense_other_projects',
  'expense_research',
  'expense_donation_grant',
  'expense_other',
] as const;

export type CounterpartRequiredIncomeCategory =
  typeof COUNTERPART_REQUIRED_INCOME_CATEGORIES[number];

export type CounterpartRequiredExpenseCategory =
  typeof COUNTERPART_REQUIRED_EXPENSE_CATEGORIES[number];

export type CounterpartRequiredCategory =
  | CounterpartRequiredIncomeCategory
  | CounterpartRequiredExpenseCategory;

/**
 * Counterpart明細記載が必要な金額閾値（円）
 *
 * 政治資金規正法では、一定金額以上の支出について
 * 支払先の氏名・住所を明細に記載する必要があります。
 *
 * 参考: docs/report_format.md
 * - SYUUSHI07_06（その他の収入）: 10万円以上
 * - SYUUSHI07_14（経常経費）、SYUUSHI07_15（政治活動費）:
 *   報告書には「その他の支出（SONOTA_GK）」として10万円未満を合算する項目があり、
 *   明細が必要なのは実質的に高額な支出
 */
export const COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD = 100_000;

/**
 * トランザクションがCounterpart紐づけ対象かどうかを判定
 *
 * @param transactionType - 'income' | 'expense'
 * @param categoryKey - カテゴリキー（例: 'expense_office_expenses'）
 * @returns Counterpart紐づけ対象の場合true
 *
 * @example
 * ```typescript
 * isCounterpartRequired('expense', 'expense_office_expenses') // true
 * isCounterpartRequired('income', 'income_donation_individual') // false（寄附は対象外）
 * ```
 */
export function isCounterpartRequired(
  transactionType: 'income' | 'expense',
  categoryKey: string,
): boolean {
  if (transactionType === 'income') {
    return COUNTERPART_REQUIRED_INCOME_CATEGORIES.includes(
      categoryKey as CounterpartRequiredIncomeCategory,
    );
  }
  if (transactionType === 'expense') {
    return COUNTERPART_REQUIRED_EXPENSE_CATEGORIES.includes(
      categoryKey as CounterpartRequiredExpenseCategory,
    );
  }
  return false;
}

/**
 * トランザクション金額が明細記載閾値を超えているかどうかを判定
 *
 * @param amount - 金額（円）
 * @returns 閾値以上の場合true
 *
 * @example
 * ```typescript
 * isAboveDetailThreshold(150_000) // true
 * isAboveDetailThreshold(50_000)  // false
 * isAboveDetailThreshold(100_000) // true（閾値ちょうども含む）
 * ```
 */
export function isAboveDetailThreshold(amount: number): boolean {
  return amount >= COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD;
}

/**
 * Counterpart明細記載が必要なトランザクションかどうかを総合判定
 *
 * 以下の条件をすべて満たす場合にtrue:
 * 1. カテゴリがCounterpart紐づけ対象である
 * 2. 金額が閾値以上である
 *
 * @param transactionType - 'income' | 'expense'
 * @param categoryKey - カテゴリキー
 * @param amount - 金額（円）
 * @returns Counterpart明細記載が必要な場合true
 *
 * @example
 * ```typescript
 * requiresCounterpartDetail('expense', 'expense_office_expenses', 150_000) // true
 * requiresCounterpartDetail('expense', 'expense_office_expenses', 50_000)  // false（閾値未満）
 * requiresCounterpartDetail('income', 'income_donation_individual', 150_000) // false（寄附は対象外）
 * ```
 */
export function requiresCounterpartDetail(
  transactionType: 'income' | 'expense',
  categoryKey: string,
  amount: number,
): boolean {
  return (
    isCounterpartRequired(transactionType, categoryKey) &&
    isAboveDetailThreshold(amount)
  );
}
```

### 2. TransactionWithCounterpartFiltersの拡張

**変更ファイル**: `admin/src/server/contexts/report/domain/models/transaction-with-counterpart.ts`

```typescript
export interface TransactionWithCounterpartFilters {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  categoryKey?: string;
  searchQuery?: string;
  // 新規追加: 閾値以上の金額のみ取得
  aboveThresholdOnly?: boolean;
  limit?: number;
  offset?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}
```

### 3. Repository実装の修正

**変更ファイル**: `admin/src/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository.ts`

#### 3-1. ドメインルールのインポート

```typescript
import {
  COUNTERPART_REQUIRED_INCOME_CATEGORIES,
  COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
  COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD,
} from "@/server/contexts/report/domain/models/counterpart-assignment-rules";
```

#### 3-2. findTransactionsWithCounterpartsメソッドの修正

```typescript
async findTransactionsWithCounterparts(
  filters: TransactionWithCounterpartFilters,
): Promise<TransactionWithCounterpartResult> {
  const {
    politicalOrganizationId,
    financialYear,
    unassignedOnly,
    categoryKey,
    searchQuery,
    aboveThresholdOnly = false, // デフォルトはfalse
    limit = 50,
    offset = 0,
    sortField = "transactionDate",
    sortOrder = "asc",
  } = filters;

  if (!/^\d+$/.test(politicalOrganizationId)) {
    throw new Error(
      `Invalid politicalOrganizationId: "${politicalOrganizationId}" is not a valid numeric string`,
    );
  }

  // ドメインルールを使用してCounterpart紐付け対象を定義
  const counterpartTargetCondition: Prisma.TransactionWhereInput = {
    OR: [
      {
        transactionType: "expense",
        categoryKey: { in: [...COUNTERPART_REQUIRED_EXPENSE_CATEGORIES] }
      },
      {
        transactionType: "income",
        categoryKey: { in: [...COUNTERPART_REQUIRED_INCOME_CATEGORIES] }
      },
    ],
  };

  const conditions: Prisma.TransactionWhereInput[] = [
    { politicalOrganizationId: BigInt(politicalOrganizationId) },
    { financialYear },
    counterpartTargetCondition,
  ];

  if (categoryKey) {
    conditions.push({ categoryKey });
  }

  if (searchQuery) {
    const searchTerm = searchQuery.trim();
    if (searchTerm) {
      conditions.push({
        OR: [
          { description: { contains: searchTerm, mode: "insensitive" } },
          { memo: { contains: searchTerm, mode: "insensitive" } },
          { friendlyCategory: { contains: searchTerm, mode: "insensitive" } },
          { debitPartner: { contains: searchTerm, mode: "insensitive" } },
          { creditPartner: { contains: searchTerm, mode: "insensitive" } },
        ],
      });
    }
  }

  if (unassignedOnly) {
    conditions.push({
      transactionCounterparts: { none: {} },
    });
  }

  // 新規追加: 閾値以上のフィルタ
  if (aboveThresholdOnly) {
    conditions.push({
      debitAmount: { gte: COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD }
    });
  }

  const whereClause: Prisma.TransactionWhereInput = { AND: conditions };

  // ... 残りは既存のまま
}
```

### 4. Loaderの修正

**変更ファイル**: `admin/src/server/contexts/report/presentation/loaders/transactions-with-counterparts-loader.ts`

#### 4-1. Inputインターフェースの拡張

```typescript
export interface LoadTransactionsWithCounterpartsInput {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  aboveThresholdOnly?: boolean;  // 新規追加
  categoryKey?: string;
  searchQuery?: string;
  page?: number;
  perPage?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}
```

#### 4-2. Loader実装の修正

```typescript
const filters: TransactionWithCounterpartFilters = {
  politicalOrganizationId: input.politicalOrganizationId,
  financialYear: input.financialYear,
  unassignedOnly: input.unassignedOnly,
  aboveThresholdOnly: input.aboveThresholdOnly, // 新規追加
  categoryKey: input.categoryKey,
  searchQuery: input.searchQuery,
  limit: perPage,
  offset,
  sortField: input.sortField,
  sortOrder: input.sortOrder,
};
```

#### 4-3. Cache keyの更新

```typescript
const cacheKey = [
  "transactions-with-counterparts",
  input.politicalOrganizationId,
  String(input.financialYear),
  String(input.unassignedOnly ?? false),
  String(input.aboveThresholdOnly ?? false), // 新規追加
  input.categoryKey ?? "",
  input.searchQuery ?? "",
  String(page),
  String(perPage),
  input.sortField ?? "transactionDate",
  input.sortOrder ?? "asc",
];
```

## データフロー

### 1. Counterpart紐づけ対象の判定フロー

```
User Request
  ↓
Loader (aboveThresholdOnly=true)
  ↓
Repository.findTransactionsWithCounterparts()
  ↓
Domain Rules (counterpart-assignment-rules.ts)
  ├─ COUNTERPART_REQUIRED_INCOME_CATEGORIES
  ├─ COUNTERPART_REQUIRED_EXPENSE_CATEGORIES
  └─ COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD
  ↓
Prisma Query
  WHERE (
    (transactionType = 'expense' AND categoryKey IN [...])
    OR
    (transactionType = 'income' AND categoryKey IN [...])
  )
  AND debitAmount >= 100000  -- aboveThresholdOnly=trueの場合
  ↓
Database
  ↓
Result
```

### 2. ドメインルールの再利用例

#### 例1: UIでの閾値表示

```typescript
import { COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD } from "@/server/contexts/report/domain/models/counterpart-assignment-rules";

function TransactionFilters() {
  return (
    <Checkbox label={`${COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD.toLocaleString()}円以上のみ表示`} />
  );
}
```

#### 例2: PostgreSQL Triggerでの検証

```sql
-- migration file
CREATE OR REPLACE FUNCTION validate_transaction_counterpart()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_type VARCHAR(255);
  v_category_key VARCHAR(255);
  v_allowed_income_categories TEXT[] := ARRAY[
    'income_loan',
    'income_grant_from_hq'
  ];
  -- ドメインルールと同期
BEGIN
  -- ... バリデーションロジック
END;
$$ LANGUAGE plpgsql;
```

※ Note: Triggerの配列定義はドメインルール定義と手動で同期する必要がある。将来的にはmigration生成時にドメイン定義から自動生成することも検討可能。

## テスト戦略

### 1. ドメインロジックのユニットテスト

**新規ファイル**: `admin/tests/server/contexts/report/domain/models/counterpart-assignment-rules.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  isCounterpartRequired,
  isAboveDetailThreshold,
  requiresCounterpartDetail,
  COUNTERPART_DETAIL_REQUIRED_AMOUNT_THRESHOLD,
} from '@/server/contexts/report/domain/models/counterpart-assignment-rules';

describe('counterpart-assignment-rules', () => {
  describe('isCounterpartRequired', () => {
    it('支出取引は全カテゴリでtrue', () => {
      expect(isCounterpartRequired('expense', 'expense_office_expenses')).toBe(true);
      expect(isCounterpartRequired('expense', 'expense_organizational_activity')).toBe(true);
    });

    it('収入取引は借入金・交付金のみtrue', () => {
      expect(isCounterpartRequired('income', 'income_loan')).toBe(true);
      expect(isCounterpartRequired('income', 'income_grant_from_hq')).toBe(true);
      expect(isCounterpartRequired('income', 'income_donation_individual')).toBe(false);
    });
  });

  describe('isAboveDetailThreshold', () => {
    it('閾値以上でtrue', () => {
      expect(isAboveDetailThreshold(100_000)).toBe(true);
      expect(isAboveDetailThreshold(150_000)).toBe(true);
    });

    it('閾値未満でfalse', () => {
      expect(isAboveDetailThreshold(99_999)).toBe(false);
      expect(isAboveDetailThreshold(50_000)).toBe(false);
    });
  });

  describe('requiresCounterpartDetail', () => {
    it('対象カテゴリかつ閾値以上でtrue', () => {
      expect(requiresCounterpartDetail('expense', 'expense_office_expenses', 150_000)).toBe(true);
    });

    it('対象カテゴリでも閾値未満でfalse', () => {
      expect(requiresCounterpartDetail('expense', 'expense_office_expenses', 50_000)).toBe(false);
    });

    it('閾値以上でも非対象カテゴリでfalse', () => {
      expect(requiresCounterpartDetail('income', 'income_donation_individual', 150_000)).toBe(false);
    });
  });
});
```

### 2. Repository統合テスト

```typescript
describe('PrismaReportTransactionRepository.findTransactionsWithCounterparts', () => {
  it('aboveThresholdOnly=trueで閾値以上のみ取得', async () => {
    const result = await repository.findTransactionsWithCounterparts({
      politicalOrganizationId: '1',
      financialYear: 2024,
      aboveThresholdOnly: true,
    });

    expect(result.transactions.every(t => t.debitAmount >= 100_000)).toBe(true);
  });
});
```

## マイグレーション戦略

### 段階的な移行

1. **Phase 1: ドメインモデル作成**（破壊的変更なし）
   - `counterpart-assignment-rules.ts`を作成
   - ユニットテストを追加
   - 既存コードは変更せず

2. **Phase 2: Repository修正**（既存動作を維持）
   - Repositoryをドメインルールに移行
   - `aboveThresholdOnly`はデフォルトfalse（既存動作と同じ）
   - 統合テストで動作確認

3. **Phase 3: Loader拡張**（新機能追加）
   - Loaderに`aboveThresholdOnly`パラメータ追加
   - UIから利用可能にする

### ロールバック対応

- Phase 1は追加のみなので影響なし
- Phase 2で問題が発生した場合、Repositoryの実装を元に戻すだけで復旧可能
- Phase 3はオプショナルパラメータなので、指定しなければ既存動作を維持

## 影響範囲

### 変更が必要なファイル

1. **新規作成**
   - `admin/src/server/contexts/report/domain/models/counterpart-assignment-rules.ts`
   - `admin/tests/server/contexts/report/domain/models/counterpart-assignment-rules.test.ts`

2. **修正**
   - `admin/src/server/contexts/report/domain/models/transaction-with-counterpart.ts`
     - `TransactionWithCounterpartFilters`に`aboveThresholdOnly`追加
   - `admin/src/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository.ts`
     - ドメインルールのインポート
     - `findTransactionsWithCounterparts`の実装修正
   - `admin/src/server/contexts/report/presentation/loaders/transactions-with-counterparts-loader.ts`
     - `LoadTransactionsWithCounterpartsInput`に`aboveThresholdOnly`追加
     - フィルタ渡し・キャッシュキー更新

### 変更が不要なファイル

- Database schema（Prismaスキーマ、マイグレーション）
- UI層（今回はバックエンドのリファクタリングのみ）
- 他のRepository実装
- 他のUsecase実装

## 制限事項と今後の課題

### 制限事項

1. **PostgreSQL Triggerとの同期**:
   - Triggerの許可カテゴリリストはTypeScriptのドメイン定義と手動で同期する必要がある
   - 将来的にはmigration生成時に自動同期を検討

2. **既存データへの影響なし**:
   - 既存のTransaction・Counterpartデータは変更不要
   - 新しいフィルタリング条件が追加されるのみ

### 今後の拡張

1. **閾値の動的設定**:
   - 現在は10万円で固定
   - 将来的に組織ごと・年度ごとに閾値を変更できるように拡張可能

2. **カテゴリルールの外部管理**:
   - 現在はコードに埋め込み
   - 法改正対応のため、設定ファイルやDBで管理する選択肢も検討可能

3. **UI層での利用**:
   - フィルタUI: 「10万円以上のみ表示」チェックボックス
   - バッジ表示: 閾値未満の取引に「明細不要」ラベル表示

## 参考資料

- [docs/report_format.md](./report_format.md): 政治資金収支報告書XMLデータフォーマット仕様書
  - SYUUSHI07_06（その他の収入）: 10万円以上の明細記載ルール
  - SYUUSHI07_14（経常経費）: 「その他の支出」項目の説明
  - SYUUSHI07_15（政治活動費）: 「その他の支出」項目の説明
- [docs/20251215_1053_counterpartテーブル設計.md](./20251215_1053_counterpartテーブル設計.md): Counterpartテーブルの基本設計
- [docs/20251216_1430_取引先情報管理機能設計.md](./20251216_1430_取引先情報管理機能設計.md): Counterpart管理UI設計

## まとめ

この設計により、以下を実現する：

1. ✅ **ドメインロジックの中央集約**: ビジネスルールがドメイン層に明示的に定義される
2. ✅ **再利用性の向上**: 複数のレイヤー・コンポーネントから同じルールを参照可能
3. ✅ **テスタビリティ**: 純粋関数として実装されたドメインロジックは単体テスト容易
4. ✅ **型安全性**: TypeScriptの型推論により、カテゴリ定義が型安全に管理される
5. ✅ **保守性**: 法改正や仕様変更時に修正箇所が明確

インフラ層からドメイン知識を分離し、クリーンアーキテクチャの原則に従った設計を実現する。
