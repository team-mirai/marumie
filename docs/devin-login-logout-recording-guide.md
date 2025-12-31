# Devin Knowledge: ログイン・ログアウト動画撮影ガイド

このドキュメントは、Devinがmarumieのadminアプリケーションでログイン・ログアウトの動作確認動画を撮影するための手順をまとめたものです。

## 前提条件

- Dockerが起動していること
- pnpmがインストールされていること

## 手順

### 1. 環境変数の設定

`.env.example`を`.env`にコピーします。

```bash
cp .env.example .env
```

### 2. Supabaseの起動

```bash
pnpm supabase:start
```

起動完了後、Supabaseのキー情報を取得します。

```bash
npx supabase status --output json
```

出力されたJSONから以下の値を取得し、`.env`ファイルに追記します。

```env
# Supabase Configuration
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_ANON_KEY="<ANON_KEYの値>"
SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEYの値>"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON_KEYの値>"
```

### 3. データベースのセットアップ

マイグレーションを実行します。

```bash
pnpm db:migrate
```

シードデータを投入します。

```bash
pnpm db:seed
```

シード実行時にトランザクション関連でエラーが出る場合がありますが、ユーザーデータは正常に作成されます。

### 4. adminサーバーの起動

```bash
pnpm dev:admin
```

サーバーが起動し、`http://localhost:3001`でアクセス可能になるまで待機します。

### 5. 動画撮影

#### 撮影開始

`recording_start`ツールを使用して画面録画を開始します。

#### ログインの実行

1. ブラウザで`http://localhost:3001/login`にアクセス
2. 以下のいずれかの認証情報を入力:
   - **Admin**: `foo@example.com` / `foo@example.com`
   - **User**: `bar@example.com` / `bar@example.com`
3. 「ログイン」ボタンをクリック
4. ダッシュボード画面が表示されることを確認

#### ログアウトの実行

1. サイドバー下部の「ログアウト」ボタンをクリック
2. ログイン画面にリダイレクトされることを確認

#### 撮影終了

`recording_stop`ツールを使用して画面録画を停止します。

## テスト用認証情報

| ロール | Email | Password |
|--------|-------|----------|
| Admin | foo@example.com | foo@example.com |
| User | bar@example.com | bar@example.com |

これらの認証情報は`prisma/seeds/users.ts`で定義されています。

## 注意事項

- Supabaseの起動には数分かかる場合があります
- シードデータの投入時にトランザクション関連のエラーが発生することがありますが、ユーザーの作成は成功しています
- adminサーバーはポート3001で起動します（webappはポート3000）

## 関連ファイル

- `prisma/seeds/users.ts`: テストユーザーの定義
- `admin/src/app/(public)/login/page.tsx`: ログインページ
- `admin/src/client/components/layout/Sidebar.tsx`: ログアウトボタンを含むサイドバー
