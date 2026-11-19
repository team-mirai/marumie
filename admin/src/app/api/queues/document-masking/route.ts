import { createDocumentMaskingCallback } from "@/server/contexts/research-fund/infrastructure/queue/vercel-document-masking-queue";
import { processDocumentMaskingFromQueue } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";

/** 1 書類は最大 20 ページで、1 ページごとに LLM を呼ぶ。途中で打ち切られないよう実行時間の上限を延ばす */
export const maxDuration = 300;

/**
 * Vercel Queues から呼ばれ、書類の公開用の版を 1 件作る（#1812）。
 * トピックとの対応は admin/vercel.json の experimentalTriggers で設定する。
 */
export const POST = createDocumentMaskingCallback(processDocumentMaskingFromQueue);
