# admin アーキテクチャガイド

## 1. 目的と方針

### 1.1 なぜアーキテクチャを統一するのか
1. **保守性・可読性の向上**: 統一されたパターンにより、コードの理解と変更が容易になる
2. **AI実装のガードレール**: 言語化されたルールにより、AIが一貫性のあるコードを生成できる
3. **効率的なコードレビュー**: 明確な基準により、議論のコストを削減し本質的な問題に集中できる
4. **コンテキスト間の独立性**: Bounded Contextパターンにより、各ドメインが独立して進化できる

### 1.2 アーキテクチャ方針
1. **Bounded Context による分離**: 各ドメイン（data-import, report, auth）を明確に分離し、共通部分はsharedコンテキストで提供
2. **レイヤードアーキテクチャ**: presentation → application → domain ↔ infrastructure の明確な責務分離
3. **依存性逆転の原則**: ドメイン層はインフラストラクチャに依存せず、インターフェースを通じて抽象化
4. **Next.js App Router との統合**: loaders/actionsを通じたキャッシング戦略とサーバーコンポーネント最適化

---

## 2. Bounded Context 設計

### 2.1 コンテキスト一覧

| コンテキスト | 責務 |
|---|---|
| **data-import** | MFクラウドCSVインポート、取引データプレビュー |
| **report** | 政治資金報告書XML生成、Counterpart（取引先）管理 |
| **auth** | 認証・認可、ユーザー管理 |
| **shared** | 全コンテキスト共通の基盤（Transaction, PoliticalOrganization等） |

> **注意**: auth コンテキストは歴史的な経緯により、本ガイドで定めるレイヤー分割（presentation / application / domain / infrastructure）が適用されていない。新規実装時はレイヤー構造に準拠することが望ましいが、既存コードとの整合性を優先すること。

### 2.2 コンテキスト間の依存ルール

```
✓ 許可される依存:
  - data-import → shared
  - report → shared
  - auth → shared

✗ 禁止される依存:
  - data-import → report
  - report → data-import
  - auth → data-import, report
  - shared → 任意のコンテキスト
```

**原則**: コンテキスト間の直接依存は禁止。shared を経由すること。

---

## 3. レイヤー設計

### 3.1 レイヤー構造

各Bounded Context は以下の4層構造を持つ：

```
contexts/{コンテキスト名}/
├── presentation/       # プレゼンテーション層
│   ├── loaders/       # サーバーサイドデータ取得
│   ├── actions/       # サーバーアクション（副作用処理）
│   └── schemas/       # バリデーションスキーマ（Zod等）
├── application/       # アプリケーション層
│   ├── usecases/      # ビジネスロジックのオーケストレーション
│   └── services/      # アプリケーションサービス
├── domain/            # ドメイン層
│   ├── models/        # ドメインモデル
│   ├── services/      # ドメインサービス
│   └── repositories/  # リポジトリインターフェース
└── infrastructure/    # インフラストラクチャ層
    ├── repositories/  # リポジトリ実装（Prisma等）
    └── (外部連携)     # mf/, llm/ など
```

### 3.2 レイヤー間の依存ルール

```
✓ 許可される依存:
  - Presentation → Application
  - Presentation → Infrastructure（リポジトリ実装をインスタンス化するため）
  - Application → Domain（インターフェースのみ）
  - Application → Infrastructure（外部サービスのみ）
  - Infrastructure → Domain（インターフェース実装のため）
  - Domain → Domain（同一コンテキスト内のみ）

✗ 禁止される依存:
  - Domain → Application
  - Domain → Presentation
  - Domain → Infrastructure（直接実装への依存）
  - Infrastructure → Application
```

### 3.2.1 クライアント層（UI）からの依存ルール

`client/` 配下のUIコンポーネントからサーバー層への依存には以下のルールを適用する：

```
✓ 許可される依存:
  - Client → Presentation（actions/schemas/typesの呼び出し・型参照）
  - Client → Domain（models の型参照のみ）

✗ 禁止される依存:
  - Client → Infrastructure（型参照も含めて禁止）
  - Client → Application（型参照も含めて禁止）
  - Presentation → Client（型参照も含めて禁止）
```

**理由**:
- **Domain層の型参照が許容される理由**: ドメインモデルはビジネス概念を表現しており、UIでも同じ概念を扱う必要がある。型の二重定義は保守コストを増大させる。
- **Infrastructure層が禁止される理由**: 外部サービスの実装詳細（LLMレスポンス形式、Prisma型等）はUIから隠蔽すべき。変更時の影響範囲を限定するため、Presentation層の`types/`で型を定義しClientからimportする。
- **Application層が禁止される理由**: Usecase/Serviceの戻り値型はPresentation層で変換してUIに渡すべき。loaders経由でデータ取得する設計を維持するため。
- **Presentation → Client が禁止される理由**: 依存の方向は常にClient → Serverであるべき。Presentation層がClient層の型に依存すると、レイヤー間の依存関係が逆転する。

### 3.3 各レイヤーの責務

| レイヤー | 責務 | 禁止事項 |
|---|---|---|
| **Presentation** | リクエスト/レスポンス変換、キャッシング、Usecaseの呼び出し | ビジネスロジック、複雑な条件分岐、直接的なPrismaクエリ |
| **Application** | ビジネスロジックのオーケストレーション、トランザクション管理 | レスポンスのシリアライズ、直接的なPrismaクライアント使用、ドメインルールの実装 |
| **Domain** | ビジネスルール、ドメインモデル、データアクセスの抽象化 | データ永続化、外部API呼び出し、アプリケーション固有のロジック |
| **Infrastructure** | データアクセス、外部API連携、Prisma型↔Domain型のマッピング | ビジネスロジック、ドメインルール |

---

## 4. 実装ルール

### 4.1 Presentation層（loaders / actions）

#### loaders
- **責務**: サーバーコンポーネントからのデータ取得、キャッシング
- **実装**: `unstable_cache` でラップし、リポジトリとUsecaseを組み立てる
- **キャッシュキー**: 明示的に指定する

#### actions
- **責務**: フォーム送信、データ更新、バリデーション、キャッシュ無効化
- **実装**: `"use server"` ディレクティブ、Usecase実行後に `revalidateTag`/`revalidatePath` を呼ぶ
- **エラー**: ユーザーフレンドリーなメッセージに変換して返す

### 4.2 Application層（usecases / services）

#### Usecases
- **責務**: 複数のリポジトリ/ドメインサービスを協調させる
- **実装**: Constructor Injection でインターフェースに依存
- **パターン**:
  - CRUD単一操作: パラメータ正規化 + リポジトリ呼び出し
  - 複数ステップ: CSVロード → 変換 → バリデーション → 統計計算
  - バリデーション＋永続化: 分類 → bulk操作 → キャッシュ無効化
- **エラー**: 詳細なエラーメッセージでラップして投げる

#### Application Services（オプション）
- **責務**: ドメインロジックに直接依存しない、アプリケーション層の処理のカプセル化
- **特徴**: ビジネスルール（ドメイン知識）ではなく、技術的な処理や手続き的なロジックを扱う
- **使用判断**:
  - ✓ 複数のリポジトリからデータを取得して組み立てる（Assemblerパターン）
  - ✓ スコアリング・推薦などのアルゴリズム（ビジネスルールではない）
  - ✓ Strategyパターンなど、アルゴリズムの切り替えが必要な場合
  - ✗ ビジネスルール・ドメイン知識に基づく処理（→ Domain Service へ）
  - ✗ 単純なデータ取得（→ Usecase から直接 Repository 呼び出し）
- **実装**: クラスベース、Constructor Injectionで依存を受け取る
- **例**:
  - `ExpenseAssembler`: 複数リポジトリから機械的にデータを組み立て
  - `CounterpartSuggester`: 使用頻度・名前マッチングによるスコアリング（ドメイン知識ではなく技術的なアルゴリズム）

### 4.3 Domain層

#### Models（ドメインモデル）
- **責務**: 単一エンティティのビジネスルール、値の検証、ドメインロジック
- **実装パターン**: `namespace + interface` パターン
- **例**: ハッシュ生成、会計年度計算、型変換、バリデーション

#### Domain Services
- **使用判断**:
  - ✓ 複数エンティティにまたがるロジック
  - ✓ 外部データとの照合・比較
  - ✓ ビジネスルールの集約（報告書仕様など）
  - ✗ 単一エンティティのロジック（→ Domain Model へ）
- **実装**: クラスまたは関数ベース
- **禁止**: 直接的なModelアクセス、トランザクション管理、外部API呼び出し

#### Repository Interface
- **配置**: Domain層（dependency inversion）
- **原則**:
  - Interface Segregation: 用途ごとにインターフェース分離
  - 複雑なクエリは専用メソッドとして定義（generic な `find` に集約しない）
  - **必要なクエリのみを実装**: 汎用的な`find`や`create`は実装しない。実際に使うクエリだけを定義する
  - フィルタ型を明示的に定義

### 4.4 Infrastructure層

#### Repository Implementation
- **責務**: Prismaを使った実際のデータアクセス、Prisma型 ↔ Domain型のマッピング

#### External Services
- **責務**: 外部API呼び出し、エラーハンドリング、タイムアウト管理
- **原則**: インターフェースを実装し、ベストエフォートで動作（失敗してもUsecaseを失敗させない）

---

## 5. 実装判断フローチャート

### 5.1 ロジックの配置判断

```
ロジックを実装する必要がある
  └─ ドメインロジック（ビジネスルール・ドメイン知識）？
      ├─ Yes → 単一エンティティのロジック？
      │   ├─ Yes → Domain Model に実装
      │   └─ No → 複数エンティティにまたがる or 外部データとの照合？
      │       └─ Yes → Domain Service に実装
      └─ No（技術的な処理・手続き的なロジック）→ 複数リポジトリの組み立て or アルゴリズムのカプセル化？
          ├─ Yes → Application Service に実装
          └─ No → Usecase に実装（オーケストレーション）
```

### 5.2 判断例

| ロジック | 実装場所 | 理由 |
|---|---|---|
| トランザクションのハッシュ生成 | Domain Model | 単一エンティティ内のロジック |
| 会計年度の計算 | Domain Model | 単一エンティティ内のロジック |
| Counterpart名のバリデーション | Domain Model | 単一エンティティ内のロジック |
| トランザクションの重複チェック | Domain Service | 既存データとの照合が必要 |
| Counterpart必須判定ルール | Domain Service | 政治資金報告書仕様の集約 |
| 寄付データの組み立て | Application Service | 複数リポジトリからデータ取得・組み立て |
| Counterpart推薦アルゴリズム | Application Service | 複雑なスコアリング・Strategyパターン |
| CSV → PreviewTransaction変換 | Infrastructure | 外部形式との連携 |
| トランザクション一括保存 | Usecase | オーケストレーション |

---

## 6. コーディング規約

### 6.1 Dependency Injection

- **Usecase**: Constructor Injection でインターフェースに依存
- **loaders**: 関数内でインスタンス化（DIコンテナを使わないシンプルなDI）
- **actions**: モジュールレベルでシングルトン化（パフォーマンス最適化）

### 6.3 エラーハンドリング

| 層 | エラーハンドリング |
|---|---|
| **Presentation** | ユーザーフレンドリーなメッセージに変換（`{ ok: false, error: "..." }`） |
| **Application** | 詳細なエラーメッセージでラップ（`throw new Error(\`Failed to ...: ${error.message}\`)`) |
| **Domain** | ビジネスルールエラーを返す（`{ status: "invalid", errors: [...] }`） |
| **Infrastructure** | 技術的なエラーを投げる（`throw new Error("Database connection failed")`） |

### 6.4 キャッシング

- **loaders**: `unstable_cache` でラップ、キャッシュキーとtagsを明示
- **actions**: 処理成功後に `revalidateTag`/`revalidatePath` で無効化
- **外部キャッシュ**: インターフェース経由でベストエフォート無効化

---

## 7. チェックリスト

新しい機能を実装する際は、以下を確認：

### レイヤー分離
- [ ] Presentation層はUsecaseのみを呼び出し、ビジネスロジックを含んでいない
- [ ] Application層（Usecase）はリポジトリインターフェースに依存し、実装クラスに依存していない
- [ ] Domain層は他のレイヤーに依存していない
- [ ] Infrastructure層はドメインインターフェースを実装している

### Bounded Context
- [ ] コンテキスト間で直接依存していない（shared経由のみ）
- [ ] ドメインモデルが適切なコンテキストに配置されている

### 依存性逆転
- [ ] Repositoryインターフェースはdomain層に配置されている
- [ ] Repository実装はinfrastructure層に配置されている

### Domain Model
- [ ] ビジネスルールはドメインモデルに実装されている
- [ ] 単一エンティティのロジックはDomain Modelに、複数エンティティのロジックはDomain Serviceに分けられている

### キャッシング
- [ ] loadersで`unstable_cache`を使用している
- [ ] actionsで適切に`revalidateTag`/`revalidatePath`を呼び出している
- [ ] 外部キャッシュの無効化はインターフェース経由で行っている

### テスタビリティ
- [ ] UsecaseはConstructor Injectionを使用している
- [ ] インターフェースを通じて依存を注入できる

---

## 8. よくある質問

**Q: Repositoryインターフェースはどこに配置すべきか?**
A: Domain層。依存性逆転の原則により、実装はInfrastructure層。

**Q: ドメインサービス、アプリケーションサービス、Usecaseの違いは?**
A:
- **ドメインサービス**: ビジネスルール・ドメイン知識に基づくロジック。複数エンティティにまたがる処理。
- **アプリケーションサービス**: ドメインロジックに直接依存しない技術的な処理（データ組み立て、スコアリングアルゴリズム等）。
- **Usecase**: リポジトリやサービスを組み合わせるオーケストレーション。1つのユースケースを実現。

**Q: 複数のコンテキストで同じエンティティを使いたい場合は?**
A: sharedコンテキストに配置する（例: Transaction, PoliticalOrganization）。

**Q: loaders は必須か?**
A: 必須。loaders/actionsがDI層（依存注入の組み立て層）としての役割を果たしている。UIコンポーネント（サーバーコンポーネント含む）から直接Usecaseやリポジトリを呼び出すことは禁止。必ずloaders/actionsを経由すること。

---

## まとめ

このアーキテクチャは以下の原則に基づく：

1. **Bounded Contextによる分離**: 各ドメインを独立させ、共通部分はsharedで管理
2. **レイヤードアーキテクチャ**: presentation → application → domain ↔ infrastructure
3. **依存性逆転の原則**: ドメイン層がインフラストラクチャに依存しない
4. **テスタビリティ**: インターフェース経由のDIで、モックを注入しやすい設計
5. **Next.js最適化**: loaders/actionsでキャッシング戦略を統一

これらの原則を守ることで、保守性・拡張性・テスタビリティの高いアプリケーションを構築できる。
