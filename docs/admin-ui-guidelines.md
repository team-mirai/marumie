# admin UI コンポーネントガイドライン

admin アプリケーションで shadcn UI を使用する際のルールを定めます。

## 原則

- **新規開発では shadcn UI コンポーネントを使用する**
- カスタム UI (`Button.tsx`, `Input.tsx`, `Card.tsx`, `Selector.tsx`) は非推奨
- 生の HTML 要素 (`<button>`, `<input>`) にスタイルを直書きしない

## コンポーネント配置

```
admin/src/client/components/ui/
├── button.tsx       # shadcn UI コンポーネント
├── input.tsx
├── card.tsx
├── dialog.tsx
├── select.tsx
├── textarea.tsx
├── checkbox.tsx
├── label.tsx
├── table.tsx
├── form.tsx
├── index.ts         # 全コンポーネントの re-export
├── Button.tsx       # [非推奨] カスタム実装
├── Input.tsx        # [非推奨] カスタム実装
├── Card.tsx         # [非推奨] カスタム実装
└── Selector.tsx     # [非推奨] カスタム実装
```

## import ルール

```typescript
// 推奨: index.ts 経由で import
import { Button, Input, Label, Dialog } from "@/client/components/ui";

// 非推奨: 個別ファイルから直接 import
import Button from "@/client/components/ui/Button";
import { Button } from "@/client/components/ui/button";
```

## コンポーネント対応表

| 用途 | 推奨（shadcn） | 非推奨（カスタム） |
|------|----------------|-------------------|
| ボタン | `Button` | カスタム `Button` |
| テキスト入力 | `Input` | カスタム `Input` |
| カード | `Card`, `CardHeader`, `CardContent` 等 | カスタム `Card` |
| セレクト | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` | `Selector` |
| ダイアログ | `Dialog`, `DialogContent`, `DialogHeader` 等 | カスタム実装のモーダル |
| ラベル | `Label` | - |
| テーブル | `Table`, `TableHeader`, `TableRow` 等 | - |
| フォーム | `Form`, `FormField`, `FormItem` 等 | - |
| チェックボックス | `Checkbox` | - |
| テキストエリア | `Textarea` | - |

## ダイアログ/モーダル

shadcn `Dialog` コンポーネントを使用してください。

```tsx
// 推奨
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from "@/client/components/ui";

function MyDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>タイトル</DialogTitle>
        </DialogHeader>
        {/* コンテンツ */}
        <DialogFooter>
          <Button>確定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 非推奨: カスタムモーダル実装
function MyModal() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-card rounded-xl p-6">
        {/* ... */}
      </div>
    </div>
  );
}
```

## スタイリング

### テーマ

shadcn/ui 公式の **Dark Blue テーマ**（ダークモード固定）を採用しています。
テーマ定義は `admin/src/app/globals.css` の `@theme` ブロックにあります。

### ダークモード対応

admin はダークモード固定のため、shadcn コンポーネントの `dark:` プレフィックス付きクラスは自動的に適用されません。
コンポーネントを追加・更新する際は、`dark:` プレフィックスの値をデフォルトとして適用してください。

例:
```tsx
// 公式の定義
"bg-transparent dark:bg-input/30"

// admin での適用（dark: を除去してデフォルトに）
"bg-input/30"
```

### カラー変数

shadcn UI 標準の CSS 変数を使用してください。

```css
/* 推奨: shadcn 標準変数 */
bg-background         /* 背景色 */
bg-card               /* カード背景 */
text-foreground       /* テキスト色 */
text-muted-foreground /* 補助テキスト */
border-border         /* ボーダー */
bg-input              /* 入力フィールド背景 */
bg-primary            /* プライマリ色 */
bg-secondary          /* セカンダリ色（ホバー等） */
bg-destructive        /* 危険色（赤） */
ring-ring             /* フォーカスリング */

/* 非推奨: カスタム変数 → 以下に移行 */
bg-primary-bg       → bg-background
bg-primary-panel    → bg-card
text-primary-muted  → text-muted-foreground
border-primary-border → border-border
bg-primary-input    → bg-input
bg-primary-hover    → bg-secondary
text-primary-accent → text-primary
ring-primary-accent → ring-ring
```

### クラス名の合成

`cn()` ユーティリティを使用してください。

```typescript
import { cn } from "@/client/lib";

// 推奨
<div className={cn("base-class", condition && "conditional-class", className)} />

// 非推奨
<div className={`base-class ${condition ? "conditional-class" : ""} ${className}`} />
```

## インストール済みコンポーネント

現在インストールされている shadcn コンポーネント:

- `button` - ボタン
- `card` - カード
- `checkbox` - チェックボックス
- `dialog` - ダイアログ/モーダル
- `form` - フォーム（react-hook-form 連携）
- `input` - テキスト入力
- `label` - ラベル
- `select` - セレクトボックス
- `table` - テーブル
- `textarea` - テキストエリア

必要なコンポーネントは必要になったタイミングで追加してください。

## 新規コンポーネント追加

### 1. コンポーネントをインストール

```bash
cd admin
npx shadcn@latest add [component-name]
```

利用可能なコンポーネント一覧: https://ui.shadcn.com/docs/components

例:
```bash
npx shadcn@latest add tooltip
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tabs
```

### 2. index.ts に re-export を追加

`admin/src/client/components/ui/index.ts` に追加したコンポーネントの export を追記:

```typescript
// 例: tooltip を追加した場合
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/client/components/ui/tooltip";
```

### 3. ダークモード対応を確認

追加したコンポーネントに `dark:` プレフィックス付きのクラスがある場合、
admin はダークモード固定のため、`dark:` の値をデフォルトとして適用するよう修正が必要です。

### 注意: components.json の設定

`admin/components.json` は Tailwind v4 用に設定されています。
この設定が正しくないと、CLI が古いバージョンのコンポーネントを取得します。

```json
{
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  }
}
```
