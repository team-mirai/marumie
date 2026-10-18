import "server-only";
import { DocumentMaskingRunner } from "@/client/components/research-fund/DocumentMaskingRunner";
import { loadUnfinishedDocumentMasking } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";

/**
 * 公開用の版の作成は 1 書類あたりページ数ぶん LLM を呼ぶ。配下の画面から呼ぶサーバーアクションが
 * 20 ページの書類でも途中で打ち切られないよう、関数の実行時間の上限を延ばす
 */
export const maxDuration = 300;

/**
 * 帳簿の画面の共通レイアウト。開いている間、書類の公開用の版を裏で作り進める（#1802）。
 * 書類の登録・作り直しの後は画面が再検証されて未作成の件数が取り直されるので、そこで再び作り始める。
 */
export default async function BookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; bookId: string }>;
}) {
  const { id, bookId } = await params;
  const unfinished = await loadUnfinishedDocumentMasking(id, bookId);
  return (
    <>
      <DocumentMaskingRunner
        key={bookId}
        politicianId={id}
        bookId={bookId}
        unfinished={unfinished}
      />
      {children}
    </>
  );
}
