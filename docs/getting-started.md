# 開発環境セットアップガイド

このドキュメントは、初めて marumie プロジェクトをクローンする人向けのセットアップ手順をまとめたものです。

## 動作環境

**macOS** または **WSL2（Windows Subsystem for Linux 2）** で開発してください。

## 1. 事前準備

以下のツールをインストールし、動作確認してください。

| ツール | 確認コマンド | 期待される結果 |
|--------|-------------|---------------|
| Node.js 20 以上 | `node -v` | `v20.x.x` 以上 |
| pnpm 10.14.0 | `pnpm -v` | `10.14.0` |
| Docker | `docker info` | エラーなく情報が表示される |

### インストール方法（概要）

- **Node.js**: nvm や nodenv などのバージョン管理ツール経由でインストール
- **pnpm**: `corepack enable && corepack prepare pnpm@10.14.0 --activate` または `npm install -g pnpm@10.14.0`
- **Docker**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) をインストールして起動

### WSL2 を使う場合の注意

- Windows 側に Docker Desktop をインストールし、「Use the WSL 2 based engine」を有効化
- Settings > Resources > WSL Integration で使用する WSL ディストリビューションを有効化

## 2. リポジトリのクローン

```bash
git clone https://github.com/team-mirai/marumie.git
cd marumie
```

## 3. 環境変数ファイルの作成

以下の 3 つのファイルをコピーして作成してください。

```bash
cp .env.example .env
cp admin/.env.example admin/.env.local
cp webapp/.env.example webapp/.env.local
```

### 環境変数ファイルの一覧

| ファイル | 用途 | 備考 |
|----------|------|------|
| `.env` | Prisma / データベース接続 | そのままで OK |
| `admin/.env.local` | admin アプリ | Supabase キーの設定が必要（後述） |
| `webapp/.env.local` | webapp アプリ | そのままで OK |

## 4. 初回セットアップ

```bash
pnpm run dev:setup
```

このコマンドで以下が実行されます：
1. 依存関係のインストール
2. Supabase の起動・マイグレーション実行
3. シードデータの投入

初回は Docker イメージのダウンロードがあるため、数分かかります。

## 5. Supabase キーの設定

`dev:setup` 完了後、以下のコマンドでキー情報を取得します：

```bash
pnpm dlx supabase status
```

出力例：

```
         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54332/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

取得したキーを以下のファイルに設定してください：

**`admin/.env.local`** に設定：

```env
SUPABASE_ANON_KEY="上記の anon key の値"
SUPABASE_SERVICE_ROLE_KEY="上記の service_role key の値"
```

**`.env`（ルート）** に追記：

```env
SUPABASE_SERVICE_ROLE_KEY="上記の service_role key の値"
```

## 6. 開発サーバーの起動

```bash
pnpm run dev
```

Supabase、webapp（ポート 3000）、admin（ポート 3001）が同時に起動します。

### 確認用 URL

| アプリ | URL | 説明 |
|--------|-----|------|
| webapp | http://localhost:3000 | 一般ユーザー向けフロントエンド |
| admin | http://localhost:3001 | 管理画面 |
| Supabase Studio | http://127.0.0.1:54323 | データベース管理 GUI |
| Mailpit | http://127.0.0.1:54324 | メールテスト用ツール |

### テスト用ログイン情報（admin）

| ロール | Email | Password |
|--------|-------|----------|
| Admin | foo@example.com | foo@example.com |
| User | bar@example.com | bar@example.com |

## データベースのマイグレーション

### 本番環境・開発環境

Vercelで行われるwebappのbuild過程で自動的にマイグレーションが実行されます（`build:vercel` スクリプト内で `db:setup` を実行）。

### ローカル開発環境

マイグレーションは初回セットアップ（`pnpm run dev:setup`）時に自動実行されます。手動でマイグレーションやデータベースリセットを行う場合は、以下のコマンドをプロジェクトルートから実行してください：

```bash
pnpm run db:migrate           # マイグレーション実行（開発環境）
pnpm run db:migrate:deploy    # マイグレーション実行（本番同等）
pnpm run db:reset             # データベース完全リセット（Supabaseリセット + マイグレーション + シード）
pnpm run db:seed              # シードデータのみ投入
```

## モックデータの使用

webappでモックデータを使用する場合は、`webapp/.env.local` に以下を追加してください：

```env
USE_MOCK_DATA=true
```

設定後、トランザクションページのバックエンドがモックデータを返すようになります。

## サンプルデータ

`data/sampledata.csv` に政治資金の取引データのサンプルが含まれています。管理画面（http://localhost:3001）の「CSVアップロード」機能からこのファイルをアップロードして確認できます。

## Supabase のポート番号

ポート番号は `supabase/config.toml` で設定されています：

| サービス | ポート | 設定箇所 |
|----------|--------|----------|
| API | 54321 | Supabase デフォルト |
| PostgreSQL (DB) | 54332 | `[db]` port |
| Studio | 54323 | `[studio]` port |
| Inbucket (メール) | 54324 | `[inbucket]` port |

## トラブルシューティング

### Docker が起動していない

```
Error: Cannot connect to Docker daemon
```

→ Docker Desktop が起動しているか確認: `docker info`

### ポートが使用中

```
Error: Port 3000 is already in use
```

→ 該当プロセスを終了: `lsof -i :3000` で PID を確認し `kill -9 <PID>`

### Supabase が正常に起動しない

→ 停止してから再起動: `pnpm run supabase:stop && pnpm run supabase:start`

### データベースをリセットしたい

→ `pnpm run db:reset`

### 依存関係のエラー

→ クリーンインストール: `pnpm run fresh`

## よく使うコマンド

### 開発

```bash
pnpm run dev           # webapp + admin を同時起動（推奨）
pnpm run dev:webapp    # webapp のみ起動
pnpm run dev:admin     # admin のみ起動
```

### データベース

```bash
pnpm run db:reset             # データベース完全リセット（Supabaseリセット + マイグレーション + シード）
pnpm run db:migrate           # マイグレーション実行（開発環境）
pnpm run db:migrate:deploy    # マイグレーション実行（本番同等）
pnpm run db:seed              # シードデータ投入
pnpm run db:studio            # Prisma Studio 起動
```

### コード品質

```bash
pnpm run lint          # Lint 実行
pnpm run format        # コードフォーマット
pnpm run typecheck     # 型チェック
pnpm run test          # テスト実行
```

### E2Eテスト（admin）

```bash
pnpm --filter admin test:e2e          # E2Eテスト実行（ヘッドレス）
pnpm --filter admin test:e2e:ui       # UIモードで実行（デバッグ用）
pnpm --filter admin test:e2e:headed   # ブラウザを表示して実行
```

**注意**: E2Eテスト実行前に Supabase が起動している必要があります。

WSL2 で初めて実行する場合、ブラウザのシステム依存関係が必要です：

```bash
# Playwrightの依存関係をインストール（sudo必要）
pnpm --filter admin exec playwright install-deps chromium
```

### Supabase

```bash
pnpm run supabase:start   # Supabase 起動
pnpm run supabase:stop    # Supabase 停止
pnpm run supabase:status  # Supabase 状態確認
```

## 次のステップ

- [README.md](../README.md) - プロジェクト概要
- [CLAUDE.md](../CLAUDE.md) - コード規約・アーキテクチャ
- [backend-architecture-guide.md](backend-architecture-guide.md) - バックエンドのアーキテクチャ詳細
- [admin-ui-guidelines.md](admin-ui-guidelines.md) - admin の UI コンポーネントガイドライン
