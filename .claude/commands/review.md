---
description: 現在の変更に対して設計レビューを行う (project)
---

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 変更ファイル: !`git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached 2>/dev/null || git diff --name-only`

## タスク

以下の手順で現在のブランチの変更内容に対して設計レビューを行ってください：

1. **変更内容の把握**: `git diff` で変更されたファイルの差分を取得し、変更内容を把握する。必要に応じて関連ファイルも読み込む。

2. **ガイドラインの参照**: 変更対象に応じて以下のガイドラインを参照する。
   - `admin/src/server/contexts/` または `webapp/src/server/contexts/` 配下の変更: [docs/backend-architecture-guide.md](docs/backend-architecture-guide.md)
   - `admin/src/client/` または `admin/src/app/` 配下の変更: [docs/admin-ui-guidelines.md](docs/admin-ui-guidelines.md)

3. **レビュー実施**: 以下の観点でレビューを行う。
   - **アーキテクチャ**: ガイドラインに沿ったレイヤー構成・責務分離ができているか
   - **import パス**: `@/` から始まる絶対パスを使用しているか（相対パス禁止）
   - **型定義**: 適切な型が定義されているか
   - **命名**: 変数名・関数名・ファイル名が適切か

4. **結果報告**: 以下の形式でレビュー結果を報告する。重大な問題がない場合は「✅ 設計上の問題は見つかりませんでした」と報告する。

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
