# admin UI コンポーネントガイドライン

admin アプリケーションで shadcn UI を使用する際のルールを定めます。

## 原則

- **新規開発では shadcn UI コンポーネントを使用する**
- カスタム UI (`Button.tsx`, `Input.tsx`, `Card.tsx`, `Selector.tsx`) は非推奨
- 生の HTML 要素 (`<button>`, `<input>`) にスタイルを直書きしない

## コンポーネント配置

```
admin/src/client/components/ui/
├── shadcn/          # shadcn UI コンポーネント（npx shadcn@latest add で追加）
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── index.ts         # 全コンポーネントの re-export
├── Button.tsx       # [非推奨] カスタム実装
├── Input.tsx        # [非推奨] カスタム実装
├── Card.tsx         # [非推奨] カスタム実装
└── Selector.tsx     # [非推奨] カスタム実装
```

## import ルール

```typescript
// 推奨: index.ts 経由で import
import { ShadcnButton, ShadcnInput, Label, Dialog } from "@/client/components/ui";

// 非推奨: 個別ファイルから直接 import
import Button from "@/client/components/ui/Button";
import { Button } from "@/client/components/ui/shadcn/button";
```

## コンポーネント対応表

| 用途 | 推奨（shadcn） | 非推奨（カスタム） |
|------|----------------|-------------------|
| ボタン | `ShadcnButton` | `Button` |
| テキスト入力 | `ShadcnInput` | `Input` |
| カード | `ShadcnCard`, `CardHeader`, `CardContent` 等 | `Card` |
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
          <ShadcnButton>確定</ShadcnButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 非推奨: カスタムモーダル実装
function MyModal() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-primary-panel rounded-xl p-6">
        {/* ... */}
      </div>
    </div>
  );
}
```

## スタイリング

### カラー変数

shadcn UI 標準の CSS 変数を使用してください。

```css
/* 推奨: shadcn 標準変数 */
bg-background      /* 背景色 */
bg-card            /* カード背景 */
text-foreground    /* テキスト色 */
text-muted-foreground  /* 補助テキスト */
border-border      /* ボーダー */
bg-primary         /* プライマリ色 */
bg-destructive     /* 危険色（赤） */

/* 非推奨: カスタム変数（段階的に移行予定） */
bg-primary-bg
bg-primary-panel
text-primary-muted
border-primary-border
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

## 新規コンポーネント追加

shadcn UI コンポーネントを追加する場合:

```bash
cd admin
npx shadcn@latest add [component-name]
```

追加後、`index.ts` に re-export を追加してください。
