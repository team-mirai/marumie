import "server-only";

/**
 * サイドバーなしの公開画面（ログイン・パスワード再設定・初期セットアップ）の共通レイアウト。
 * 背景 #F8F8F8 の中央に白カード（PublicAuthCard）を置く。
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 py-12">
      {children}
    </main>
  );
}
