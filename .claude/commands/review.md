---
description: 現在の変更に対して設計レビューを行う
---

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 変更ファイル: !`git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached 2>/dev/null || git diff --name-only`

## タスク

現在のブランチの変更内容に対して、設計観点でレビューを行ってください。

### レビュー対象の取得

1. 変更されたファイルの差分を `git diff` で取得する
2. 必要に応じて関連ファイルも読み込む

### サーバーサイド（DDD）のレビュー観点

`admin/src/server/contexts/` 配下の変更がある場合、以下を確認：

- **レイヤー構造**: 各レイヤーの責務が適切か
  - `presentation/loaders`: データ取得のみ
  - `presentation/actions`: 副作用を伴う操作 + revalidate
  - `application/usecases`: ユースケースロジック
  - `domain/models`: ドメインロジック（ビジネスルール）
  - `domain/services`: 複数エンティティをまたぐ処理のみ
  - `infrastructure/repositories`: データアクセス層
- **レイヤー間の呼び出しルール（重要）**:
  - ❌ loader/action が repository を直接呼ぶのは禁止
  - ✅ loader/action → usecase → repository の順で呼び出す
  - 理由: usecase をスキップするとビジネスロジックが presentation 層に漏れる
- **ドメインモデル**: ロジックがモデルに実装されているか（貧血ドメインモデルになっていないか）
- **依存の方向**: 外側のレイヤーが内側に依存しているか（逆依存がないか）
- **server-only**: サーバー専用モジュールに `import "server-only"` があるか

### フロントエンド（React/Next.js）のレビュー観点

`admin/src/client/` または `admin/src/app/` 配下の変更がある場合、以下を確認：

- **コンポーネント分割**: 適切な粒度で分割されているか
- **"use client" の使用**: 必要な場合のみ使用しているか
- **shadcn UI の使用**: カスタムコンポーネントではなく shadcn を使っているか
  - `Button`, `Input`, `Card` 等は `@/client/components/ui` から import
  - カスタム実装（`Button.tsx`, `Input.tsx`, `Card.tsx`, `Selector.tsx`）は非推奨
- **カラー変数**: shadcn 標準の CSS 変数を使用しているか
  - 推奨: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground` 等
  - 非推奨: `bg-primary-bg`, `bg-primary-panel`, `text-primary-muted` 等
- **cn() ユーティリティ**: クラス名の合成に使用しているか

### 共通のレビュー観点

- **import パス**: `@/` から始まる絶対パスを使用しているか（相対パス禁止）
- **型定義**: 適切な型が定義されているか
- **命名**: 変数名・関数名・ファイル名が適切か

## 出力形式

以下の形式でレビュー結果を報告してください：

```
## レビュー結果

### ✅ 良い点
- ...

### ⚠️ 改善提案
- **[ファイル名:行番号]** 問題の説明
  - 提案: ...

### ❌ 要修正
- **[ファイル名:行番号]** 問題の説明
  - 理由: ...
  - 修正案: ...
```

重大な問題がない場合は「✅ 設計上の問題は見つかりませんでした」と報告してください。
