# webapp DDD リファクタリング Phase 0・Phase 1 設計

## 目的

**開発者が**、webapp のバックエンドコードを admin と同様のアーキテクチャで理解・変更しやすくするため。

---

## ブランチ戦略

### エピックブランチの導入

全 Phase のリファクタリングは**エピックブランチ**で行い、完了後に develop にマージする。

```
develop
  └── epic/webapp-ddd-refactoring    # エピックブランチ
        ├── refactor/webapp-ddd-phase0
        ├── refactor/webapp-ddd-phase1
        ├── refactor/webapp-ddd-phase2
        └── ...
```

**理由**:
- 各 Phase の PR はエピックブランチにマージし、develop には影響を与えない
- 全 Phase 完了後にエピックブランチを develop にマージすることで、途中の不完全な状態が develop に混入しない
- レビューは各 Phase 単位で行いつつ、最終的な統合は一括で行える

### PR の流れ

1. 各 Phase のブランチを作成: `refactor/webapp-ddd-phaseN`
2. 作業完了後、エピックブランチ `epic/webapp-ddd-refactoring` に PR を作成・マージ
3. 全 Phase 完了後、エピックブランチから `develop` に PR を作成・マージ

---

## Phase 0: 基盤準備

### 0.1 概要

新しいディレクトリ構造を作成し、既存のリポジトリを移動する準備段階。

### 0.2 作成するディレクトリ構造

```
webapp/src/server/
└── contexts/
    └── public-finance/           # 唯一の Bounded Context
        ├── presentation/
        │   ├── loaders/          # 空（Phase 1 以降で移動）
        │   └── actions/          # 空（Phase 1 以降で移動）
        ├── application/
        │   └── usecases/         # 空（Phase 1 以降で移動）
        ├── domain/
        │   ├── models/           # 空（Phase 1 以降で作成）
        │   ├── services/         # 空（Phase 5 で Sankey 用に作成）
        │   └── repositories/     # リポジトリインターフェース
        └── infrastructure/
            └── repositories/     # リポジトリ実装
```

### 0.3 shared リソースの扱い

以下のファイルは `webapp/src/server/lib/` に配置したままとし、全コンテキストから参照する:

- `prisma.ts` - Prisma クライアント

**理由**: webapp は単一 BC のため、admin のような `contexts/shared/` は作成しない。

### 0.4 Phase 0 での移動対象

Phase 0 ではディレクトリ構造の作成のみ行い、**ファイルの移動は行わない**。

各ファイルは該当する Phase で移動する:
- Phase 1: 月別収支に必要なリポジトリのみ
- Phase 2〜5: 各グラフに必要なリポジトリを順次移動
- Phase 6: 旧ディレクトリを削除

**理由**: 各 Phase を独立して完結させることで、途中で中断しても整合性が保たれる。

---

## Phase 1: 月別収支グラフ

### 1.1 概要

最もシンプルな機能から着手する。ドメインロジックが少なく、Repository の SQL で完結している。

### 1.2 現状分析

**対象ファイル**:
- `usecases/get-monthly-transaction-aggregation-usecase.ts`
- `repositories/prisma-transaction.repository.ts` の `getMonthlyAggregation` メソッド

**現在のデータフロー**:
```
loader → Usecase → TransactionRepository.getMonthlyAggregation()
                 → PoliticalOrganizationRepository.findBySlugs()
```

**MonthlyAggregation 型（現在）**:
```typescript
interface MonthlyAggregation {
  yearMonth: string; // "YYYY-MM" 形式
  income: number;
  expense: number;
}
```

### 1.3 リファクタリング方針

月別収支は**ドメインロジックがほぼない**ため、以下の方針とする:

1. **ドメインモデル**: 型定義 + バリデーション関数のみ
2. **ドメインサービス**: 不要
3. **リポジトリ分離**: `IMonthlyAggregationRepository` を新設

### 1.4 新しいディレクトリ構造（Phase 1 完了後）

```
webapp/src/server/contexts/public-finance/
├── application/
│   └── usecases/
│       └── get-monthly-aggregation-usecase.ts  # 移動・リネーム
├── domain/
│   ├── models/
│   │   └── monthly-aggregation.ts           # 新規作成
│   └── repositories/
│       ├── monthly-aggregation-repository.interface.ts  # 新規作成
│       └── political-organization-repository.interface.ts  # 移動
└── infrastructure/
    └── repositories/
        ├── prisma-monthly-aggregation.repository.ts  # 新規作成
        └── prisma-political-organization.repository.ts  # 移動
```

**注**:
- `presentation/` は Phase 1 では作成しない。既存の `loaders/load-top-page.ts` から contexts 以下の UseCase を呼び出す形とする
- `ITransactionRepository` および `IBalanceSnapshotRepository` は Phase 1 では移動しない。後続の Phase で必要になった時点で移動する
- 最終 Phase で全リファクタリング完了後に `presentation/` を作成し、loader を移動する

### 1.5 Interface Segregation の適用

**現在の問題**: `ITransactionRepository` が月次集計メソッドを含む。

**対応**: 月次集計専用のインターフェースを分離する。

#### 1.5.1 新しいインターフェース

**ファイル**: `domain/repositories/monthly-aggregation-repository.interface.ts`

```typescript
export interface MonthlyAggregation {
  yearMonth: string;
  income: number;
  expense: number;
}

export interface IMonthlyAggregationRepository {
  getByOrganizationIds(
    organizationIds: string[],
    financialYear: number
  ): Promise<MonthlyAggregation[]>;
}
```

#### 1.5.2 ITransactionRepository からの削除

`ITransactionRepository` から以下のメソッドを削除:

```typescript
// 削除対象
getMonthlyAggregation(
  politicalOrganizationIds: string[],
  financialYear: number,
): Promise<MonthlyAggregation[]>;
```

### 1.6 ドメインモデル

**ファイル**: `domain/models/monthly-aggregation.ts`

型定義と純粋関数（バリデーション、計算など）を配置する。

**責務**:
- `MonthlyAggregation` 型の定義
- `yearMonth` のフォーマットバリデーション
- 収支差額の計算（必要に応じて）

### 1.7 Usecase

**ファイル**: `application/usecases/get-monthly-aggregation-usecase.ts`

**変更点**:
- `ITransactionRepository` への依存を `IMonthlyAggregationRepository` に変更
- ファイル名を `get-monthly-transaction-aggregation-usecase.ts` から `get-monthly-aggregation-usecase.ts` に変更（冗長な "transaction" を削除）

### 1.8 既存 Loader の修正

**ファイル**: `loaders/load-top-page.ts`（既存ファイルを修正）

**変更点**:
- 新しい UseCase（`contexts/public-finance/application/usecases/get-monthly-aggregation-usecase.ts`）を呼び出すように import パスを更新
- UseCase 内で新しいリポジトリ実装をインスタンス化

**注**: `presentation/loaders/` への移動は最終 Phase で行う。Phase 1 では既存の loader から contexts 以下の UseCase を参照する形に留める。

### 1.9 リポジトリ実装

**ファイル**: `infrastructure/repositories/prisma-monthly-aggregation.repository.ts`

**内容**: `PrismaTransactionRepository.getMonthlyAggregation()` のロジックを移動。

### 1.10 PrismaTransactionRepository の変更

`getMonthlyAggregation` メソッドを削除し、`ITransactionRepository` インターフェースからも削除。

### 1.11 移動・作成対象ファイル一覧

| 操作 | ファイル |
|---|---|
| 新規作成 | `contexts/public-finance/domain/models/monthly-aggregation.ts` |
| 新規作成 | `contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface.ts` |
| 移動 | `repositories/interfaces/political-organization-repository.interface.ts` → `contexts/public-finance/domain/repositories/` |
| 新規作成 | `contexts/public-finance/infrastructure/repositories/prisma-monthly-aggregation.repository.ts` |
| 移動 | `repositories/prisma-political-organization.repository.ts` → `contexts/public-finance/infrastructure/repositories/` |
| 移動・修正 | `usecases/get-monthly-transaction-aggregation-usecase.ts` → `contexts/public-finance/application/usecases/get-monthly-aggregation-usecase.ts` |
| 修正 | `loaders/load-top-page.ts`（新しい UseCase を参照するように import パス更新） |
| 修正 | `repositories/interfaces/transaction-repository.interface.ts`（`getMonthlyAggregation` メソッド削除） |
| 修正 | `repositories/prisma-transaction.repository.ts`（`getMonthlyAggregation` メソッド削除） |

**注**:
- `ITransactionRepository` と `PrismaTransactionRepository` は旧ディレクトリに残す（他の Phase で使用するため）。Phase 6 で移動する
- `presentation/loaders/` は Phase 1 では作成しない。最終 Phase で loader を移動する

### 1.12 呼び出し元の更新

`loaders/load-top-page.ts` の import パスを更新する。既存の loader ファイルの位置は変更せず、UseCase の参照先のみ contexts 以下に変更する。

---

## チェックリスト

### Phase 0 完了条件

- [ ] `contexts/public-finance/` ディレクトリ構造が作成されている
- [ ] ビルドが通る

### Phase 1 完了条件

- [ ] `IMonthlyAggregationRepository` が作成されている
- [ ] `PrismaMonthlyAggregationRepository` が作成されている
- [ ] `MonthlyAggregation` ドメインモデルが作成されている
- [ ] Usecase が新しいリポジトリに依存している
- [ ] 既存の `loaders/load-top-page.ts` が contexts 以下の UseCase を参照している
- [ ] `ITransactionRepository` から `getMonthlyAggregation` が削除されている
- [ ] すべての import パスが `@/` から始まる絶対パスである
- [ ] `server-only` が適切なファイルに含まれている
- [ ] ドメインモデルが外部依存（Prisma 等）を持たない
- [ ] 既存のテストが通る
- [ ] 月別収支グラフが正常に表示される
