# バックエンドアーキテクチャガイド

## 1. 目的と方針

### 1.1 なぜアーキテクチャを統一するのか
1. **保守性・可読性の向上**: 統一されたパターンにより、コードの理解と変更が容易になる
2. **AI実装のガードレール**: 言語化されたルールにより、AIが一貫性のあるコードを生成できる
3. **効率的なコードレビュー**: 明確な基準により、議論のコストを削減し本質的な問題に集中できる
4. **コンテキスト間の独立性**: Bounded Contextパターンにより、各ドメインが独立して進化できる

### 1.2 アーキテクチャ方針
1. **Bounded Context による分離**: 各ドメインを明確に分離し、共通部分はsharedコンテキストで提供
2. **レイヤードアーキテクチャ**: presentation → application → domain ↔ infrastructure の明確な責務分離
3. **依存性逆転の原則**: ドメイン層はインフラストラクチャに依存せず、インターフェースを通じて抽象化
4. **Next.js App Router との統合**: loaders/actionsを通じたキャッシング戦略とサーバーコンポーネント最適化

---

## 2. Bounded Context 設計

### 2.1 コンテキスト一覧

| アプリ | コンテキスト | 責務 |
|--------|-------------|------|
| webapp | **public-finance** | 政治資金データの公開・可視化 |
| admin | **data-import** | MFクラウドCSVインポート、取引データプレビュー |
| admin | **report** | 政治資金報告書XML生成、Counterpart（取引先）管理 |
| admin | **auth** | 認証・認可、ユーザー管理 |
| 共通 | **shared** | 全コンテキスト共通の基盤（Transaction, PoliticalOrganization等） |

### 2.2 コンテキスト間の依存ルール

```
✓ 許可される依存:
  - public-finance → shared（webapp）
  - data-import → shared（admin）
  - report → shared（admin）
  - auth → shared（admin）

✗ 禁止される依存:
  - コンテキスト間の直接依存（例: data-import → report）
  - shared → 任意のコンテキスト
  - webapp ↔ admin 間の依存
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
  - Client → Domain（modelsの型・純粋関数の参照）

✗ 禁止される依存:
  - Client → Infrastructure（型参照も含めて禁止）
  - Client → Application（型参照も含めて禁止）
  - Presentation → Client（型参照も含めて禁止）
```

**理由**:
- **Domain層の参照が許容される理由**: ドメインモデルはビジネス概念を表現しており、UIでも同じ概念を扱う必要がある。型の二重定義は保守コストを増大させる。`server-only` を含まない純粋関数であれば、バリデーション等のロジック共有も許容する。
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
- **実装パターン**: `interface + const` パターン（型と値の宣言空間が異なるため同名で共存可能）
- **例**: ハッシュ生成、会計年度計算、型変換、バリデーション

```typescript
// 型定義
export interface Password {
  value: string;
}

// ドメインロジック（型と値が異なる宣言空間で共存）
export const Password = {
  validate(password: string): PasswordValidationResult { /* ... */ },
};
```

**注意**:
- クライアントから参照するドメインモデルには `server-only` を含めないこと
- 既存コードには `namespace` パターンで実装されているものもあるが、以下の方針で段階的に統一する:
  - **新規実装**: 本 `interface + const` パターンを必須とする
  - **既存コード**: 機能追加・修正の際に、ついでに新パターンへ移行していく

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
- **actions**: 関数内でインスタンス化（loadersと同様）

### 6.3 エラーハンドリング

#### 6.3.1 レイヤー別エラーハンドリング方針

| 層 | エラーハンドリング |
|---|---|
| **Presentation** | ユーザーフレンドリーなメッセージに変換（`{ ok: false, error: "..." }`） |
| **Application** | 詳細なエラーメッセージでラップ（`throw new Error(\`Failed to ...: ${error.message}\`)`) |
| **Domain** | ビジネスルールエラーを返す（`{ status: "invalid", errors: [...] }`） |
| **Infrastructure** | 技術的なエラーを投げる（`throw new Error("Database connection failed")`） |

#### 6.3.2 拡張エラー型とエラーコードの定義

Domain層でエラーを扱う場合は、拡張エラー型とエラーコードを定義する。

**配置場所**: `contexts/{コンテキスト名}/domain/types/`

**リファレンス実装**: `contexts/report/domain/types/validation.ts`

**原則**:
- エラー型は `path`（エラー箇所）、`code`（エラーコード）、`message`（日本語メッセージ）、`severity`（"error" | "warning"）を持つ
- エラーコードは `as const` で型安全に定義。大文字スネークケース（例: `REQUIRED`, `INVALID_FORMAT`）
- コンテキスト固有のコードには接頭辞を付ける（例: `REPORT_MISSING_COUNTERPART`）

#### 6.3.3 error と warning の使い分け

| 種別 | 用途 | 処理の継続 |
|---|---|---|
| **error** | 処理を続行できない致命的な問題 | 不可 |
| **warning** | 処理は可能だが確認が必要な問題 | 可能（ユーザーに警告を表示） |

**原則**:
- errors がある場合は処理を中断し、errors と warnings を返す
- warnings のみの場合は処理を続行し、成功結果と共に warnings を返す
- Presentation層で errors/warnings をユーザーフレンドリーなメッセージに変換する

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

## 8. 依存ルールの自動検証

dependency-cruiser を使用して、アーキテクチャの依存ルールを自動検証できる。

### ローカルでの実行

```bash
pnpm depcruise
```

### 検証されるルール

| ルール | 説明 |
|--------|------|
| no-client-to-infrastructure | Client → Infrastructure 禁止 |
| no-client-to-application | Client → Application 禁止 |
| no-presentation-to-client | Presentation → Client 禁止 |
| no-domain-to-application | Domain → Application 禁止 |
| no-domain-to-presentation | Domain → Presentation 禁止 |
| no-domain-to-infrastructure-impl | Domain → Infrastructure実装 禁止 |
| no-infrastructure-to-application | Infrastructure → Application 禁止 |
| no-infrastructure-to-presentation | Infrastructure → Presentation 禁止 |
| Bounded Context間 | data-import ↔ report, auth ↔ 他コンテキスト 禁止 |

### CI統合

GitHub Actions で PR・push 時に自動実行される。違反があるとCIが失敗する。

---

## 9. よくある質問

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
