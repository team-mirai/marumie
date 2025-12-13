# Bounded Context 導入設計

## ルール

- TypeScript の import は `@/` から始まる絶対パスを使用する（相対パス禁止）

## 目標構成

```
admin/src/server/contexts/
├── data-import/           # データ取り込みコンテキスト
│   ├── presentation/
│   │   ├── loaders/
│   │   └── actions/
│   ├── application/
│   │   └── usecases/
│   ├── domain/
│   │   ├── services/
│   │   └── models/
│   └── infrastructure/
│       └── repositories/
│
├── report/                # 政治資金報告書書き出しコンテキスト
│   ├── presentation/
│   │   ├── loaders/
│   │   └── actions/
│   ├── application/
│   │   └── usecases/
│   ├── domain/
│   │   ├── services/
│   │   └── models/
│   └── infrastructure/
│       └── repositories/
│
├── common/                # 汎用・未分類
│   ├── presentation/
│   │   ├── loaders/
│   │   └── actions/
│   ├── application/
│   │   └── usecases/
│   ├── domain/
│   │   ├── services/
│   │   └── models/
│   └── infrastructure/
│       └── repositories/
│
└── shared/                # コンテキスト横断で共有
    ├── domain/
    ├── application/
    └── infrastructure/
```

---

## 実行手順

### Phase 1: data-import

1. `contexts/data-import/` ディレクトリ構造を作成
2. CSV取り込み関連ファイルを移動
3. import パスを更新
4. `npm run typecheck && npm run lint` 実行
5. CSVアップロード機能の動作確認
6. feature ブランチを作成してコミット・PR・マージ

### Phase 2: report

1. `contexts/report/` ディレクトリ構造を作成
2. XMLエクスポート関連ファイルを移動
3. import パスを更新
4. `npm run typecheck && npm run lint` 実行
5. XMLエクスポート機能の動作確認
6. feature ブランチを作成してコミット・PR・マージ

### Phase 3: common + shared

1. `contexts/common/` と `contexts/shared/` ディレクトリ構造を作成
2. 残りのファイルを移動
3. import パスを更新
4. `npm run typecheck && npm run lint` 実行
5. 各機能の動作確認
6. 旧ディレクトリを削除
7. CLAUDE.md を更新
8. READMEにディレクトリ構成の説明を追加
9. feature ブランチを作成してコミット・PR・マージ
