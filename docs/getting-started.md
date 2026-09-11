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
| `admin/.env.local` | admin アプリ | `pnpm run dev` で admin を動かすには Supabase キーの設定が必要（後述）。seed / E2E は設定不要 |
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

ローカル Supabase の anon key / service_role key は `supabase start` 時に CLI が生成します。

**シード（`pnpm run db:seed` / `db:reset`）と admin の E2E（`pnpm run test:e2e:admin`）は、
起動中の Supabase から接続情報を自動取得する**（[scripts/supabase-env.mjs](../scripts/supabase-env.mjs)）ため、キーを手で設定する必要はありません。
`.env` に古い値が残っていても、起動中の Supabase の値で上書きされます。

`pnpm run dev` で admin を動かす場合のみ、以下のコマンドでキー情報を取得して `admin/.env.local` に設定してください：

```bash
pnpm run supabase:status -- --output json
```

出力（JSON）のうち使うのは次の 3 つです：

| JSON のキー | 設定先（`admin/.env.local`） |
|-------------|---------------------------|
| `API_URL` | `SUPABASE_URL`（`http://127.0.0.1:54331`） |
| `ANON_KEY` | `SUPABASE_ANON_KEY` |
| `SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |

> **注意**: `SUPABASE_URL` は必ず `54331` を指してください。Supabase のデフォルトポート `54321` を指したままだと、
> 同じマシンで別プロジェクトの Supabase が動いている場合にそちらへリクエストが飛び、
> 「メールアドレスまたはパスワードが正しくありません」「invalid JWT」のような紛らわしいエラーになります。

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
| Supabase Studio | http://127.0.0.1:54333 | データベース管理 GUI |
| Mailpit | http://127.0.0.1:54334 | メールテスト用ツール |

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

ポート番号は `supabase/config.toml` で設定されています。
同じマシンで別プロジェクトの Supabase（デフォルトポート 54321〜）が動いていても衝突しないよう、
すべて Supabase デフォルトから +10 ずらしています。CI も同じ設定ファイルをそのまま使います。

| サービス | ポート | 設定箇所 | Supabase デフォルト |
|----------|--------|----------|-------------------|
| API | 54331 | `[api]` port | 54321 |
| PostgreSQL (DB) | 54332 | `[db]` port | 54322 |
| Studio | 54333 | `[studio]` port | 54323 |
| Mailpit (メール) | 54334 | `[inbucket]` port | 54324 |
| Analytics | 54337 | `[analytics]` port | 54327 |

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

### E2E でログインに失敗する / 「invalid JWT」になる

→ `admin/.env.local` の `SUPABASE_URL` が `http://127.0.0.1:54331` を指しているか確認（`54321` は別プロジェクトの Supabase の可能性）。
　`pnpm test:e2e:admin` 経由なら自動で正しい値が使われるので、ポート 3001 で動いている古い開発サーバーを止めてから再実行する。

### db:reset 後に古いデータが画面に残る

→ Next.js のキャッシュを削除: `rm -rf admin/.next/cache`

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

### E2Eテスト（webapp / admin）

E2E はローカルの Supabase（認証）とシードデータに依存するため、プロジェクトルートから以下の順で実行します：

```bash
pnpm supabase:start && pnpm db:reset && pnpm test:e2e
```

- `pnpm test:e2e` は webapp → admin の順に実行します。片方だけ回すなら `pnpm test:e2e:webapp` / `pnpm test:e2e:admin`
- `pnpm test:e2e:admin` / `pnpm test:e2e:ui` は起動中の Supabase から接続情報を自動取得するため、
  `admin/.env.local` のキー設定は不要です（`pnpm --filter admin test:e2e` と直接呼ぶ場合は自動取得されません）
- webapp / admin とも、E2E は CI と同じ本番ビルド（`next build` → `next start`）を自動で起動します
  （webapp はポート 3000、admin はポート 3001）。該当ポートで開発サーバーが動いていると起動できないので、
  先に止めてください（dev サーバーは並行実行中に Fast Refresh で RSC ストリームが切れ、
  ハイドレーション前のクリックが握り潰されて E2E が不安定になるため使いません）。
  ビルドから走るので初回は数分かかります
- デバッグ目的で dev サーバーに当てたいときは `E2E_DEV_SERVER=1 pnpm test:e2e:webapp` /
  `E2E_DEV_SERVER=1 pnpm test:e2e:admin`。この場合は起動中の開発サーバーを再利用します
  （結果は CI と一致しないことがあります）

```bash
pnpm test:e2e:webapp                   # webapp の E2E（ヘッドレス）
pnpm test:e2e:admin                    # admin の E2E（ヘッドレス）
pnpm test:e2e:ui                       # UIモードで実行（デバッグ用）
pnpm --filter admin test:e2e:headed    # ブラウザを表示して実行（キーは admin/.env.local から）
```

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
