# SankeyダイアグラムDDDリファクタリング実装設計（Phase 5）

## 目的

**開発者が**、Sankeyダイアグラム関連のコードを理解・変更しやすくするため。

現状の課題:
- `utils/sankey-category-converter.ts` に複雑な変換ロジックが集中している
- 複数の関数が連鎖的に呼び出され、データの流れが追いにくい
- ドメイン知識（小規模項目統合、残高調整など）がユーティリティに埋もれている

---

## 対象範囲

webapp側のSankeyダイアグラム関連コードを、DDDレイヤードアーキテクチャに則って整理する。

**対象ファイル**:
- `webapp/src/server/usecases/get-sankey-aggregation-usecase.ts`
- `webapp/src/server/lib/utils/sankey-category-converter.ts`
- `webapp/src/types/sankey.ts`

**対象外**:
- リポジトリ層（既にインターフェース分離済み）
- UIコンポーネント

---

## 設計方針

### 全体アプローチ

webapp側には既に `contexts/public-finance/` が存在し、DDDレイヤードアーキテクチャが適用されている。Sankeyダイアグラム関連コードも同じ `public-finance` コンテキスト内に整理する（Sankeyダイアグラムは政治資金の可視化であり、public-financeドメインの一部）。

### レイヤー構造

既存の `public-finance` コンテキストに追加:

```
webapp/src/server/contexts/public-finance/
├── application/
│   └── usecases/
│       ├── get-monthly-aggregation-usecase.ts  # 既存
│       └── get-sankey-aggregation-usecase.ts   # 追加
├── domain/
│   ├── models/
│   │   ├── monthly-aggregation.ts       # 既存
│   │   ├── monthly-transaction-total.ts # 既存
│   │   ├── sankey-data.ts               # 追加
│   │   └── category-aggregation.ts      # 追加
│   ├── repositories/
│   │   ├── monthly-aggregation-repository.interface.ts    # 既存
│   │   └── political-organization-repository.interface.ts # 既存
│   └── services/
│       └── sankey-data-builder.ts   # 追加
└── infrastructure/
    └── repositories/
        ├── prisma-monthly-aggregation.repository.ts    # 既存
        └── prisma-political-organization.repository.ts # 既存
```

---

## ドメインモデル設計

### SankeyData（`domain/models/sankey-data.ts`）

Sankeyダイアグラムの最終出力を表現するモデル。

```typescript
// 型定義
export interface SankeyNode {
  id: string;
  label?: string;
  nodeType?: SankeyNodeType;
}

export type SankeyNodeType = "income" | "income-sub" | "total" | "expense" | "expense-sub";

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalLatestBalance?: number;
}

// ドメインロジック
export const SankeyData = {
  empty(): SankeyData {
    return { nodes: [], links: [] };
  },
};
```

### CategoryAggregation（`domain/models/category-aggregation.ts`）

リポジトリから取得したカテゴリ別集計データを表現するモデル。

```typescript
// 型定義
export interface CategoryAggregationItem {
  category: string;
  subcategory?: string;
  totalAmount: number;
}

export interface CategoryAggregation {
  income: CategoryAggregationItem[];
  expense: CategoryAggregationItem[];
}

// ドメインロジック
export const CategoryAggregation = {
  /**
   * 「その他」カテゴリを「その他の収入」「その他の支出」にリネーム
   * 収入と支出で同じラベルだとSankeyノードが区別できないため
   */
  renameOtherCategories(data: CategoryAggregation): CategoryAggregation { /* ... */ },

  /**
   * 小規模項目を「その他（カテゴリ名）」に統合
   * friendly-categoryモードでサブカテゴリが多すぎる場合に適用
   */
  consolidateSmallItems(
    data: CategoryAggregation,
    options: { targetMaxCount: number }
  ): CategoryAggregation { /* ... */ },

  /**
   * 残高情報を収入・支出データに追加
   */
  adjustWithBalance(
    data: CategoryAggregation,
    balance: BalanceInfo,
    options: { isFriendlyCategory: boolean }
  ): CategoryAggregation { /* ... */ },
};
```

### BalanceInfo（補助型）

残高情報を表現する値オブジェクト。

```typescript
export interface BalanceInfo {
  previousYearBalance: number;
  currentYearBalance: number;
  liabilityBalance: number;
}
```

---

## ドメインサービス設計

### SankeyDataBuilder（`domain/services/sankey-data-builder.ts`）

CategoryAggregationからSankeyDataを構築するドメインサービス。

**責務**:
- ノード生成（収入サブカテゴリ、収入カテゴリ、合計、支出カテゴリ、支出サブカテゴリ）
- リンク生成（サブカテゴリ→カテゴリ、カテゴリ→合計、合計→カテゴリ、カテゴリ→サブカテゴリ）
- 収支バランス調整（差額を「(仕訳中)」ノードとして追加）
- Safari互換ID生成

```typescript
export class SankeyDataBuilder {
  /**
   * CategoryAggregationからSankeyDataを構築
   */
  build(aggregation: CategoryAggregation): SankeyData { /* ... */ }
}
```

**内部処理の流れ**:

1. 収入サブカテゴリノードを生成し、カテゴリ別合計を計算
2. 収入カテゴリノードを生成
3. 中央の「合計」ノードを生成
4. 収支バランスを確認し、収入 > 支出なら「(仕訳中)」を追加
5. 支出カテゴリノードを生成
6. 支出サブカテゴリノードを生成
7. 全リンクを生成
8. SankeyDataを返す

**Safari互換ID生成**:

日本語を含むノードIDはSafariで問題が発生するため、ハッシュ化が必要。この処理はSankeyDataBuilder内部で行う。

```typescript
// 内部ヘルパー
function createSafariCompatibleId(originalId: string): string {
  return originalId.replace(/[^a-zA-Z0-9\-_]/g, (match) => {
    return `_${generateHash(match)}`;
  });
}
```

---

## Usecase設計

### GetSankeyAggregationUsecase（`application/usecases/get-sankey-aggregation-usecase.ts`）

**責務**: データ取得のオーケストレーションと変換処理の呼び出し

```typescript
export interface GetSankeyAggregationParams {
  slugs: string[];
  financialYear: number;
  categoryType?: "political-category" | "friendly-category";
}

export interface GetSankeyAggregationResult {
  sankeyData: SankeyData;
}

export class GetSankeyAggregationUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
    private balanceSnapshotRepository: IBalanceSnapshotRepository,
  ) {}

  async execute(params: GetSankeyAggregationParams): Promise<GetSankeyAggregationResult> {
    // 1. 政治団体を取得
    const organizations = await this.politicalOrganizationRepository.findBySlugs(params.slugs);
    if (organizations.length === 0) {
      throw new Error("政治団体が見つかりません");
    }

    const orgIds = organizations.map(org => org.id);
    const isFriendlyCategory = params.categoryType === "friendly-category";

    // 2. データを並列取得
    const [rawAggregation, balances, liabilityBalance] = await Promise.all([
      this.transactionRepository.getCategoryAggregationForSankey(orgIds, params.financialYear, params.categoryType),
      this.balanceSnapshotRepository.getTotalLatestBalancesByYear(orgIds, params.financialYear),
      this.transactionRepository.getLiabilityBalance(orgIds, params.financialYear),
    ]);

    // 3. ドメインモデルで変換処理
    let aggregation = CategoryAggregation.renameOtherCategories(rawAggregation);

    if (isFriendlyCategory) {
      aggregation = CategoryAggregation.consolidateSmallItems(aggregation, { targetMaxCount: 8 });
    }

    aggregation = CategoryAggregation.adjustWithBalance(
      aggregation,
      {
        previousYearBalance: balances.previousYear,
        currentYearBalance: balances.currentYear,
        liabilityBalance,
      },
      { isFriendlyCategory }
    );

    // 4. ドメインサービスでSankeyDataを構築
    const builder = new SankeyDataBuilder();
    const sankeyData = builder.build(aggregation);

    return { sankeyData };
  }
}
```

---

## 移行計画

### Step 1: ドメインモデルの作成

1. `webapp/src/server/contexts/public-finance/domain/models/sankey-data.ts` を作成
2. `webapp/src/server/contexts/public-finance/domain/models/category-aggregation.ts` を作成
3. 既存の `webapp/src/types/sankey.ts` から型定義を移動

### Step 2: ドメインサービスの作成

1. `webapp/src/server/contexts/public-finance/domain/services/sankey-data-builder.ts` を作成
2. 既存の `sankey-category-converter.ts` からノード・リンク生成ロジックを移植

### Step 3: Usecaseの移行

1. `webapp/src/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase.ts` を作成
2. 既存Usecaseのロジックを新構造に移植
3. ドメインモデル・サービスを使用するよう書き換え

### Step 4: 既存コードの削除と参照更新

1. loaders（`load-top-page-data.ts`）のimportパスを更新
2. 既存ファイルを削除:
   - `webapp/src/server/usecases/get-sankey-aggregation-usecase.ts`
   - `webapp/src/server/lib/utils/sankey-category-converter.ts`
   - `webapp/src/types/sankey.ts`（型定義移動済みの場合）

### Step 5: テストの移行

1. 既存のリグレッションテストが通ることを確認
2. 必要に応じてテストのimportパスを更新

---

## ディレクトリ構造（最終形）

```
webapp/src/server/contexts/public-finance/
├── application/
│   └── usecases/
│       ├── get-monthly-aggregation-usecase.ts  # 既存
│       └── get-sankey-aggregation-usecase.ts   # 追加
├── domain/
│   ├── models/
│   │   ├── monthly-aggregation.ts       # 既存
│   │   ├── monthly-transaction-total.ts # 既存
│   │   ├── sankey-data.ts               # 追加
│   │   └── category-aggregation.ts      # 追加
│   ├── repositories/                    # 既存
│   └── services/
│       └── sankey-data-builder.ts       # 追加
└── infrastructure/
    └── repositories/                    # 既存
```

**注意**:
- Infrastructure層は既存のリポジトリ（`webapp/src/server/repositories/`）をそのまま使用
- Presentation層（loaders）も既存のまま、importパスのみ更新

---

## 型定義の配置

### 公開型（UIコンポーネントからも参照可能）

`webapp/src/types/sankey.ts` は残し、ドメインモデルからre-exportする形を取る。

```typescript
// webapp/src/types/sankey.ts
export type { SankeyData, SankeyNode, SankeyLink, SankeyNodeType } from "@/server/contexts/public-finance/domain/models/sankey-data";
```

これにより、既存のUIコンポーネントの参照パスを変更せずに済む。

---

## リポジトリインターフェースについて

既存のリポジトリインターフェース（`ITransactionRepository`, `IBalanceSnapshotRepository`）はそのまま使用する。

Sankey専用のインターフェース分離（Interface Segregation）は、現時点では行わない。理由:
- 既存インターフェースで必要なメソッドが定義済み
- Sankey専用に分離するほどメソッド数が多くない
- 将来的に必要になれば、その時点で分離を検討

---

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `webapp/src/server/loaders/load-top-page-data.ts` | importパスの更新 |
| `webapp/src/server/usecases/get-sankey-aggregation-usecase.ts` | 削除（移行後） |
| `webapp/src/server/lib/utils/sankey-category-converter.ts` | 削除（移行後） |
| `webapp/src/types/sankey.ts` | re-export形式に変更 |
| `webapp/tests/server/usecases/get-sankey-aggregation-usecase.test.ts` | importパスの更新 |
| `webapp/tests/server/usecases/get-sankey-aggregation-usecase.regression.test.ts` | importパスの更新 |

---

## テスト戦略

### 既存テストの活用

リグレッションテスト（`get-sankey-aggregation-usecase.regression.test.ts`）が既に存在するため、リファクタリング後も同じ入出力であることを保証できる。

### 新規テストの追加

ドメインモデルのメソッドに対して、個別のユニットテストを追加する:

- `CategoryAggregation.renameOtherCategories` のテスト
- `CategoryAggregation.consolidateSmallItems` のテスト
- `CategoryAggregation.adjustWithBalance` のテスト
- `SankeyDataBuilder.build` のテスト

---

## チェックリスト

リファクタリング完了時に確認すべき項目:

- [ ] 既存のリグレッションテストがすべてパスする
- [ ] ドメインモデルに `server-only` を含めていない（UIから参照可能にするため）
- [ ] Usecase は Constructor Injection を使用している
- [ ] ドメイン層は Infrastructure 層に直接依存していない
- [ ] 既存の型定義（`webapp/src/types/sankey.ts`）は re-export 形式で維持
