# wtp (git worktree) 使い方ガイド

wtp は git worktree を便利に使うための CLI ツール。
並行して複数のブランチで作業したいときに使う。

## インストール

```bash
brew install satococoa/tap/wtp
```

## 基本コマンド

### ワークツリーの作成

```bash
# 新しいブランチを作成してワークツリーを追加
wtp add -b feature/new-feature

# 既存のブランチからワークツリーを追加
wtp add feature/existing-branch
```

ブランチ名の `/` はディレクトリ構造に変換される。
例: `feature/new-feature` → `.git/worktrees/feature/new-feature/`

### ワークツリーへの移動

```bash
# 指定したワークツリーに移動
wtp cd feature/new-feature

# メインのワークツリー（元のディレクトリ）に戻る
wtp cd @
```

### ワークツリーの一覧

```bash
wtp list
```

### ワークツリーの削除

```bash
# ワークツリーのみ削除
wtp remove feature/new-feature

# ワークツリーとブランチを一緒に削除
wtp remove --with-branch feature/new-feature
```

## このリポジトリの設定

`.wtp.yml` により、ワークツリー作成時に以下が自動実行される：

1. 環境変数ファイルのコピー（`.env`, `webapp/.env.local`, `admin/.env.local`）
2. `pnpm install`
3. `pnpm db:generate`（Prisma クライアント生成）

## ユースケース

### 緊急のバグ修正

現在の作業を中断せずに hotfix を作成：

```bash
# hotfix 用のワークツリーを作成
wtp add -b hotfix/urgent-bug

# hotfix に移動して修正
wtp cd hotfix/urgent-bug
# ... 修正作業 ...

# 元の作業に戻る
wtp cd @

# 後片付け
wtp remove --with-branch hotfix/urgent-bug
```

### 複数機能の並行開発

```bash
wtp add -b feature/auth
wtp add -b feature/dashboard

# 別々のターミナルで各ワークツリーを開いて並行作業
```
