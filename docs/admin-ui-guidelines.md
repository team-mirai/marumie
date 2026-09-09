# admin UI コンポーネントガイドライン

admin アプリケーションで UI コンポーネントを使用する際のルールを定めます。

## 原則

- **admin はライトモードのみ**（ダークモードは提供しない）
- **Team Mirai ブランド（白ベース + Mirai Teal + 黒1pxボーダー + ピル形状）に従う**
  （正は [デザインハンドオフ](reference/design_handoff_admin_redesign/README.md)）
- **shadcn UI ベースの `ui/*` コンポーネントを使用する**（カスタム実装は非推奨）
- **import は index.ts 経由**で行う
- **CSS 変数と cn() を使う**（直書きスタイル禁止）

```typescript
import { Button, Input, Label } from "@/client/components/ui";
```

## デザイン言語

- ブランド色は **Mirai Teal `#30BCA7` のみ**。青・紫・オレンジは使わない
- ページ背景 `#F8F8F8`（`bg-background`）、カードは白（`bg-card`）+ 黒1px枠 + 角丸8px
- **ピル（`rounded-full`）が署名形状**: ボタン・input・select はすべてピル
- 罫線は黒1px（強調は1.5px）。テーブルの行罫線など弱い線は `border-border-soft`（`#E5E5E5`）
- 数字・日付・英字は Poppins（`font-latin`）、日本語は Hiragino Kaku Gothic → Noto Sans（`font-sans`、body 既定）
- 日付表記は `YYYY.MM.DD`（ピリオド区切り）
- hover は 120〜200ms ease-out の**色変化のみ**（スケール・バウンス禁止）
- 影はほぼ使わない

### ボタン（3系統）

`Button` の variant で表現する。すべてピル形状。

| variant | 見た目 | 用途 |
|---|---|---|
| `default` | teal 塗り + 白文字（hover `#089781`） | プライマリアクション |
| `secondary` / `outline` | 白地 + 黒1.5px枠（hover `#F8F8F8`） | セカンダリアクション |
| `destructive` | 白地 + 赤枠 + 赤文字（hover `#FDF0F1`） | 削除などの破壊的操作 |

- disabled は枠 `#CCC`・文字 `#B1B1B1`・`cursor: not-allowed`（**opacity で薄くしない**）

### フォーム・フォーカスリング

- フォームラベル（`Label`）は 12px/700（`text-xs font-bold`）が既定。必須は `<span className="text-destructive">*</span>` を付ける。使用側で `text-xs font-bold` を重ねて指定しない
- input / select はピル形状・黒枠・白地。placeholder は `#B1B1B1`（`text-disabled-foreground`）
- focus 時は枠が teal + `0 0 0 2px #E2F6F3` のリング（`focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring-soft`）
- ボタンの focus-visible は `ring-2 ring-ring ring-offset-2`

### アイコン

- **Phosphor Icons（regular weight）** を使用する。`lucide-react` は使用しない
- import は `@phosphor-icons/react/dist/ssr` から行う（サーバー/クライアント両対応）

```typescript
import { Trash, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
```

- 絵文字・グラデーションは使わない

### ローディング

- スピナーは teal（`border-primary border-t-transparent` または `CircleNotch` + `animate-spin`）

## リファレンス

### カラー変数

`admin/src/app/globals.css` の `@theme` で定義された変数を使用する。

```css
bg-background              /* ページ背景 #F8F8F8 */
bg-card                    /* カード背景 #FFF */
text-foreground            /* テキスト色 #000 */
text-muted-foreground      /* 補助テキスト #666 */
text-disabled-foreground   /* placeholder・無効文字 #B1B1B1 */
border-border              /* 標準ボーダー #000 */
border-border-soft         /* 弱い罫線 #E5E5E5 */
border-disabled-border     /* 無効枠 #CCC */
bg-input                   /* 入力フィールド背景 #FFF */
bg-primary                 /* Mirai Teal #30BCA7 */
bg-primary-hover           /* teal hover #089781 */
text-primary-active        /* teal deep（リンク・アクティブ） #0F8472 */
bg-accent                  /* teal-100 #E2F6F3（アクティブ nav・バッジ背景） */
text-accent-foreground     /* teal deep #0F8472 */
bg-destructive             /* 危険色 #E63946 */
bg-destructive-hover       /* 赤枠ボタンの hover #FDF0F1 */
ring-ring                  /* フォーカスリング teal */
ring-ring-soft             /* 入力フォーカスリング #E2F6F3 */
text-teal-soft             /* 見出し下線 #64D8C6 */
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

3. テーマ方針への適合を確認（後述）

利用可能なコンポーネント一覧: https://ui.shadcn.com/docs/components

### テーマ方針（ライトモードのみ）

admin は **ライトモードのみ** で提供する。ダークモードは提供せず、
`dark:` バリアントや `prefers-color-scheme` による切り替えは実装しない。

- shadcn コンポーネント追加時、公式定義に含まれる `dark:` プレフィックス付きクラスは削除する
- あわせて既存の `ui/*` に倣い、ピル形状・黒枠・teal フォーカスリング・disabled ルール（opacity 不使用）へ調整する
- アイコンが含まれる場合は lucide-react を Phosphor Icons に置き換える
- 色・形状（デザイントークン、コンポーネントの見た目）の正は
  デザインハンドオフ [docs/reference/design_handoff_admin_redesign/README.md](reference/design_handoff_admin_redesign/README.md) を参照する

## Toast 通知

`import { toast } from "sonner"` で使用。`toast.success("メッセージ")` / `toast.error("エラー")` で表示。
