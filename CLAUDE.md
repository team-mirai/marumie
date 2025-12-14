# Claude Code 設定

## 設計作業ルール

設計作業を依頼された場合は、以下のルールに従ってファイルを作成すること：

- ファイル名: `YYYYMMDD_HHMM_{日本語の作業内容}.md`
- 保存場所: `docs/` 以下
- フォーマット: Markdown

例: `docs/20250815_1430_ユーザー認証システム設計.md`

## Next アプリケーションの実装ルール

- 動的に更新する必要がある画面（チャットなど）以外は、データ取得はなるべくサーバーコンポーネントに寄せる
- client 側で動作する必然性（状態管理・ブラウザ API 利用・重い UI ライブラリ等）がない限り "use client" は利用しない
- サーバーコンポーネントからのデータ取得は、原則 loaders などに切り出したサーバー処理を使い責務を分離する
- サーバー側で動作することを期待する処理には import "server-only" を書き、誤ってクライアントから参照されないようにする
- サーバーアクション（"use server"処理）は、データ更新やファイルアップロードなど副作用を伴う操作のためだけに使い、あわせて revalidatePath や revalidateTag などの再検証処理までを 1 セットで行う
- クライアント側でのデータ取得は例外として、リアルタイム通信・高頻度ポーリング・ユーザー操作に即応する検索・オフライン最適化（React Query など）に限って許容する

## コード構成

### webapp

```
webapp/src/
├── app/          # App Router に基づくルーティング、API エンドポイント
├── client/
│   ├── components/  # Reactコンポーネント
│   └── lib/         # クライアントで動作するヘルパーなど
├── server/
│   ├── lib/         # データ加工・変換処理
│   ├── repositories/  # データベースアクセス層
│   ├── usecases/    # loaderやactionから呼び出されるトップレベル関数
│   ├── loaders/     # サーバーサイドでのデータ取得処理
│   └── actions/     # サーバーアクション（"use server"）による副作用処理
└── types/        # 型定義
```

### admin（bounded context ベース）

```
admin/src/
├── app/          # App Router に基づくルーティング、API エンドポイント
├── client/
│   ├── components/  # Reactコンポーネント
│   └── lib/         # クライアントで動作するヘルパーなど
├── server/contexts/
│   ├── data-import/   # CSVデータ取り込み
│   ├── report/        # 政治資金報告書XMLエクスポート
│   ├── auth/          # 認証関連処理
│   └── shared/        # コンテキスト横断で共有（prisma client、汎用リポジトリなど）
└── types/        # 型定義
```

各コンテキストは以下の構造を持つ：

```
contexts/{コンテキスト名}/
├── presentation/
│   ├── loaders/     # サーバーサイドでのデータ取得処理
│   └── actions/     # サーバーアクション（"use server"）による副作用処理
├── application/
│   └── usecases/    # loaderやactionから呼び出されるトップレベル関数
├── domain/
│   ├── services/    # ドメインサービス（後述の例外ケース用）
│   └── models/      # ドメインモデル
└── infrastructure/
    └── repositories/  # データベースアクセス層
```

### ドメインロジックの実装ルール

- ドメインロジックは原則としてドメインモデルに実装する
- ドメインサービスは複数エンティティをまたぐ場合や外部連携が必要な場合のみ使用

### import ルール

- TypeScript の import は `@/` から始まる絶対パスを使用する（相対パス禁止）

# GitHub操作ルール
- ユーザーからPRを出して、と言われたときは、現在の作業のフィーチャーブランチを切りコミットを行ってからPRを出すようにする
- developやmainへの直接pushは禁止です
- Prismaのマイグレーションを含む差分は自動デプロイで環境を壊しうるので、ユーザーに許可を取ってから実行してください
- ロジックにまつわる変更をしたあとのPushの前には、プロジェクトルートで　`npm run typecheck` と `npm run lint` を行ってからPushするようにしてください
- PR作成時は `gh pr create` コマンドに `--base` オプションを付けず、デフォルトのベースブランチを使用してください
