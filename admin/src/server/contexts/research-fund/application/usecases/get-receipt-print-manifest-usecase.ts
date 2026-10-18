import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import {
  receiptPrintFilename,
  type ReceiptPrintScope,
  selectReceiptPrintDocuments,
} from "@/server/contexts/research-fund/domain/models/receipt-print";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { SubmissionLedgerRepository } from "@/server/contexts/research-fund/domain/repositories/submission-ledger-repository.interface";

/** 署名付き URL を同時に発行する数。数百件を逐次で発行すると関数の実行時間が延びる */
const SIGNING_CONCURRENCY = 10;

interface ReceiptPrintManifestItem {
  readonly receiptNumber: number;
  readonly mime: string | null;
  /** 原本の署名付き URL。キーが無い・署名に失敗したなら null（取得できなかった書類として扱う） */
  readonly url: string | null;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/**
 * 領収書の印刷用 PDF に入れる書類を、印刷する順に原本の署名付き URL つきで返す。帳簿が無ければ null。
 *
 * PDF の結合はブラウザで行う（#1777）。数百件・数 MB の書類を結合した PDF は Vercel の関数のレスポンス上限（4.5MB）を
 * 容易に超えるので、サーバーは書類の一覧と URL だけを返し、原本はブラウザがストレージから直接取得する
 */
export class GetReceiptPrintManifestUsecase {
  constructor(
    private repository: SubmissionLedgerRepository,
    private storage: DocumentStorage,
  ) {}

  async execute(bookId: string, scope: ReceiptPrintScope, expiresIn: number) {
    if (!isBigIntId(bookId)) return null;
    const ledger = await this.repository.find(bookId);
    if (!ledger) return null;
    const { documents } = selectReceiptPrintDocuments(ledger.entries, scope);
    const keys = await this.repository.findDocumentStorageKeys(
      bookId,
      documents.map((d) => d.documentId),
    );
    const receipts = await mapWithConcurrency(
      documents,
      SIGNING_CONCURRENCY,
      async (document): Promise<ReceiptPrintManifestItem> => {
        const key = keys.get(document.documentId);
        const url = key ? await this.signedUrl(key, expiresIn) : null;
        return { receiptNumber: document.receiptNumber, mime: document.mime, url };
      },
    );
    return { filename: receiptPrintFilename(ledger, scope), receipts };
  }

  private async signedUrl(key: string, expiresIn: number): Promise<string | null> {
    try {
      const result = await this.storage.createSignedUrl(key, expiresIn);
      return result.status === "valid" ? result.value : null;
    } catch {
      return null;
    }
  }
}
