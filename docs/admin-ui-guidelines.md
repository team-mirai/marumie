# admin UI コンポーネントガイドライン

admin アプリケーションで shadcn UI を使用する際のルールを定めます。

## 原則

- **shadcn UI コンポーネントを使用する**（カスタム実装は非推奨）
- **import は index.ts 経由**で行う
- **CSS 変数と cn() を使う**（直書きスタイル禁止）

```typescript
import { Button, Input, Label } from "@/client/components/ui";
```

## リファレンス

### カラー変数

shadcn UI 標準の CSS 変数を使用する。

```css
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
```

### クラス名の合成

`cn()` ユーティリティを使用する。

```typescript
import { cn } from "@/client/lib";

// 推奨
<div className={cn("base-class", condition && "conditional-class", className)} />

// 非推奨
<div className={`base-class ${condition ? "conditional-class" : ""}`} />
```

## 運用ガイド

### 新規コンポーネント追加

1. インストール
   ```bash
   cd admin
   npx shadcn@latest add [component-name]
   ```

2. `admin/src/client/components/ui/index.ts` に re-export を追加
   ```typescript
   export { Tooltip, TooltipTrigger, TooltipContent } from "@/client/components/ui/tooltip";
   ```

3. ダークモード対応を確認（後述）

利用可能なコンポーネント一覧: https://ui.shadcn.com/docs/components

### ダークモード対応

admin は **Dark Blue テーマ（ダークモード固定）** を採用している。
テーマ定義は `admin/src/app/globals.css` の `@theme` ブロックにある。

shadcn コンポーネントの `dark:` プレフィックス付きクラスは自動適用されないため、
コンポーネント追加時は `dark:` の値をデフォルトとして適用する。

```tsx
// 公式の定義
"bg-transparent dark:bg-input/30"

// admin での適用（dark: を除去してデフォルトに）
"bg-input/30"
```

## Toast 通知

`import { toast } from "sonner"` で使用。`toast.success("メッセージ")` / `toast.error("エラー")` で表示。

