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

各グラフ（可視化機能）は独自の**ドメインモデル**を持つ。これにより:
- グラフ固有のビジネスロジックが明確に分離される
- テストが書きやすくなる
- 変更の影響範囲が限定される

**ドメインサービスの判断基準**:
- 単一エンティティのロジック → **ドメインモデル**の純粋関数
- 複数エンティティにまたがる複雑な変換 → **ドメインサービス**

現状の分析では、Sankey以外はドメインモデルで十分。

---

## 対象とするグラフ/機能

| グラフ/機能 | 現状のUsecase | 現状のロジック配置 | ドメインサービス |
|---|---|---|---|
| 月別収支グラフ | `GetMonthlyTransactionAggregationUsecase` | Repository内 | 不要 |
| 貸借対照表 | `GetBalanceSheetUsecase` | Usecase内 | 不要 |
| 日次寄附グラフ | `GetDailyDonationUsecase` | Usecase内 | 不要 |
| 取引一覧 | `GetTransactionsBySlugUsecase` | `utils/transaction-converter.ts` | 不要 |
| Sankeyダイアグラム | `GetSankeyAggregationUsecase` | `utils/sankey-category-converter.ts` | **必要** |

---

## 新しいディレクトリ構造

```
webapp/src/server/
├── contexts/
│   └── public-finance/           # 唯一のBounded Context
│       ├── presentation/         # Phase 6 で作成（最後に移行）
│       │   ├── loaders/          # 現在の loaders/ から移動
│       │   └── actions/          # 現在の actions/ から移動
│       ├── application/
│       │   └── usecases/         # 現在の usecases/
│       ├── domain/
│       │   ├── models/           # グラフごとのドメインモデル（型 + 純粋関数）
│       │   ├── services/         # 複雑な変換ロジックのみ（Sankeyのみ）
│       │   └── repositories/     # リポジトリインターフェース
│       └── infrastructure/
│           └── repositories/     # リポジトリ実装
├── loaders/                      # Phase 1〜5 では既存の位置のまま
├── actions/                      # Phase 1〜5 では既存の位置のまま
└── lib/
    └── prisma.ts                 # Prismaクライアント（shared相当）
```

**注**: Phase 1〜5 では `presentation/` は作成せず、既存の `loaders/` `actions/` から contexts 以下の UseCase を参照する形とする。Phase 6 で `presentation/` に移動する。

---

## リポジトリの扱い

### 現状の問題

`ITransactionRepository` が以下の責務を持ちすぎている:
- 基本的なCRUD
- Sankey用集計
- 月次集計
- 日次寄附集計
- 借入金・負債計算

### 方針: Interface Segregationを適用

用途ごとにインターフェースを分離する。実装は単一クラスのままで、複数のインターフェースを実装する形にする。

Usecaseは必要なインターフェースのみに依存することで、依存関係が明確になる。

詳細は各Phase実施時に設計する。

---

## 移行計画

**方針: グラフ単位で縦に移行する**

レイヤー単位（横）ではなく、グラフ単位（縦）で移行する。これにより:
- 1つのグラフを完全にDDD化してから次に進むので、動作確認がしやすい
- 途中で中断しても、完了したグラフは新構造、未着手は旧構造で共存できる
- PRのレビューも「月別収支のリファクタリング」のように責務が明確

**各Phaseの詳細設計は、実施時に別途行う。**

### ブランチ戦略

**エピックブランチ**を導入し、全リファクタリング完了後に develop にマージする:

```
develop
  └── epic/webapp-ddd-refactoring    # エピックブランチ
        ├── refactor/webapp-ddd-phase0
        ├── refactor/webapp-ddd-phase1
        └── ...
```

- 各 Phase の PR はエピックブランチにマージ
- 全 Phase 完了後にエピックブランチから develop へマージ
- 途中の不完全な状態が develop に混入しない

### presentation レイヤーの方針

**Phase 1〜5 では presentation は作成しない**。既存の `loaders/` から contexts 以下の UseCase を参照する形とする。

- 各 Phase では application/domain/infrastructure のみ移行
- 既存の loader ファイルは位置を変えず、UseCase の参照先のみ contexts 以下に更新
- **最終 Phase（Phase 6）で presentation を作成**し、loader/action を移動する

**理由**: 全リファクタリングが完了するまで loader の位置は変更せず、段階的に依存先を切り替えることで安定性を保つ。

### Phase 0: 基盤準備

ディレクトリ構造の作成と共通リポジトリの移動。

### Phase 1: 月別収支グラフ（最もシンプル）

現状ほぼRepositoryのSQLで完結しており、ドメインロジックが少ないため最初に着手。

### Phase 2: 貸借対照表

Usecase内の計算ロジックをドメインモデルに移動。

### Phase 3: 日次寄附グラフ

Usecase内のprivateメソッドをドメインモデルに移動。

### Phase 4: 取引一覧

`utils/transaction-converter.ts` のロジックをドメインモデルに移動。

### Phase 5: Sankeyダイアグラム（最も複雑）

小規模項目の統合、残高・負債の追加など複雑なロジックが多いため最後に着手。
**唯一ドメインサービスが必要**。

### Phase 6: presentation 移行とクリーンアップ

- `presentation/loaders/` と `presentation/actions/` を作成
- 既存の `loaders/` `actions/` を contexts 以下に移動
- 旧ディレクトリの削除と import パスの最終確認

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
