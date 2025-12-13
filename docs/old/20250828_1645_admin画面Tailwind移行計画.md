# admin画面 Tailwind CSS 移行計画

## 概要

admin画面を生CSSからTailwind CSSにプログレッシブに移行するための実装計画と手順書。

## 現状分析

### 現在のCSS構造
- メインスタイルファイル: `admin/src/app/styles.css`
- CSS Variables使用: `--bg`, `--panel`, `--muted`, `--accent`
- グリッドレイアウト中心の構造
- コンポーネント内でインラインスタイル混在

### 使用されている主要クラス
- `.container` - メインレイアウトグリッド
- `.sidebar` - サイドバーコンテナ
- `.content` - メインコンテンツエリア
- `.card` - カードコンポーネント
- `.nav` - ナビゲーション
- `.input` - フォーム入力
- `.button` - ボタン
- `.muted` - ミュート色テキスト

## 移行戦略

### Phase 1: 基盤構築
1. **Tailwind CSS インストール・設定**
   - tailwindcss, autoprefixer, postcss
   - `tailwind.config.ts` 設定
   - `postcss.config.js` 設定

2. **カラーシステム移行**
   - CSS Variables → Tailwind カスタムカラー
   - ダークテーマ設定

3. **既存CSS保持設定**
   - `@layer base` で既存スタイル保持
   - 段階的置き換え準備

### Phase 2: コンポーネント移行
1. **ユーティリティコンポーネントから開始**
   - Button コンポーネント
   - Input コンポーネント
   - Card コンポーネント

2. **レイアウトコンポーネント移行**
   - Sidebar
   - Container/Layout

3. **ページレベル移行**
   - 各ページファイルを順次移行

### Phase 3: 最適化・クリーンアップ
1. **不要CSS削除**
2. **パフォーマンス最適化**
3. **ドキュメント更新**

## 実装詳細

### Tailwind設定

#### カスタムカラー定義
```javascript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: {
        bg: '#0b1020',
        panel: '#141a2d', 
        muted: '#9aa4bf',
        accent: '#5b8cff'
      }
    }
  }
}
```

#### ダークモード設定
```javascript
darkMode: 'class' // class-based dark mode
```

### 移行対象コンポーネント優先度

#### 高優先度 (Phase 1で実装)
- `Sidebar.tsx` - ナビゲーションの中核
- Button系スタイル - 全体で使用
- Input系スタイル - フォームで必須

#### 中優先度 (Phase 2で実装)
- `UserManagement.tsx`
- `CsvPreview.tsx` 
- `PoliticalOrganizationForm.tsx`

#### 低優先度 (Phase 3で実装)
- ページレベルレイアウト
- 細かなスタイル調整

### CSS-in-JSからTailwindへの変換例

#### Before (現在)
```css
.sidebar {
  background: var(--panel);
  padding: 16px;
}
.nav a {
  color: white;
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 8px;
}
```

#### After (Tailwind)
```tsx
<aside className="bg-primary-panel p-4">
  <nav className="space-y-2">
    <Link className="text-white no-underline px-2.5 py-2 rounded-lg hover:bg-slate-700">
      ...
    </Link>
  </nav>
</aside>
```

### 共存戦略

#### 段階的置き換え
```css
/* styles.css - 既存CSSを @layer legacy で保持 */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer legacy {
  /* 既存CSS（未移行部分）をここに保持 */
  .legacy-button {
    /* 旧来のボタンスタイル */
  }
}
```

#### クラス名重複回避
- 既存クラス → `legacy-*` prefix
- 新規Tailwind → utility-first

## 実装スケジュール

### Week 1: 基盤構築
- [ ] Tailwind インストール・設定
- [ ] カラーシステム移行
- [ ] 基本コンポーネント (Button, Input, Card)

### Week 2: メインコンポーネント
- [ ] Sidebar コンポーネント移行
- [ ] UserManagement 移行
- [ ] CsvPreview 移行

### Week 3: ページ移行
- [ ] 各ページファイル移行
- [ ] レスポンシブ対応確認
- [ ] クロスブラウザテスト

### Week 4: 最適化
- [ ] 不要CSS削除
- [ ] パフォーマンス最適化
- [ ] ドキュメント整備

## 品質保証

### テスト項目
1. **ビジュアル回帰テスト**
   - 各コンポーネントの見た目確認
   - レスポンシブ表示確認

2. **機能テスト**
   - ナビゲーション動作
   - フォーム動作
   - ダークモード切り替え

3. **パフォーマンステスト**
   - CSS bundle サイズ
   - 初期ロード時間

### ブラウザサポート
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## 注意点・制約

### 既存機能への影響
- ログイン・認証機能は影響なし
- API通信は影響なし
- サーバーサイド処理は影響なし

### CSS Variables継続使用
一部のダイナミックなスタイリングでは CSS Variables を継続使用

### TypeScript対応
- `tailwindcss/tailwind-config.d.ts` 型定義
- IntelliSense サポート

## 実装状況 (2025-08-28更新)

### ✅ 完了済み

#### Phase 1: 基盤構築
- ✅ **Tailwind CSS インストール・設定**
  - `tailwindcss@4.1.12`, `@tailwindcss/postcss@4.1.12`, `autoprefixer@10.4.21` インストール完了
  - `tailwind.config.ts` 設定完了 (カスタムカラーテーマ含む)
  - `postcss.config.js` 設定完了

- ✅ **カラーシステム移行**
  - 既存のCSS Variables → Tailwind カスタムカラーにマッピング完了
  - ダークテーマ設定完了 (`darkMode: 'class'`)

- ✅ **既存CSS保持設定**
  - `@tailwind` directives を `styles.css` に追加
  - 既存CSSとTailwindの共存設定完了

#### Phase 2: コンポーネント移行
- ✅ **再利用可能UIコンポーネント作成**
  - `Button.tsx` - プライマリ/セカンダリ/デンジャーバリアント対応
  - `Input.tsx` - エラー表示・ラベル対応
  - `Card.tsx` - デフォルト/アウトラインバリアント対応
  - `index.ts` - エクスポート設定完了

- ✅ **メインコンポーネント移行**
  - `Sidebar.tsx` - 完全Tailwind移行完了
  - `UserManagement.tsx` - 完全Tailwind移行完了  
  - `AuthLayout.tsx` - グリッドレイアウト移行完了

#### Phase 3: 最適化・検証
- ✅ **ビルド確認**
  - Next.js ビルド成功確認
  - TypeScript型チェック通過確認
  - パフォーマンス劣化なし確認

### 🔄 残り作業

#### 未移行コンポーネント
- `CsvPreview.tsx`
- `PoliticalOrganizationForm.tsx`
- `SetupForm.tsx`
- 各ページファイル内の直接スタイル

#### 最終作業
- [ ] 全コンポーネント移行完了後の `styles.css` クリーンアップ
- [ ] レスポンシブ対応テスト
- [ ] クロスブラウザテスト

### カスタムカラー設定

```javascript
colors: {
  primary: {
    bg: '#0b1020',      // メイン背景色
    panel: '#141a2d',   // パネル背景色
    muted: '#9aa4bf',   // ミュート文字色
    accent: '#5b8cff',  // アクセント色
    hover: '#1d2745',   // ホバー色
    input: '#0f1527',   // 入力欄背景色
    border: '#263258'   // ボーダー色
  }
}
```

## 完了基準

1. ✅ 全てのページでTailwindクラスを使用 (部分完了)
2. [ ] `styles.css` から不要なクラスを削除
3. [ ] レスポンシブ対応完了
4. ✅ パフォーマンス劣化なし
5. ✅ 既存機能の動作確認完了

## 参考資料

- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/docs)
- [Next.js + Tailwind 設定ガイド](https://tailwindcss.com/docs/guides/nextjs)
- プロジェクト既存のClaude設定: `CLAUDE.md`