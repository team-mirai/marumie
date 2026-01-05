# みらいまる見え政治資金

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/team-mirai/marumie/actions/workflows/ci.yml/badge.svg)](https://github.com/team-mirai/marumie/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/team-mirai/marumie/branch/develop/graph/badge.svg)](https://codecov.io/gh/team-mirai/marumie)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Biome](https://img.shields.io/badge/Biome-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/team-mirai/marumie)

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
│   │   ├── server/contexts/ # Bounded Context ベース構成
│   │   │   └── public-finance/  # 政治資金データの公開・可視化
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

ローカル開発環境のセットアップ手順は [開発環境セットアップガイド](docs/getting-started.md) を参照してください。

## ライセンス

このプロジェクトは [GNU Affero General Public License v3.0](LICENSE) の下でライセンスされています。

### コントリビューション

このプロジェクトへのコントリビューションを行う場合は、[コントリビューターライセンス契約(CLA)](CLA.md) への同意が必要です。

## ライセンス表示

このソフトウェアを使用する場合は、適切なライセンス表示を行ってください。詳細は [LICENSE](LICENSE) ファイルをご確認ください。
