# Claude Code 設定

## アプリケーション概要

政治家・政治団体が会計データを透明に公開し、市民が政治資金の流れを理解しやすくするためのWebアプリケーションです。クラウド会計ソフト（MFクラウド・freee等）から取得したデータを可視化し、政治資金報告書の作成も支援します。

- webapp（公開用フロントエンド）は既に稼働中
- admin（管理画面）では政治資金報告書XML生成機能を開発中
- 技術スタック: Next.js 15 (App Router) / Prisma / Supabase (PostgreSQL) / Vercel / pnpm
- 詳細は [README.md](README.md) を参照

## コード構成

webapp / admin ともに Bounded Context パターンとレイヤードアーキテクチャに基づく設計を採用しています。

```
{webapp,admin}/src/
├── app/          # App Router に基づくルーティング、API エンドポイント
├── client/
│   ├── components/  # Reactコンポーネント
│   └── lib/         # クライアントで動作するヘルパーなど
├── server/contexts/
│   └── {コンテキスト名}/  # Bounded Context ごとにディレクトリを分割
└── types/        # 型定義
```

### Bounded Context 一覧

| アプリ | コンテキスト | 責務 |
|--------|-------------|------|
| webapp | **public-finance** | 政治資金データの公開・可視化 |
| admin | **data-import** | MFクラウドCSVインポート、取引データプレビュー |
| admin | **report** | 政治資金報告書XML生成、Counterpart（取引先）管理 |
| admin | **auth** | 認証・認可、ユーザー管理 |
| 共通 | **shared** | コンテキスト横断で共有（prisma client、汎用リポジトリなど） |

### 各コンテキストの構造

```
contexts/{コンテキスト名}/
├── presentation/
│   ├── loaders/     # サーバーサイドでのデータ取得処理
│   └── actions/     # サーバーアクション（"use server"）による副作用処理
├── application/
│   └── usecases/    # loaderやactionから呼び出されるトップレベル関数
├── domain/
│   ├── services/    # ドメインサービス（複数エンティティをまたぐ処理）
│   ├── models/      # ドメインモデル
│   └── repositories/  # リポジトリインターフェース
└── infrastructure/
    └── repositories/  # データベースアクセス層（リポジトリ実装）
```

詳細は [docs/backend-architecture-guide.md](docs/backend-architecture-guide.md) を参照すること。

## 実装ルール

### Next アプリケーション

- 動的に更新する必要がある画面（チャットなど）以外は、データ取得はなるべくサーバーコンポーネントに寄せる
- client 側で動作する必然性（状態管理・ブラウザ API 利用・重い UI ライブラリ等）がない限り "use client" は利用しない
- サーバーコンポーネントからのデータ取得は、原則 loaders などに切り出したサーバー処理を使い責務を分離する
- サーバー側で動作することを期待する処理には import "server-only" を書き、誤ってクライアントから参照されないようにする
- サーバーアクション（"use server"処理）は、データ更新やファイルアップロードなど副作用を伴う操作のためだけに使い、あわせて revalidatePath や revalidateTag などの再検証処理までを 1 セットで行う
- クライアント側でのデータ取得は例外として、リアルタイム通信・高頻度ポーリング・ユーザー操作に即応する検索・オフライン最適化（React Query など）に限って許容する

### import

- TypeScript の import は `@/` から始まる絶対パスを使用する（相対パス禁止）

## wtp (git worktree) の利用

並行開発が必要な場合は wtp を使う。詳細は [docs/wtp-guide.md](docs/wtp-guide.md) を参照。

## GitHub操作ルール

PRを作成する際は [.claude/commands/pr.md](.claude/commands/pr.md) の手順に従うこと。

## 設計作業ルール

設計ドキュメントを作成する場合は [.claude/commands/plan.md](.claude/commands/plan.md) の手順に従うこと。

## バックエンドアーキテクチャガイド

webapp / admin のバックエンド実装に関する詳細なルールは [docs/backend-architecture-guide.md](docs/backend-architecture-guide.md) を参照すること。

## admin UI コンポーネント

admin で UI コンポーネントを使用する際は [docs/admin-ui-guidelines.md](docs/admin-ui-guidelines.md) を参照すること。
