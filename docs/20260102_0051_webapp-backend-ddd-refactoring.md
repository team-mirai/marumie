# webapp バックエンド DDD リファクタリング設計

## 目的

**開発者が**、webappのバックエンドコードを理解・変更しやすくするため。

現状の課題:
- `TransactionRepository` が肥大化し、グラフごとの集計ロジックが混在している
- `utils/` にドメインロジック（Sankey変換、累積計算等）が散在している
- adminと異なるアーキテクチャのため、コンテキストスイッチのコストがかかる

## 方針

### Bounded Context は1つ

webappは**読み取り専用の公開サイト**であり、すべての機能が「取引データの可視化」という単一の責務を持つ。グラフごとにBCを分けるのは過剰であり、以下の理由から単一BC「public-finance（政治資金公開）」とする:

1. **同じ集約ルートを共有**: Transaction と PoliticalOrganization が全機能の中心
2. **ユビキタス言語が共通**: 「取引」「収入」「支出」「カテゴリ」「財政年度」が全機能で使われる
3. **BC間の相互依存がない**: 読み取り専用のため、データの流れが一方向

### グラフごとにドメインモデル化

各グラフ（可視化機能）は独自の**ドメインモデル**と**ドメインサービス**を持つ。これにより:
- グラフ固有のビジネスロジックが明確に分離される
- テストが書きやすくなる
- 変更の影響範囲が限定される

---

## 対象とするグラフ/機能

| グラフ/機能 | 現状のUsecase | 現状のロジック配置 |
|---|---|---|
| Sankeyダイアグラム | `GetSankeyAggregationUsecase` | `utils/sankey-category-converter.ts` |
| 月別収支グラフ | `GetMonthlyTransactionAggregationUsecase` | Repository内 |
| 貸借対照表 | `GetBalanceSheetUsecase` | Usecase内 |
| 日次寄附グラフ | `GetDailyDonationUsecase` | Usecase内 |
| 取引一覧 | `GetTransactionsBySlugUsecase` | `utils/transaction-converter.ts` |

---

## 新しいディレクトリ構造

```
webapp/src/server/
├── contexts/
│   └── public-finance/           # 唯一のBounded Context
│       ├── presentation/
│       │   ├── loaders/          # 現在の loaders/
│       │   └── actions/          # 現在の actions/
│       ├── application/
│       │   └── usecases/         # 現在の usecases/
│       ├── domain/
│       │   ├── models/           # グラフごとのドメインモデル（型 + 純粋関数）
│       │   │   ├── sankey.ts
│       │   │   ├── monthly-chart.ts
│       │   │   ├── balance-sheet.ts
│       │   │   ├── donation-summary.ts
│       │   │   └── display-transaction.ts
│       │   ├── services/         # 複雑な変換ロジックのみ
│       │   │   └── sankey-builder.ts
│       │   └── repositories/     # リポジトリインターフェース
│       │       ├── transaction-repository.interface.ts
│       │       ├── political-organization-repository.interface.ts
│       │       └── balance-snapshot-repository.interface.ts
│       └── infrastructure/
│           └── repositories/     # リポジトリ実装
│               ├── prisma-transaction.repository.ts
│               ├── prisma-political-organization.repository.ts
│               └── prisma-balance-snapshot.repository.ts
└── lib/
    └── prisma.ts                 # Prismaクライアント（shared相当）
```

**ドメインサービスの判断基準**:
- 単一エンティティのロジック → **ドメインモデル**の純粋関数
- 複数エンティティにまたがる複雑な変換 → **ドメインサービス**

Sankey以外はドメインモデルで十分なため、`domain/services/` には `sankey-builder.ts` のみ配置。

---

## グラフごとのドメインモデル設計

### 1. Sankeyダイアグラム

**ドメインモデル** (`domain/models/sankey.ts`)

```typescript
// 型定義
export interface SankeyNode {
  id: string;
  label: string;
  nodeType: "income" | "income-sub" | "total" | "expense" | "expense-sub";
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// ドメインロジック
export const SankeyData = {
  /** 収入の合計を計算 */
  getTotalIncome(data: SankeyData): number { ... },

  /** 支出の合計を計算 */
  getTotalExpense(data: SankeyData): number { ... },
};
```

**ドメインサービス** (`domain/services/sankey-builder.ts`)

現在の `utils/sankey-category-converter.ts` の責務を移動:
- カテゴリ集計データからSankeyDataへの変換
- 小規模項目の統合ロジック
- 残高・負債情報の追加

### 2. 月別収支グラフ

**ドメインモデル** (`domain/models/monthly-chart.ts`)

```typescript
export interface MonthlyChartData {
  yearMonth: string;  // "YYYY-MM"
  income: number;
  expense: number;
}

export const MonthlyChartData = {
  /** 収支差額を計算 */
  getBalance(data: MonthlyChartData): number {
    return data.income - data.expense;
  },

  /** 累積収支を計算 */
  calculateCumulative(dataList: MonthlyChartData[]): MonthlyChartDataWithCumulative[] { ... },
};
```

ドメインサービスは不要（SQLで集計済み、モデルの純粋関数で十分）。

### 3. 貸借対照表

**ドメインモデル** (`domain/models/balance-sheet.ts`)

```typescript
export interface BalanceSheet {
  assets: {
    current: number;   // 流動資産
    fixed: number;     // 固定資産
  };
  liabilities: {
    current: number;   // 流動負債
    fixed: number;     // 固定負債
  };
  netAssets: number;   // 純資産
  debtExcess: number;  // 債務超過額
}

export const BalanceSheet = {
  /** 総資産を計算 */
  getTotalAssets(sheet: BalanceSheet): number {
    return sheet.assets.current + sheet.assets.fixed;
  },

  /** 総負債を計算 */
  getTotalLiabilities(sheet: BalanceSheet): number {
    return sheet.liabilities.current + sheet.liabilities.fixed;
  },

  /** 純資産と債務超過を計算 */
  calculateNetAssetsAndDebtExcess(
    totalAssets: number,
    totalLiabilities: number,
  ): { netAssets: number; debtExcess: number } { ... },

  /** BalanceSheetを構築（現在のUsecase内ロジックを移動） */
  create(params: {
    currentAssets: number;
    fixedAssets: number;
    currentLiabilities: number;
    fixedLiabilities: number;
  }): BalanceSheet { ... },
};
```

ドメインサービスは不要（モデルの純粋関数で十分）。

### 4. 日次寄附グラフ

**ドメインモデル** (`domain/models/donation-summary.ts`)

```typescript
export interface DailyDonation {
  date: string;           // "YYYY-MM-DD"
  dailyAmount: number;
  cumulativeAmount: number;
}

export interface DonationSummary {
  dailyData: DailyDonation[];
  totalAmount: number;
  amountDayOverDay: number;
  lastNonZeroDonationDate: string | null;
}

export const DonationSummary = {
  /** 期間内の合計寄附額を計算 */
  getTotalAmount(summary: DonationSummary): number { ... },

  /** 前日比を計算 */
  calculateDayOverDay(today: DailyDonation, yesterday: DailyDonation): number { ... },

  /** 日付の穴埋め（現在のUsecase内ロジックを移動） */
  fillMissingDates(rawData: DailyDonation[], financialYear: number): DailyDonation[] { ... },

  /** 累積計算 */
  calculateCumSum(filledData: DailyDonation[]): DailyDonation[] { ... },

  /** 直近N日の切り出し */
  sliceRecentDays(data: DailyDonation[], days: number, today: Date): DailyDonation[] { ... },

  /** サマリー構築 */
  build(dailyData: DailyDonation[], today: Date): DonationSummary { ... },
};
```

ドメインサービスは不要（モデルの純粋関数で十分）。

### 5. 取引一覧

**ドメインモデル** (`domain/models/display-transaction.ts`)

```typescript
export interface DisplayTransaction {
  id: string;
  date: Date;
  type: "income" | "expense";
  amount: number;           // 正負で表現（支出時はマイナス）
  category: string;
  subcategory: string | null;
  description: string | null;
  partner: string | null;
}

export const DisplayTransaction = {
  /** 収入かどうか */
  isIncome(tx: DisplayTransaction): boolean {
    return tx.type === "income";
  },

  /** 表示用の金額（絶対値） */
  getAbsoluteAmount(tx: DisplayTransaction): number {
    return Math.abs(tx.amount);
  },

  /** Transaction → DisplayTransaction 変換（現在のutils/transaction-converter.tsから移動） */
  fromTransaction(tx: Transaction): DisplayTransaction { ... },

  /** 複数件の変換 */
  fromTransactions(txs: Transaction[]): DisplayTransaction[] { ... },
};
```

ドメインサービスは不要（単一エンティティの変換なのでモデルの純粋関数で十分）。

---

## リポジトリの扱い

### 現状の問題

`ITransactionRepository` が以下の責務を持ちすぎている:
- 基本的なCRUD (`findById`, `findAll`, `findWithPagination`)
- Sankey用集計 (`getCategoryAggregationForSankey`)
- 月次集計 (`getMonthlyAggregation`)
- 日次寄附集計 (`getDailyDonationData`)
- 借入金計算 (`getBorrowingIncomeTotal`, `getBorrowingExpenseTotal`)
- 負債計算 (`getLiabilityBalance`)

### 方針: Interface Segregationを適用

用途ごとにインターフェースを分離する:

```typescript
// 基本的な取引クエリ
export interface ITransactionQueryRepository {
  findById(id: string): Promise<Transaction | null>;
  findAll(filters?: TransactionFilters): Promise<Transaction[]>;
  findWithPagination(filters?: TransactionFilters, pagination?: PaginationOptions): Promise<PaginatedResult<Transaction>>;
  findAllWithPoliticalOrganizationName(filters?: TransactionFilters): Promise<Array<Transaction & { political_organization_name: string }>>;
  getLastUpdatedAt(): Promise<Date | null>;
}

// Sankey用集計
export interface ISankeyAggregationRepository {
  getCategoryAggregation(
    politicalOrganizationIds: string[],
    financialYear: number,
    categoryType?: "political-category" | "friendly-category",
  ): Promise<SankeyCategoryAggregationResult>;
}

// 月次集計
export interface IMonthlyAggregationRepository {
  getMonthlyAggregation(
    politicalOrganizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyAggregation[]>;
}

// 日次寄附集計
export interface IDonationAggregationRepository {
  getDailyDonationData(
    politicalOrganizationIds: string[],
    financialYear: number,
  ): Promise<DailyDonationData[]>;
}

// 貸借対照表用
export interface IBalanceSheetRepository {
  getBorrowingIncomeTotal(politicalOrganizationIds: string[], financialYear: number): Promise<number>;
  getBorrowingExpenseTotal(politicalOrganizationIds: string[], financialYear: number): Promise<number>;
  getLiabilityBalance(politicalOrganizationIds: string[], financialYear: number): Promise<number>;
}
```

### 実装クラス

実装は単一クラス `PrismaTransactionRepository` のままで、複数のインターフェースを実装する:

```typescript
export class PrismaTransactionRepository implements
  ITransactionQueryRepository,
  ISankeyAggregationRepository,
  IMonthlyAggregationRepository,
  IDonationAggregationRepository,
  IBalanceSheetRepository {
  // ...
}
```

Usecaseは必要なインターフェースのみに依存することで、依存関係が明確になる。

---

## 移行計画

**方針: グラフ単位で縦に移行する**

レイヤー単位（横）ではなく、グラフ単位（縦）で移行する。これにより:
- 1つのグラフを完全にDDD化してから次に進むので、動作確認がしやすい
- 途中で中断しても、完了したグラフは新構造、未着手は旧構造で共存できる
- PRのレビューも「Sankeyのリファクタリング」のように責務が明確

### Phase 0: 基盤準備

1. `webapp/src/server/contexts/public-finance/` のディレクトリ構造を作成
2. 共通で使うリポジトリ（PoliticalOrganization, BalanceSnapshot）を新構造に移動
3. `lib/prisma.ts` はそのまま維持

### Phase 1: 月別収支グラフ（最もシンプル）

現状ほぼRepositoryのSQLで完結しており、ドメインロジックが少ないため最初に着手。

1. `domain/models/monthly-chart.ts` を作成（型 + 純粋関数）
2. `domain/repositories/monthly-aggregation-repository.interface.ts` を作成
3. `infrastructure/repositories/` に実装を追加
4. `application/usecases/get-monthly-transaction-aggregation-usecase.ts` を移動・修正
5. `presentation/loaders/` から呼び出しを更新
6. 動作確認・テスト

### Phase 2: 貸借対照表

Usecase内の計算ロジックをドメインモデルに移動。

1. `domain/models/balance-sheet.ts` を作成（型 + 純粋関数、Usecase内ロジックを移動）
2. `domain/repositories/balance-sheet-repository.interface.ts` を作成
3. `infrastructure/repositories/` に実装を追加
4. `application/usecases/get-balance-sheet-usecase.ts` を移動・修正
5. `presentation/loaders/` から呼び出しを更新
6. 動作確認・テスト

### Phase 3: 日次寄附グラフ

Usecase内のprivateメソッドをドメインモデルに移動。

1. `domain/models/donation-summary.ts` を作成（型 + 純粋関数、Usecase内ロジックを移動）
2. `domain/repositories/donation-aggregation-repository.interface.ts` を作成
3. `infrastructure/repositories/` に実装を追加
4. `application/usecases/get-daily-donation-usecase.ts` を移動・修正
5. `presentation/loaders/` から呼び出しを更新
6. 動作確認・テスト

### Phase 4: 取引一覧

utils/transaction-converter.ts のロジックをドメインモデルに移動。

1. `domain/models/display-transaction.ts` を作成（型 + 純粋関数、utils から移動）
2. `domain/repositories/transaction-query-repository.interface.ts` を作成
3. `infrastructure/repositories/` に実装を追加
4. 関連Usecase（`get-transactions-by-slug-usecase.ts` 等）を移動・修正
5. `presentation/loaders/`, `presentation/actions/` から呼び出しを更新
6. 旧ファイル（`utils/transaction-converter.ts`）を削除
7. 動作確認・テスト

### Phase 5: Sankeyダイアグラム（最も複雑）

小規模項目の統合、残高・負債の追加など複雑なロジックが多いため最後に着手。
**唯一ドメインサービスが必要**。

1. `domain/models/sankey.ts` を作成（型定義 + 基本的な純粋関数）
2. `domain/services/sankey-builder.ts` を作成（`utils/sankey-category-converter.ts` から移動）
3. `domain/repositories/sankey-aggregation-repository.interface.ts` を作成
4. `infrastructure/repositories/` にSankey用のリポジトリ実装を追加
5. `application/usecases/get-sankey-aggregation-usecase.ts` を移動・修正
6. `presentation/loaders/` から呼び出しを更新
7. 旧ファイル（`utils/sankey-category-converter.ts`, `utils/sankey-id-utils.ts`）を削除
8. 動作確認・テスト

### Phase 6: クリーンアップ

1. 旧ディレクトリ（`webapp/src/server/usecases/`, `webapp/src/server/repositories/` 等）を削除
2. `webapp/src/types/` のグラフ関連型を削除（domain/models に移動済み）
3. import パスの最終確認
4. 全体の動作確認・テスト

---

## 参考: adminとの比較

| 観点 | admin | webapp (リファクタリング後) |
|---|---|---|
| BC数 | 複数 (data-import, report, auth) | 1つ (public-finance) |
| 書き込み操作 | あり | なし（読み取り専用） |
| レイヤー構造 | presentation → application → domain ↔ infrastructure | 同じ |
| ドメインモデル | ビジネスルールを持つ | 可視化ロジックを持つ |
| リポジトリ分離 | 機能ごとに分離 | 用途ごとに分離（Interface Segregation） |

---

## チェックリスト

リファクタリング実施時に確認すべき項目:

- [ ] 既存のテストが通ること
- [ ] importパスがすべて `@/` から始まる絶対パスであること
- [ ] `server-only` が適切なファイルに含まれていること
- [ ] ドメインモデルが外部依存（Prisma等）を持たないこと
- [ ] loaders/actionsがUsecaseのみを呼び出していること
