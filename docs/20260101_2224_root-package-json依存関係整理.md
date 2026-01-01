# root package.json 依存関係整理

## 目的

開発者が依存関係の管理場所を明確に把握できるようにし、Dependabot 導入時の設定を簡潔にするため。

## 背景

現在、root の package.json に webapp/admin 固有の依存が混在しており、以下の問題がある：

- どのパッケージがどの workspace で使われているか不明確
- Dependabot の更新PRがどの workspace に影響するか判断しづらい
- pnpm の hoisting に依存した暗黙的な参照が発生している

## 現状分析

### root package.json の devDependencies

| パッケージ | root で必要か | 理由 |
|-----------|--------------|------|
| `@biomejs/biome` | 必要 | root の format スクリプトで使用 |
| `@tailwindcss/postcss` | **不要** | webapp/admin に既存 |
| `@types/node` | **不要** | webapp/admin に既存 |
| `@types/react` | **不要** | webapp/admin に既存 |
| `@types/react-dom` | **不要** | webapp/admin に既存 |
| `concurrently` | 必要 | root の dev スクリプトで使用 |
| `dependency-cruiser` | 必要 | root の depcruise スクリプトで使用 |
| `dotenv-cli` | 必要 | root の db:migrate で使用 |
| `knip` | 必要 | root の knip スクリプトで使用 |
| `lint-staged` | 必要 | pre-commit hook で使用 |
| `prisma` | 必要 | db:generate 等で使用 |
| `simple-git-hooks` | 必要 | postinstall で使用 |
| `tailwindcss` | **不要** | webapp/admin に既存 |
| `tsx` | 必要 | db:seed で使用 |
| `typescript` | 必要 | prisma/seed.ts の型チェック用 |

### root package.json の dependencies

| パッケージ | 実際の使用箇所 | 判定 |
|-----------|---------------|------|
| `@nivo/sankey` | webapp のみ | webapp に移動 |
| `@prisma/client` | prisma/seed.ts, webapp, admin | root に残す（seed で使用） |
| `@supabase/supabase-js` | prisma/seed.ts, admin | root に残す（seed で使用） |
| `dotenv` | prisma/seed.ts | root に残す |
| `next` | webapp, admin | root から削除（各 workspace に既存） |
| `react` | webapp, admin | root から削除（各 workspace に既存） |
| `react-dom` | webapp, admin | root から削除（各 workspace に既存） |

### 使用箇所の根拠

- `@nivo/sankey`: webapp/src/client/components/top-page/features/charts/SankeyChart.tsx で import
- `@prisma/client`: prisma/seed.ts で import、webapp/admin でも使用
- `@supabase/supabase-js`: prisma/seeds/users.ts で import、admin でも使用
- `dotenv`: prisma/seed.ts で `import 'dotenv/config'`
- `next`, `react`, `react-dom`: webapp/package.json, admin/package.json に既に存在

## 変更内容

### root package.json

**削除する dependencies:**
- `@nivo/sankey`
- `next`
- `react`
- `react-dom`

**残す dependencies:**
- `@prisma/client` (seed.ts で使用)
- `@supabase/supabase-js` (seed.ts で使用)
- `dotenv` (seed.ts で使用)

**削除する devDependencies:**
- `@tailwindcss/postcss`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `tailwindcss`

### webapp/package.json

**追加する dependencies:**
- `@nivo/sankey: ^0.99.0`

### admin/package.json

変更なし（必要なパッケージは既に存在）

## 変更後の構成

```
root package.json
├── dependencies
│   ├── @prisma/client       ← seed.ts 用
│   ├── @supabase/supabase-js ← seed.ts 用
│   └── dotenv               ← seed.ts 用
└── devDependencies
    ├── @biomejs/biome
    ├── concurrently
    ├── dependency-cruiser
    ├── dotenv-cli
    ├── knip
    ├── lint-staged
    ├── prisma
    ├── simple-git-hooks
    ├── tsx
    └── typescript

webapp/package.json
├── dependencies
│   ├── @nivo/sankey    ← 追加
│   ├── next
│   ├── react
│   └── ...

admin/package.json
├── dependencies
│   ├── @supabase/supabase-js  ← 既存
│   ├── next
│   ├── react
│   └── ...
```

## 確認事項

変更後に以下を確認する：

1. `pnpm install` が正常に完了する
2. `pnpm dev` で webapp/admin が起動する
3. `pnpm db:seed` が正常に動作する
4. `pnpm build:all` が成功する
5. `pnpm test` が通る
