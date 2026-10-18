import "server-only";
import { ReadOnlyNotice } from "@/client/components/research-fund/ReadOnlyNotice";
import { ResearchFundWriteAccessProvider } from "@/client/components/research-fund/ResearchFundWriteAccess";
import { loadResearchFundWritePermission } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";

/**
 * 議員の年度帳簿以下の画面の共通レイアウト（#1773）。
 * 担当外の議員室では「閲覧のみ」と表示し、配下の書き込み用のボタン・フォームを無効にする。
 * ロールのガードとデータ取得は各ページが行う（レイアウトはクライアント遷移で再実行されないため）。
 */
export default async function PoliticianBooksLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const [{ id }, canWriteFor] = await Promise.all([params, loadResearchFundWritePermission()]);
  const canWrite = canWriteFor(id);
  return (
    <ResearchFundWriteAccessProvider canWrite={canWrite}>
      {!canWrite && <ReadOnlyNotice />}
      {children}
    </ResearchFundWriteAccessProvider>
  );
}
