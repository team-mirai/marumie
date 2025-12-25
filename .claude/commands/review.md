---
description: 現在の変更に対して設計レビューを行う
---

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 変更ファイル: !`git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached 2>/dev/null || git diff --name-only`

## タスク

現在のブランチの変更内容に対して、設計観点でレビューを行ってください。

### レビュー前の確認

1. 変更されたファイルの差分を `git diff` で取得する
2. 必要に応じて関連ファイルも読み込む
3. **以下のガイドラインを参照**:
   - [docs/admin-architecture-guide.md](docs/admin-architecture-guide.md) - アーキテクチャ全般、レイヤー設計、DDD
   - [docs/admin-ui-guidelines.md](docs/admin-ui-guidelines.md) - UIコンポーネント、スタイリング

### サーバーサイド（admin DDD）のレビュー観点

`admin/src/server/contexts/` 配下の変更がある場合、[docs/admin-architecture-guide.md](docs/admin-architecture-guide.md) に基づきレビューする。

### フロントエンド（React/Next.js）のレビュー観点

`admin/src/client/` または `admin/src/app/` 配下の変更がある場合、[docs/admin-ui-guidelines.md](docs/admin-ui-guidelines.md) に基づきレビューする。

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
