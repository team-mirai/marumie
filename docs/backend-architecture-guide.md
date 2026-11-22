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
│   └── repositories/  # 外部への出口インターフェース（リポジトリ／CSVローダー／LLMゲートウェイ等）
└── infrastructure/    # インフラストラクチャ層
    ├── repositories/  # リポジトリ実装（Prisma等）
    └── (外部連携)     # mf/, llm/ など
```

### 3.2 レイヤー間の依存ルール

```
✓ 許可される依存:
  - Presentation → Application
  - Presentation → Infrastructure（リポジトリ実装・外部サービス実装をインスタンス化するため）
  - Application → Domain（インターフェースのみ）
  - Infrastructure → Domain（インターフェース実装のため）
  - Domain → Domain（同一コンテキスト内のみ）

✗ 禁止される依存:
  - Application → Infrastructure（型参照も含めて禁止）
  - Application → Presentation
  - Domain → Application
  - Domain → Presentation
  - Domain → Infrastructure（直接実装への依存）
  - Infrastructure → Application
  - Infrastructure → Presentation
```

**Application → Infrastructure が禁止される理由**: CSVローダーやLLMゲートウェイのような外部サービスも、
実装を直接参照すると Usecase から差し替えられなくなり、テストで実物を動かさざるを得なくなる。
外部サービスのインターフェースは `domain/repositories/` に置き、Usecase はそのインターフェースだけに依存する。
実装のインスタンス化は Presentation 層（actions / loaders）で行い、コンストラクタ経由で注入する。
外部形式の生データ型（`MfCsvRecord`、`DonorCsvRecord` 等）も同様に `domain/models/` に置く。

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
- **Domain層の参照が許容される理由**: ドメインモデルはビジネス概念を表現しており、UIでも同じ概念を扱う必要がある。型の二重定義は保守コストを増大させる。`server-only` を含まない純粋関数であれば、バリデーション等のロジック共有も許容する。ただし許容であって推奨ではない。業務ルールの判定の正はサーバー側にあり、画面からドメインを呼ぶのは入力中にすぐ知らせたい場合などに限る（[4.5 の「画面とサーバーの関係」](#画面とサーバーの関係)）。
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
- **責務**: サーバーコンポーネントからのデータ取得（必要な場合のみキャッシング）
- **実装**: リポジトリとUsecaseを組み立てて呼び出す
- **キャッシュ**: admin（認証必須・低トラフィック）では原則 `unstable_cache` を使わず DB を直接読む。
  webapp（公開・高トラフィック）などでキャッシュが本当に必要な場合のみ `unstable_cache` でラップし、
  キャッシュキーと `tags` を明示する（詳細は [6.4 キャッシング](#64-キャッシング)）

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

##### Usecase の形（必須）

1. **1 ファイルに 1 クラス。** 1 つのクラスに複数の操作をまとめた `Manage〜Usecase` は作らない
2. **public メソッドは `execute` だけ。** constructor と private / protected メソッドは置いてよい
3. **「この状態のエンティティにこの操作をしてよいか」の判定は Domain Model に置く。**
   却下理由（ユーザーに見せるメッセージ）を返すのはドメインの仕事。usecase に書くのは段取りだけ
   — 取得・ドメインの判定の呼び出し・同時更新の検出・永続化・キャッシュ無効化

**なぜ**: 1 つのクラスに操作メソッドを並べると、各メソッドが同じ業務ルールを `if` で書き足すことになり、
同じルールが 1 つのクラスの中で何か所にも重複する。実際に `ManageJournalReviewUsecase` では
「公開中の仕訳は編集・破棄できない」という 1 つのルールが 6 か所に散っていた。
1 クラス 1 操作に割ると、複数の操作が共有するルールを置ける場所がドメインしか無くなる。

**自動検証**: `pnpm check:usecase-shape`（`pnpm verify` および CI に含まれる）が 1. と 2. を検査する。
3. はレビューで見る（usecase 以外の層も含めた業務ルールの置き場所は [4.5 ドメインモデル貧血](#45-ドメインモデル貧血) を参照）。
解消待ちの既存違反は [scripts/check-usecase-shape.mjs](../scripts/check-usecase-shape.mjs) の `KNOWN_VIOLATIONS` に
列挙してあり、リファクタで解消したら該当行を 1 行消す（解消済みなのに例外が残っていると検査が落ちるので消し忘れない）。
**新しく書く usecase をこのリストに足してはいけない。**

```typescript
// ✗ 悪い例: 操作メソッドが並び、同じ業務ルールが各メソッドに重複する
export class ManageJournalReviewUsecase {
  async save(bookId: string, id: string, updatedAt: string, input: JournalEdit) {
    const entry = await this.repository.find(bookId, id);
    if (!entry) throw new JournalReviewError("仕訳が見つかりません");
    if (entry.status === "published")
      throw new JournalReviewError("公開中の仕訳は編集できません"); // ← ルールがここにある
    // ...
  }

  async discard(bookId: string, id: string, updatedAt: string) {
    const entry = await this.repository.find(bookId, id);
    if (!entry) throw new JournalReviewError("仕訳が見つかりません");
    if (entry.status === "published")
      throw new JournalReviewError("公開中の仕訳は破棄できません"); // ← 同じルールがまた増える
    // ...
  }
}
```

```typescript
// ✓ 良い例: 可否の判定と却下理由は Domain Model が返す
// domain/models/journal-entry.ts
export const JournalEntry = {
  transition(
    entry: JournalEntry,
    nextStatus: JournalEntryStatus,
  ): ResearchFundResult<JournalEntry> {
    if (!allowed.some(([from, to]) => from === entry.status && to === nextStatus)) {
      return invalidResearchFundResult(
        "status",
        RF_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "仕訳は下書きと確認済みの間、確認済みから公開済み、公開済みから確認済みへのみ変更できます",
      );
    }
    return { status: "valid", value: Object.freeze({ ...entry, status: nextStatus }) };
  },
};
```

```typescript
// ✓ 良い例: usecase は段取りだけを書く。public は execute だけ
// application/usecases/revert-journal-entry-to-draft-usecase.ts
export class RevertJournalEntryToDraftUsecase {
  constructor(private repository: JournalReviewRepository) {}

  async execute(bookId: string, id: string, updatedAt: string) {
    const entry = await this.find(bookId, id, updatedAt);
    // 可否の判定と却下理由はドメインが持つ
    const result = JournalEntry.transition(entry, "draft");
    if (result.status === "invalid") throw new JournalReviewError(result.errors[0].message);
    await this.repository.revertToDraft(bookId, entry);
  }

  /** 取得と同時更新の検出は段取りなので usecase に置く（private） */
  private async find(bookId: string, id: string, updatedAt: string) {
    const entry = await this.repository.find(bookId, id);
    if (!entry) throw new JournalReviewError("仕訳が見つかりません");
    if (entry.updatedAt !== updatedAt)
      throw new JournalReviewError("別の操作で更新されました。画面を再読み込みしてください");
    return entry;
  }
}
```

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

### 4.5 ドメインモデル貧血

**ドメインモデル貧血**とは、業務ルールがドメインモデルの外（usecase・action・リポジトリ実装・画面）に書かれ、
ドメインモデルが型と値の入れ物になっている状態を指す。同じルールが複数の層に別々に書かれると、
片方だけ直されて食い違い、どれが正しいのかコードから読み取れなくなる。

#### 業務ルールを書く前の手順（必須）

1. **同じルールがドメインに既に無いか探す。** 該当コンテキストの `domain/models/` と `domain/services/`、
   コンテキスト横断のものは `contexts/shared/domain/` とリポジトリ直下の `shared/` を検索する
   （例: パスワードの規則なら `Password`、仕訳の状態なら `JournalEntry`）
2. **あれば呼ぶ。** サーバー側（usecase・action・リポジトリ実装）で同じ判定・計算・定数を書き直さない。
   画面での扱いは[画面とサーバーの関係](#画面とサーバーの関係)に従う
3. **無ければドメインに足してから呼ぶ。** usecase や画面に先に書いて「あとでドメインに移す」はしない

#### どこまで直すか（費用対効果）

貧血を直す目的は、**食い違うと実害が出るルールを 1 か所にすること**である。
下の 7 つの形に当てはまること自体は、直す理由にならない。

直す前に「このルールが変わったとき、直し忘れると誰が何に困るか」を 1 文で言う。言えないものは直さない。

| | 例 |
|---|---|
| **直す** | サーバーが保存・公開する結果が食い違う（保存時に検証が走らない、同じ金額を層ごとに違う読み方で数える）、却下理由が画面に届かない、同じ上限値を変えるのに複数の層を直す必要がある |
| **直さない** | 今の実装で結果が正しく、直すには API のレスポンスの形・画面の state・変換用の型を足す必要があるもの。同じ順序や条件を SQL と TypeScript の両方に書くことになるもの（重複を消すつもりで増やしている） |

「直さない」の実例: リポジトリが残高日付の新しい順に返した一覧の先頭を、画面が「現在の残高」として表示している。
並び順は `orderBy` の 1 か所で決まっており、結果は正しい。これをドメインの関数に移すと、API が一覧と別に「現在の残高」を返す形に変わり、
画面の state と JSON の変換が増え、順序の定義が SQL と TypeScript の 2 か所になる。

既存コードのリファクタで配線（API の形・画面の state・props・変換用の型）を足す必要が出たら、
足す前に手を止め、その部分を PR から外す。外した理由は PR の本文に書く。

#### 画面とサーバーの関係

業務ルールの判定の正は**サーバー側**（usecase が呼ぶドメイン）にある。画面の入力チェックは、送信する前に早く知らせるための先回りで、無くてもよい。
「画面とサーバーで同じドメインの関数を共有する」ことを目的にしない。

画面で業務ルールの結果が要るときは、次の順で選ぶ。

1. **サーバーの却下理由を表示する。** 画面では検証しない。送信すれば理由が分かるものはこれで足りる
2. **loader が判定結果を渡し、画面は表示する。** 操作ボタンを出すか、選べる範囲、見出しの金額など、表示の時点でサーバーが決められるもの
3. **画面からドメインの純粋関数・定数を呼ぶ**（[3.2.1](#321-クライアント層uiからの依存ルール) で許可）。
   入力中にすぐ知らせたいとき、画面で編集中の値によって結果が変わるときに限る。上限値やラベルなど定数の参照もここに含む

守ること:

- 画面の検証はサーバーの**部分集合**でよい（全部を再現しない）。ただし**矛盾は不可**。サーバーが通す値を画面が弾くと操作できなくなる
- 画面に業務上の値（最小文字数、上限、金額基準）を書くなら、リテラルで書き直さずドメインの定数を参照する
- 3 を選ぶために API の形や画面の state を変える必要があるなら、1 か 2 にする
- 「今日」のように実行環境で変わる値を画面とサーバーの両方で判定すると食い違う。両方で判定するならドメインの同じ関数を使い、そうでなければサーバーだけで判定する

#### 何が貧血で、何が貧血でないか

業務ルールとは「この組織・この制度ではこうする」という決まりのこと。
次のものは業務ルールではないので、ドメインの外に書いてよい（**貧血ではない**）:

- 取得・not found の判定・同時更新の検出（`updatedAt` の比較）・永続化・キャッシュ無効化（usecase / action の段取り）
- 入力の型や必須の検証（Zod の `string()` / `number()` / 空文字の拒否など、業務の決まりを含まないもの）
- 外部形式との機械的な変換（CSV の列 → フィールド、Prisma の行 → ドメイン型、ドメイン型 → XML 要素）
- 見た目の整形（金額のカンマ区切り、日付の表示形式、並び順の UI 上の選択）
- リポジトリが返した並び順をそのまま使うこと（新しい順の先頭を最新として表示する、など）
- 画面が検証を持たず、サーバーの却下理由を表示するだけであること。画面がドメインを呼んでいないこと自体は貧血ではない

次の 7 つの形が貧血である。いずれもこのリポジトリで実例が見つかったもの。
当てはまっても、[どこまで直すか](#どこまで直すか費用対効果)の基準で実害が無いものは直さない。

##### (1) ルールの二重化

ドメインに判定・検証があるのに、同じルールを usecase・画面・リポジトリの検索条件がもう一度書いている。

```typescript
// ✗ 悪い例: Password.validate（最小 6 文字）があるのに、usecase と画面が別々に書いている
// application/usecases/setup-password-usecase.ts
if (!password || password.length < 6) {
  throw new AuthError("WEAK_PASSWORD", "Password must be at least 6 characters");
}
// client/components/auth/SetupForm.tsx
if (password.length < 6) setError("パスワードは6文字以上で設定してください");
```

```typescript
// ✓ 良い例: usecase はドメインを呼ぶ。最小文字数を変えるときはドメインだけを直せばよい
const validation = Password.validate(password);
if (!validation.valid) throw new AuthError("WEAK_PASSWORD", validation.error);
```

画面側は、サーバーが返した理由を表示するだけでよい。入力中に知らせたいなら `Password.validate` か `Password.MIN_LENGTH` を参照し、
`6` をリテラルで書き直さない（[画面とサーバーの関係](#画面とサーバーの関係)）。

仕訳の操作可否（[4.2 の例](#usecase-の形必須)）、明細に記載する金額の基準も同じ形で二重化しやすい。

##### (2) 呼ばれないドメイン

ドメインに検証・判定を書いたのに本番コードのどこからも呼ばれず、テストだけが通っている。
画面だけが呼んでいてサーバーは別の実装で判定している場合も含む。テストが緑なので「ルールが守られている」ように見えるのが最も危ない。

```typescript
// ✗ 悪い例: 仕訳の貸借検証がドメインにあり、テストもあるが、仕訳を保存する usecase は呼んでいない
export const JournalPosting = {
  validate(lines: readonly JournalLine[]): ResearchFundResult<JournalPosting> { /* 借方と貸方の行・合計の一致 */ },
};
```

```typescript
// ✓ 良い例: 保存の段取りの中でドメインの検証を呼ぶ。不要になった判定は消す
const result = JournalPosting.validate(lines);
if (result.status === "invalid") throw new JournalReviewError(result.errors[0].message);
```

**自動検証あり**（[4.5 の自動検証](#自動検証)の `unused-domain`）。

##### (3) 入れ物だけのモデル

ドメインモデルが型だけで、その型のルール（未来の日付は不可、必須、正規化）が usecase と画面に散っている。
型を定義したら、その型の値が満たすべき条件（生成・検証・正規化）を同じファイルの `const` に置く。

```typescript
// ✗ 悪い例: 型だけがドメインにあり、「未来の日付は登録できない」は
// create-balance-snapshot-usecase.ts と BalanceSnapshotForm.tsx にそれぞれ書かれている
export interface BalanceSnapshot { snapshot_date: Date; balance: number; /* ... */ }
```

```typescript
// ✓ 良い例（イメージ）: 型のルールは interface + const の const 側に置き、usecase がそれを呼ぶ
export const BalanceSnapshot = {
  validateSnapshotDate(snapshotDate: Date, today: Date): { valid: boolean; error?: string } { /* ... */ },
};
```

画面は usecase の却下理由を表示すれば足りる。画面側の重複した判定は、消すのが最も単純な直し方である。

##### (4) 却下理由の持ち直し

ドメインが返した却下理由を、action がエラーコードごとに別の文言へ書き直す。
対応表に無いコードは汎用エラーになり、ドメインが用意した理由が画面に出ない。文言を変えたいならドメインの文言を直す。

```typescript
// ✗ 悪い例: presentation/actions/manage-book.ts
switch (error.code) {
  case "RF_INVALID_BOOK_YEAR":
    return "年度は1900〜9999の整数で指定してください"; // ドメインの message と別の文言
  case "RF_INVALID_DATE":
    return "時点の日付を正しく入力してください";
  default:
    return fallback; // 新しいコードを足すと理由が消える
}
```

```typescript
// ✓ 良い例: ドメインの却下理由（message）をそのまま返す。想定外の例外だけ汎用文言にする
if (error instanceof BookError) return error.message;
return fallback;
```

**自動検証あり**（`remapped-rejection`）。

##### (5) リポジトリ実装に埋まった業務ルール

「どの状態なら更新してよいか」「どの行を金額として数えるか」「既定値は何か」が、
Prisma の検索条件や保存データの組み立てにだけある。リポジトリ実装は「渡された条件で読み書きする」だけにし、
条件そのもの（どの状態か・どの行か・既定値）はドメインが決めて引数か定数で渡す。

```typescript
// ✗ 悪い例: 「公開済みの仕訳だけを集計に数える」がリポジトリの where にしか無い
where: { bookId: BigInt(bookId), status: "published" },
```

```typescript
// ✓ 良い例（イメージ）: 数える状態はドメインが定義し、リポジトリはそれを使って絞り込む
// domain/models/journal-entry.ts
export const JournalEntry = { COUNTED_STATUSES: ["published"] as const satisfies readonly JournalEntryStatus[] };
// infrastructure/repositories/prisma-journal-review.repository.ts
where: { bookId: BigInt(bookId), status: { in: [...JournalEntry.COUNTED_STATUSES] } },
```

Prisma の行 → ドメイン型の機械的な変換（列名の対応、`BigInt` ↔ `string`）は貧血ではない。

##### (6) 画面に埋まった業務ルール

見出しの金額の定義（何を足して何を引くか）、公開している年度、操作ボタンを出してよい条件を、画面が自前で計算・保持している。
画面は、サーバーがドメインで判定した結果を表示するだけにする。

```tsx
// ✗ 悪い例: 「どの状態の仕訳にこの操作ができるか」を画面が状態の文字列で独自に判定している
// （client/components/research-fund/JournalEditor.tsx）
{entry.status === "draft" && <Button type="submit">…</Button>}
```

```tsx
// ✓ 良い例（イメージ）: 可否は loader がドメインで判定して渡す。画面は表示するだけ
{entry.canConfirm && <Button type="submit">…</Button>}
```

画面で編集中の値によって可否が変わる場合に限り、画面からドメインの純粋関数を呼ぶ
（`JournalEntry.canTransition(entry, "confirmed")` など。クライアントから参照するドメインモデルには `server-only` を含めない）。
既に画面がドメインを呼んでいる箇所を、loader 経由に書き換える必要は無い。

##### (7) 業務上の定数の散在

受け付ける書類形式、上限件数、金額基準などが、複数の層に別々のリテラルで書かれている。
業務上の意味を持つ定数はドメインに 1 か所だけ置き、他の層はそれを参照する（(1) の `Password.MIN_LENGTH` の例を参照）。
HTTP ステータス・画像サイズ・タイムアウトなど技術的な値は対象外。

#### 層ごとの自己点検

| 層 | 書いてはいけないもの（ドメインを呼ぶ） | 書いてよいもの |
|---|---|---|
| **usecase** | 状態による操作の可否、値の業務上の検証（範囲・期限・桁）、金額の計算・集計の定義、却下理由の文言 | 取得・not found・同時更新の検出・ドメインの呼び出し・永続化・キャッシュ無効化の段取り |
| **action** | エラーコードごとの文言の書き直し、業務上の検証（最小文字数・上限件数など） | 認可、入力の型・必須の検証、usecase の呼び出し、`revalidatePath` / `revalidateTag`、想定外の例外の汎用文言化 |
| **リポジトリ実装** | どの状態を対象にするか・どの行を数えるか・既定値を自前で決めること | ドメインが決めた条件での読み書き、Prisma 型 ↔ ドメイン型の機械的な変換、一意制約違反などの技術的なエラーの翻訳 |
| **画面（client / app）** | 金額の定義、公開範囲・年度の判定、ボタンを出してよい条件、業務上の定数のリテラル | 表示の整形、フォームの状態管理、サーバーの却下理由や loader が返した判定結果の表示、先回りの入力チェック（業務上の値はドメインの定数を参照） |

#### 自動検証

`pnpm check:domain-anemia`（`pnpm verify` および CI に含まれる）が、上の形のうち誤検知がほぼ無い 2 つを検査する。

| 検査 | 対象 | 落ちる条件 |
|---|---|---|
| `unused-domain` | (2) 呼ばれないドメイン | ドメイン層が export する関数・`interface + const` のメソッド・クラスの public メソッドが、本番コード（`src/` と直下の `shared/`）から参照されていない（テストからの参照は数えない） |
| `remapped-rejection` | (4) 却下理由の持ち直し | presentation / client / app が、ドメインで定義したエラーコードを `switch` や対応表で受けて自前の文言を返している |

参照は TypeScript の型チェッカーで解決する（名前の文字列一致ではない）ので、同名のメソッドが別のモデルにあっても取り違えない。

どちらの検査も、該当する形をすべて捕まえるわけではない。次の形は検査を通ってしまうので、レビューで見る:

- `unused-domain` は画面（client / app）からの参照も本番参照として数える。(2) のうち「画面だけが呼んでいてサーバーは別の実装で判定している」場合は落ちないので、
  サーバー側（usecase / action）がそのドメインを呼んでいるかを確かめる
- `remapped-rejection` が見るのは `case` 節の直下にある `return "文言"`（テンプレート文字列を含む）と、値が文字列の対応表だけ。
  `case "RF_X": { return "…"; }` のようにブロックで囲んだ分岐や、変数・関数を経由して文言を返す書き直しは落ちない

解消待ちの既存違反は [scripts/check-domain-anemia.mjs](../scripts/check-domain-anemia.mjs) の `KNOWN_VIOLATIONS` に列挙してあり、
リファクタで解消したら該当行を 1 行消す（解消済みなのに例外が残っていると検査が落ちるので消し忘れない）。
**新しく書くコードをこのリストに足してはいけない。**

残りの (1) (3) (5) (6) (7) は機械的に検査できないので、レビュー（CodeRabbit と `/review`）で見る。
検査を試して見送ったもの:

- **(7) 業務上の定数の散在**: 複数の層に現れる数値リテラル・MIME 文字列を数えたところ、数値は 19 種のうち大半が
  画像の寸法・HTTP ステータス・JPEG のマーカーなど技術的な値で、MIME 文字列（`application/pdf` など）も
  ラスタライズや LLM 呼び出しの技術的な用途と区別できず、誤検知が多いので見送った
- **usecase 内の日本語メッセージを一律に禁じる**: not found や同時更新の文言も引っかかり、誤検知が多いので見送った

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
| CSV の列 → PreviewTransaction のフィールドへの対応付け | Infrastructure | 外部形式との機械的な変換（列名・日付文字列・数値の解釈） |
| 取引の会計上の分類・種別（収入/支出、費目、報告書の区分）の導出 | Domain Model / Domain Service | 会計・報告書の業務ルール。CSV の読み込み処理の中に書かない |
| 「この状態でこの操作をしてよいか」の判定と却下理由 | Domain Model | 業務ルール。usecase・action・画面に書き直さない（[4.5](#45-ドメインモデル貧血)） |
| 集計の対象にする状態・行の定義（例: 公開済みの仕訳だけを数える） | Domain Model | 業務ルール。リポジトリ実装は渡された条件で絞り込むだけ |
| 見出しの金額の定義（何を足して何を引くか） | Domain Model / Domain Service | 業務ルール。画面は表示するだけ |
| 金額のカンマ区切り・日付の表示形式 | Client | 見た目の整形（業務ルールではない） |
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

- **原則**: admin の loaders は `unstable_cache` を使わない。認証必須・低トラフィックの管理画面では
  60秒キャッシュの利益がほぼ無く、更新直後に古いデータが表示される実バグの温床になる
- **キャッシュする場合**（webapp の公開ページなど）: `unstable_cache` に必ず `tags` を付与し、
  対応する更新アクションで `revalidateTag` を呼んで整合させる。
  `revalidatePath` は `unstable_cache` のエントリを無効化しない（無効化は tag か revalidate 時間経過のみ）
- **actions**: 処理成功後に `revalidatePath`（キャッシュを残す場合はあわせて `revalidateTag`）で無効化
- **外部キャッシュ**: インターフェース経由でベストエフォート無効化

### 6.5 テストの配置

- **原則**: ユニットテストは `{webapp,admin}/tests/` に、`src/` と同じ階層構造で置く。
  クライアント側（`src/client/`）のロジックも同様に `tests/client/` へ置き、コンポーネントの隣には置かない

  | 実装 | テスト |
  |---|---|
  | `src/client/lib/format.ts` | `tests/client/lib/format.test.ts` |
  | `src/client/components/layout/sidebar-nav.ts` | `tests/client/components/layout/sidebar-nav.test.ts` |
  | `src/server/contexts/report/domain/services/xxx.ts` | `tests/server/contexts/report/domain/services/xxx.test.ts` |

- **`src/` 配下に `*.test.ts` / `*.test.tsx` を置かない**。jest の `roots` は `tests/` のみを対象にしているため、
  `src/` 配下のテストは収集されず、落ちていても CI では気づけない
- **自動検証**: dependency-cruiser の `no-tests-in-src` / `no-orphan-tests-in-src` ルールが `src/` 配下のテストファイルを検出し、
  `pnpm depcruise`（`pnpm verify` および CI に含まれる）を失敗させる
- テストが実際に収集されているかは `pnpm --filter admin test --listTests` で確認できる

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

### Usecase の形
- [ ] 1 ファイルに 1 クラスで、public メソッドは `execute` だけになっている
- [ ] 「この状態でこの操作をしてよいか」の判定（却下理由を返すもの）は Domain Model にあり、usecase には段取りだけが書かれている

### Domain Model
- [ ] ビジネスルールはドメインモデルに実装されている
- [ ] 単一エンティティのロジックはDomain Modelに、複数エンティティのロジックはDomain Serviceに分けられている

### ドメインモデル貧血（[4.5](#45-ドメインモデル貧血)）
- [ ] 業務ルールを書く前に、同じルールがドメインに既に無いか探した。あれば呼び、無ければドメインに足してから呼んでいる
- [ ] 既存コードを直す場合、直し忘れると誰が何に困るかを言える。貧血の解消のために API の形・画面の state・変換用の型を足していない
- [ ] 画面とサーバーで関数を共有すること自体を目的にしていない（画面はサーバーの却下理由か loader の判定結果を表示すれば足りないか確かめた）
- [ ] usecase に、状態による可否・業務上の検証・金額の計算の定義・却下理由の文言を書いていない
- [ ] action が、ドメインの却下理由をエラーコードごとに別の文言へ書き直していない
- [ ] リポジトリ実装が、どの状態を対象にするか・どの行を数えるか・既定値を自前で決めていない
- [ ] 画面が、金額の定義・公開範囲・ボタンを出してよい条件・業務上の定数を自前で持っていない
- [ ] 新しく足したドメインの判定・検証は、テストだけでなく本番コードから呼ばれている
- [ ] `pnpm check:domain-anemia` が通り、`KNOWN_VIOLATIONS` に新しい行を足していない

### キャッシング
- [ ] admin の loaders で `unstable_cache` を使っていない（使う場合は `tags` を付与し、更新アクションの `revalidateTag` と整合している）
- [ ] actionsで適切に`revalidateTag`/`revalidatePath`を呼び出している
- [ ] 外部キャッシュの無効化はインターフェース経由で行っている

### テスタビリティ
- [ ] UsecaseはConstructor Injectionを使用している
- [ ] インターフェースを通じて依存を注入できる
- [ ] テストは `tests/` に `src/` と同じ階層で置かれている（`src/` 配下に `*.test.ts` を置いていない）

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
| no-tests-in-src / no-orphan-tests-in-src | `src/` 配下に `*.test.ts(x)` / `*.spec.ts(x)` を置くこと禁止（テストは `tests/` に置く。6.5 参照） |
| no-client-to-infrastructure | Client → Infrastructure 禁止 |
| no-client-to-application | Client → Application 禁止 |
| no-presentation-to-client | Presentation → Client 禁止 |
| no-domain-to-application | Domain → Application 禁止 |
| no-domain-to-presentation | Domain → Presentation 禁止 |
| no-domain-to-infrastructure-impl | Domain → Infrastructure実装 禁止 |
| no-application-to-infrastructure | Application → Infrastructure 禁止 |
| no-application-to-presentation | Application → Presentation 禁止 |
| no-infrastructure-to-application | Infrastructure → Application 禁止 |
| no-infrastructure-to-presentation | Infrastructure → Presentation 禁止 |
| Bounded Context間 | data-import ↔ report, auth ↔ 他コンテキスト 禁止 |

依存ルール以外に、`pnpm check:usecase-shape`（[4.2 Usecase の形](#usecase-の形必須)）と
`pnpm check:domain-anemia`（[4.5 ドメインモデル貧血](#45-ドメインモデル貧血)）も `pnpm verify` と CI で実行される。

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
