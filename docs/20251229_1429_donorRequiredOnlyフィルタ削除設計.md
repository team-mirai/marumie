# donorRequiredOnlyフィルタ削除設計

## 概要

寄付者紐付けページ（`/assign/donors`）の「寄付者紐付け対象のみ表示」チェックボックスを削除する。このフィルタは冗長であり、機能的に意味を持たないため。

## 背景

### 問題

寄付者紐付けページには「寄付者紐付け対象のみ表示」（`donorRequiredOnly`）というフィルタが存在するが、このフィルタは以下の理由で冗長である：

1. **ベースクエリで既に絞り込まれている**: `prisma-transaction-with-donor.repository.ts` の `findTransactionsWithDonors` メソッドでは、ベースクエリとして `categoryKey: { in: [...DONOR_REQUIRED_CATEGORIES] }` の条件が常に適用されている
2. **フィルタON時の条件が重複**: `requiresDonorOnly` フィルタを ON にすると、同じ条件 `categoryKey: { in: [...DONOR_REQUIRED_CATEGORIES] }` が追加されるが、これはベースクエリと完全に重複している
3. **寄附には閾値がない**: Counterpart紐付けページでは経常経費に閾値（10万円）があるため類似のフィルタに意味があるが、Donor紐付けでは全ての寄附が記載対象

つまり、このページに表示される取引はすべて `DONOR_REQUIRED_CATEGORIES` に属する取引であり、フィルタを ON にしても OFF にしても結果は変わらない。

### DONOR_REQUIRED_CATEGORIESに含まれるカテゴリ

- 個人からの寄附
- 個人からの寄附（特定寄附）
- 法人その他の団体からの寄附
- 政治団体からの寄附
- 寄附のあっせんによるもの
- 政治資金パーティーの対価に係る収入
- 政治資金パーティー対価のあっせんによるもの

## 削除対象箇所

### 1. クライアントコンポーネント

#### DonorAssignmentFilters.tsx

| 行番号 | 削除内容 |
|--------|----------|
| 18行目 | `DonorAssignmentFilterValues` インターフェースから `donorRequiredOnly: boolean;` を削除 |
| 97-106行目 | チェックボックスUI全体を削除 |

#### DonorAssignmentClient.tsx

| 行番号 | 削除内容 |
|--------|----------|
| 29行目 | `initialFilters` 型から `donorRequiredOnly` を削除 |
| 61行目 | `donorRequiredOnly` の state 定義を削除 |
| 113行目 | `buildUrl` の引数型から `donorRequired` を削除 |
| 124行目 | `searchParams.set("donorRequired", ...)` を削除 |
| 147-148行目 | `handleFilterChange` 内の `donorRequiredOnly` 処理を削除 |
| 162行目 | `buildUrl` 呼び出しから `donorRequired` 引数を削除 |
| 253行目 | `DonorAssignmentFilters` への `donorRequiredOnly` props を削除 |

### 2. サーバーコンポーネント（ページ）

#### page.tsx（/assign/donors）

| 行番号 | 削除内容 |
|--------|----------|
| 26行目 | `searchParams` 型から `donorRequired?: string;` を削除 |
| 55行目 | fallback用 `initialFilters` から `donorRequiredOnly` を削除 |
| 70行目 | `donorRequiredOnly` 変数定義を削除 |
| 84行目 | `loadTransactionsWithDonorsData` 呼び出しから `requiresDonorOnly` を削除 |
| 104行目 | `initialFilters` から `donorRequiredOnly` を削除 |

### 3. ローダー

#### transactions-with-donors-loader.ts

| 行番号 | 削除内容 |
|--------|----------|
| 29行目 | キャッシュキーから `requiresDonorOnly` を削除 |

### 4. ユースケース

#### get-transactions-with-donors-usecase.ts

| 行番号 | 削除内容 |
|--------|----------|
| 13行目 | `GetTransactionsWithDonorsInput` から `requiresDonorOnly?: boolean;` を削除 |
| 41行目 | `filters` オブジェクトから `requiresDonorOnly` を削除 |

### 5. ドメインモデル

#### transaction-with-donor.ts

| 行番号 | 削除内容 |
|--------|----------|
| 35行目 | `TransactionWithDonorFilters` から `requiresDonorOnly?: boolean;` を削除 |

### 6. インフラストラクチャ（リポジトリ）

#### prisma-transaction-with-donor.repository.ts

| 行番号 | 削除内容 |
|--------|----------|
| 39行目 | `requiresDonorOnly` の destructuring を削除 |
| 90-94行目 | `requiresDonorOnly` による条件分岐を削除 |

## 影響範囲

- `/assign/donors` ページのUIからチェックボックスが1つ削除される
- URLクエリパラメータ `donorRequired` が無効になる（既存のブックマーク等は引き続き動作するが、パラメータは無視される）
- API/データ取得ロジックの簡素化

## 削除しない箇所

以下は削除対象外：

- `donor-assignment-rules.ts` の `DONOR_REQUIRED_CATEGORIES` 定義: ベースクエリのフィルタリングに使用されているため維持
- `isDonorRequired` 関数: `TransactionWithDonor` の `requiresDonor` プロパティ算出に使用されているため維持
- `TransactionWithDonor` の `requiresDonor` プロパティ: UI表示やバリデーションで使用される可能性があるため維持

## 設計ドキュメント更新

本修正完了後、以下の設計ドキュメントを更新する：

- `docs/20251227_2135_寄付者紐付けページ設計.md`
  - 検索パラメータ表から `donorRequired` を削除
  - `TransactionWithDonorFilter` から `requiresDonorOnly` を削除
  - UI構成図から該当チェックボックスを削除
