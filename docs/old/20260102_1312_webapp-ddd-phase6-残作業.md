# webapp DDD リファクタリング Phase 6 残作業

## 目的

**開発者が**、webapp のバックエンドコードを admin と同様のレイヤードアーキテクチャで統一的に理解・変更しやすくするため。

Phase 1〜5 でドメインモデル・アプリケーション層・インフラストラクチャ層の移行が完了した。Phase 6 では presentation 層を作成し、旧ディレクトリを削除してリファクタリングを完了させる。

---

## 現状分析

### 完了済み（Phase 1〜5）

`contexts/public-finance/` 配下に以下が移行済み:

```
webapp/src/server/contexts/public-finance/
├── application/usecases/
│   ├── get-monthly-aggregation-usecase.ts
│   ├── get-balance-sheet-usecase.ts
│   ├── get-transactions-by-slug-usecase.ts
│   ├── get-all-transactions-by-slug-usecase.ts
│   └── get-sankey-aggregation-usecase.ts
├── domain/
│   ├── models/
│   │   ├── monthly-aggregation.ts
│   │   ├── monthly-transaction-total.ts
│   │   ├── balance-sheet.ts
│   │   ├── display-transaction.ts
│   │   ├── category-aggregation.ts
│   │   └── sankey-data.ts
│   ├── services/
│   │   └── sankey-data-builder.ts
│   └── repositories/
│       ├── monthly-aggregation-repository.interface.ts
│       ├── political-organization-repository.interface.ts
│       ├── balance-sheet-repository.interface.ts
│       └── transaction-list-repository.interface.ts
└── infrastructure/repositories/
    ├── prisma-monthly-aggregation.repository.ts
    ├── prisma-political-organization.repository.ts
    └── prisma-balance-sheet.repository.ts
```

### 未移行（Phase 6 対象）

#### 1. presentation 層（loaders / actions）

現在 `webapp/src/server/loaders/` と `webapp/src/server/actions/` に残存:

| ファイル | 役割 | 備考 |
|---|---|---|
| `loaders/load-top-page-data.ts` | トップページデータ取得 | 複数 Usecase を呼び出し |
| `loaders/load-transactions-page-data.ts` | 取引一覧ページデータ取得 | |
| `loaders/load-transactions-for-csv.ts` | CSV エクスポート用データ取得 | |
| `loaders/load-organizations.ts` | 組織一覧取得 | 直接 prisma 呼び出し |
| `loaders/constants.ts` | キャッシュ秒数定数 | |
| `actions/download-transactions-csv.ts` | CSV ダウンロード | `load-transactions-for-csv.ts` に統合 |

#### 2. 未移行の Usecases

| ファイル | 役割 | 備考 |
|---|---|---|
| `usecases/get-transactions-for-csv-usecase.ts` | CSV 用取引データ取得 | contexts 以下に移動 |
| `usecases/get-mock-transaction-page-data-usecase.ts` | モックデータ生成 | 開発用、移動または削除検討 |

#### 3. 未移行のリポジトリ

| ファイル | 役割 | 備考 |
|---|---|---|
| `repositories/prisma-transaction.repository.ts` | 取引リポジトリ実装 | 複数インターフェースを実装 |
| `repositories/prisma-balance-snapshot.repository.ts` | 残高スナップショット | Sankey で使用 |
| `repositories/interfaces/transaction-repository.interface.ts` | 取引リポジトリ IF | |
| `repositories/interfaces/balance-snapshot-repository.interface.ts` | 残高スナップショット IF | |

#### 4. 残存 utils

| ファイル | 役割 | 備考 |
|---|---|---|
| `utils/format-date.ts` | 日付フォーマット | 共有ユーティリティ |
| `utils/financial-calculator.ts` | 財務計算 | 共有ユーティリティ |

---

## Phase 6 実装タスク

### 6-1. presentation 層の作成と移動

`contexts/public-finance/presentation/loaders/` を作成し、loader を移動:

```
contexts/public-finance/presentation/
└── loaders/
    ├── load-top-page-data.ts
    ├── load-transactions-page-data.ts
    ├── load-transactions-for-csv.ts   # download-transactions-csv.ts の CSV 変換ロジックを統合
    ├── load-organizations.ts
    └── constants.ts
```

- `actions/download-transactions-csv.ts` は `load-transactions-for-csv.ts` に統合して削除
- 移動後、import パスを `@/server/contexts/public-finance/presentation/loaders/...` に更新
- 各 loader が参照する Usecase の import パスも確認・更新

### 6-2. CSV Usecase の移行

`usecases/get-transactions-for-csv-usecase.ts` を `contexts/public-finance/application/usecases/` に移動:

- ファイル移動
- import パスの更新
- loader からの参照パス更新

### 6-3. モック Usecase の移行

`usecases/get-mock-transaction-page-data-usecase.ts` を contexts 以下に移動（開発用 Usecase として維持）:

| 移動元 | 移動先 |
|---|---|
| `usecases/get-mock-transaction-page-data-usecase.ts` | `contexts/public-finance/application/usecases/get-mock-transaction-page-data-usecase.ts` |

### 6-4. リポジトリの移行

残存リポジトリを `contexts/public-finance/infrastructure/repositories/` に移動:

| 移動元 | 移動先 |
|---|---|
| `repositories/prisma-transaction.repository.ts` | `contexts/public-finance/infrastructure/repositories/prisma-transaction.repository.ts` |
| `repositories/prisma-balance-snapshot.repository.ts` | `contexts/public-finance/infrastructure/repositories/prisma-balance-snapshot.repository.ts` |
| `repositories/interfaces/transaction-repository.interface.ts` | `contexts/public-finance/domain/repositories/transaction-repository.interface.ts` |
| `repositories/interfaces/balance-snapshot-repository.interface.ts` | `contexts/public-finance/domain/repositories/balance-snapshot-repository.interface.ts` |

### 6-5. prisma.ts の移動

`lib/prisma.ts` を infrastructure に移動:

| 移動元 | 移動先 |
|---|---|
| `lib/prisma.ts` | `contexts/public-finance/infrastructure/prisma.ts` |

- loaders からのみ参照されており、loaders 移動時に合わせて参照パス更新

### 6-6. utils の移動

`utils/format-date.ts` と `utils/financial-calculator.ts` は `client/components/` と `app/` から参照される汎用ユーティリティ（server 配下からは参照なし）:

| 移動元 | 移動先 |
|---|---|
| `server/utils/format-date.ts` | `client/lib/format-date.ts` |
| `server/utils/financial-calculator.ts` | `client/lib/financial-calculator.ts` |

- テスト `tests/server/utils/` も `tests/client/lib/` に移動

### 6-7. 旧ディレクトリの削除

すべての移行完了後、空になったディレクトリを削除:

- `webapp/src/server/usecases/`
- `webapp/src/server/repositories/`
- `webapp/src/server/loaders/`
- `webapp/src/server/actions/`
- `webapp/src/server/utils/`
- `webapp/src/server/lib/`

### 6-8. import パスの最終確認

全ファイルの import パスが以下のルールに従っているか確認:

- すべて `@/` から始まる絶対パス
- contexts 外からは `@/server/contexts/public-finance/...` で参照
- `server-only` が適切に含まれている

---

## 最終ディレクトリ構造

```
webapp/src/server/
└── contexts/
    └── public-finance/
        ├── presentation/
        │   └── loaders/
        │       ├── load-top-page-data.ts
        │       ├── load-transactions-page-data.ts
        │       ├── load-transactions-for-csv.ts
        │       ├── load-organizations.ts
        │       └── constants.ts
        ├── application/
        │   └── usecases/
        │       ├── get-monthly-aggregation-usecase.ts
        │       ├── get-balance-sheet-usecase.ts
        │       ├── get-transactions-by-slug-usecase.ts
        │       ├── get-all-transactions-by-slug-usecase.ts
        │       ├── get-sankey-aggregation-usecase.ts
        │       ├── get-transactions-for-csv-usecase.ts
        │       └── get-mock-transaction-page-data-usecase.ts
        ├── domain/
        │   ├── models/
        │   ├── services/
        │   └── repositories/
        │       ├── monthly-aggregation-repository.interface.ts
        │       ├── political-organization-repository.interface.ts
        │       ├── balance-sheet-repository.interface.ts
        │       ├── transaction-list-repository.interface.ts
        │       ├── transaction-repository.interface.ts
        │       └── balance-snapshot-repository.interface.ts
        └── infrastructure/
            ├── prisma.ts
            └── repositories/
                ├── prisma-monthly-aggregation.repository.ts
                ├── prisma-political-organization.repository.ts
                ├── prisma-balance-sheet.repository.ts
                ├── prisma-transaction.repository.ts
                └── prisma-balance-snapshot.repository.ts
```

---

## チェックリスト

- [ ] presentation 層ディレクトリ作成
- [ ] loaders 移動と import パス更新
- [ ] download-transactions-csv を load-transactions-for-csv に統合
- [ ] get-transactions-for-csv-usecase 移動
- [ ] get-mock-transaction-page-data-usecase 移動
- [ ] prisma-transaction.repository 移動
- [ ] prisma-balance-snapshot.repository 移動
- [ ] リポジトリインターフェース移動
- [ ] prisma.ts を infrastructure に移動
- [ ] utils を client/lib に移動
- [ ] 旧ディレクトリ削除
- [ ] App Router からの参照パス更新確認
- [ ] 全テスト通過確認
- [ ] ビルド成功確認
- [ ] server-only 確認
