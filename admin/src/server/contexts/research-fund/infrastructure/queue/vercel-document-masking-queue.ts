import "server-only";
import { handleCallback, send } from "@vercel/queue";
import type { DocumentMaskingQueue } from "@/server/contexts/research-fund/domain/repositories/document-masking-queue.interface";

/** 公開用の版の作成を依頼するトピック。admin/vercel.json の experimentalTriggers と揃える */
const DOCUMENT_MASKING_TOPIC = "research-fund-document-masking";

/**
 * Vercel Queues（push モード）で公開用の版の作成を依頼する（#1812）。
 * メッセージは積んだデプロイ自身の /api/queues/document-masking に届く。
 */
class VercelDocumentMaskingQueue implements DocumentMaskingQueue {
  readonly enabled = true;

  async notify(): Promise<void> {
    try {
      await send(DOCUMENT_MASKING_TOPIC, { kind: "process-pending" });
    } catch (error) {
      // 積めなかった書類は pending のまま残り、定期実行が拾い直す
      console.error("[document-masking] キューに積めませんでした", error);
    }
  }
}

/** キューを使えない環境（ローカル・CI・E2E）用。書類は pending のまま残り、明示的な操作で作る */
class DisabledDocumentMaskingQueue implements DocumentMaskingQueue {
  readonly enabled = false;

  async notify(): Promise<void> {}
}

/**
 * 公開用の版の作成を依頼するキューの唯一の組み立て口。
 * Vercel 上のデプロイ（VERCEL_DEPLOYMENT_ID がある）でだけキューを使う
 */
export function buildDocumentMaskingQueue(): DocumentMaskingQueue {
  return process.env.VERCEL_DEPLOYMENT_ID
    ? new VercelDocumentMaskingQueue()
    : new DisabledDocumentMaskingQueue();
}

/** 1 回の配送で処理を試す回数の上限。超えたらメッセージを捨てる（取りこぼした書類は定期実行が拾い直す） */
const MAX_DELIVERIES = 3;

/**
 * キューから届いたメッセージを受け取る Route Handler を作る。メッセージの中身は使わず、
 * 届くたびに run（pending の書類を 1 件作る）を呼ぶ。偽のメッセージが届いても、
 * もともと作る予定の pending の書類に着手するだけで、同じ書類を二重に作ることはない。
 */
export function createDocumentMaskingCallback(run: () => Promise<void>) {
  return handleCallback(
    async () => {
      await run();
    },
    {
      // 処理中にメッセージが再配送されないよう、関数の実行時間の上限（300 秒）より長くロックする
      visibilityTimeoutSeconds: 360,
      // DB に繋がらないなど書類によらない失敗だけがここに来る。少し待って数回だけ試し直す
      retry: (_error, metadata) =>
        metadata.deliveryCount >= MAX_DELIVERIES ? { acknowledge: true } : { afterSeconds: 60 },
    },
  );
}
