# みらいまる見え政治資金

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/team-mirai-volunteer/marumie)

> 政治資金の透明性向上を目指すオープンソースダッシュボード

政治家・政治団体が会計データを透明に公開し、市民が政治資金の流れを理解しやすくするためのWebアプリケーションです。クラウド会計ソフト（MFクラウド・freee等）から取得したデータを可視化し、政治資金報告書の作成も支援します。

チームみらい永田町エンジニアチームが開発しています。

## プロジェクト構成

このプロジェクトは以下のディレクトリ構成で構築されています：

### ディレクトリ構造

```
marumie/
├── webapp/           # フロントエンド（一般ユーザー向け）
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── client/        # クライアントサイドコンポーネント
│   │   ├── server/        # サーバーサイドロジック
│   │   └── types/         # 型定義
│   ├── tests/             # テストファイル
│   └── package.json
├── admin/            # 管理画面
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── client/        # クライアントサイドコンポーネント
│   │   ├── server/contexts/ # Bounded Context ベース構成
│   │   │   ├── auth/      # 認証関連処理
│   │   │   ├── data-import/  # 取引データ取り込み
│   │   │   ├── report/    # 政治資金報告書XMLエクスポート
│   │   │   └── shared/    # コンテキスト横断共有
│   │   ├── types/         # 型定義
│   │   └── middleware.ts
│   ├── tests/             # テストファイル
│   └── package.json
├── shared/           # 共通モデル・型定義・ユーティリティ
│   ├── models/       # 共通データモデル
│   └── utils/        # 共通ユーティリティ関数
├── data/             # サンプルデータ
├── supabase/         # Supabaseローカル開発環境設定
├── prisma/           # データベーススキーマ・マイグレーション
└── docs/             # 設計ドキュメント（その時点での設計メモなので必ずしも正確ではないです）
```

### 各ディレクトリの役割

- **webapp/**: 一般ユーザー向けのフロントエンドアプリケーション（政治資金データの可視化）
- **admin/**: 管理者向けの管理画面（データ登録・管理機能）
- **shared/**: webapp と admin で共通して使用するモデル、型定義、ユーティリティ関数
- **data/**: サンプルデータファイル
- **supabase/**: Supabaseローカル開発環境の設定ファイルとテンプレート
- **prisma/**: データベーススキーマ定義、マイグレーションファイル、シードデータ
- **docs/**: プロジェクトの設計ドキュメント

## 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Prisma ORM, Supabase
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts, ApexCharts, Nivo
- **Database**: PostgreSQL (via Supabase)
- **Development**: pnpm, Biome
- **Testing**: Jest

## 画面イメージ

![アプリケーションのスクリーンショット](docs/images/screenshot.png)

※ 表示されている値は実際の値ではありません。


## ローカル開発手順

このプロジェクトはSupabaseローカル開発環境を使用してローカル開発を行います。

### 開発環境セットアップ

1. **初回セットアップ（推奨）**
```bash
pnpm run dev:setup
```
このコマンドで依存関係のインストール、データベースのリセット・マイグレーション・シードデータの投入を一括実行します。

2. **開発サーバーの起動**
```bash
pnpm run dev  # Webapp + 管理画面を同時起動（Supabase自動起動）
```

### よく使うコマンド

#### 開発関連
```bash
pnpm run dev           # Webapp + 管理画面を同時起動（推奨）
pnpm run dev:webapp    # Webappのみ起動
pnpm run dev:admin     # 管理画面のみ起動
```

#### データベース管理
```bash
pnpm run db:reset      # データベース完全リセット（データ削除 + マイグレーション + シード）
pnpm run db:migrate    # マイグレーション実行
pnpm run db:seed       # シードデータ投入
pnpm run db:studio     # Prisma Studio起動
```

#### コード品質チェック
```bash
pnpm run lint          # 全体のLint実行
pnpm run format        # コードフォーマット実行
pnpm run typecheck     # 型チェック実行
pnpm run test          # テスト実行
```

#### Supabase管理
```bash
pnpm run supabase:start   # Supabaseローカル環境起動
pnpm run supabase:stop    # Supabaseローカル環境停止
pnpm run supabase:status  # Supabase状態確認
```

#### ユーティリティ
```bash
pnpm run clean         # 全てのnode_modulesとSupabaseを停止
pnpm run fresh         # クリーンインストール + セットアップ
```

## データベースのマイグレーション

### 本番環境・開発環境
- Vercelで行われるwebappのbuild過程で自動的にマイグレーションが実行されます

### ローカル開発環境
- 以下のコマンドでマイグレーションを実行してください：
```bash
pnpm run db:migrate
```

### ブラウザからの確認方法

- **メインアプリ**: [http://localhost:3000](http://localhost:3000)
- **管理画面**: [http://localhost:3001](http://localhost:3001)
- **Supabase Studio**: [http://127.0.0.1:54323](http://127.0.0.1:54323)

### モックデータの使用

`webapp/.env.local` に以下を追加してモックデータを有効化：
```
USE_MOCK_DATA=true
```

設定後、トランザクションページのバックエンドがモックデータを返すようになります。

## サンプルデータ

`data/sampledata.csv` に政治資金の取引データのサンプルが含まれています。管理画面（ http://localhost:3001 ）の「CSVアップロード」機能からこのファイルをアップロードして確認できます。

## ライセンス

このプロジェクトは [GNU Affero General Public License v3.0](LICENSE) の下でライセンスされています。

### コントリビューション

このプロジェクトへのコントリビューションを行う場合は、[コントリビューターライセンス契約(CLA)](CLA.md) への同意が必要です。

## ライセンス表示

このソフトウェアを使用する場合は、適切なライセンス表示を行ってください。詳細は [LICENSE](LICENSE) ファイルをご確認ください。
