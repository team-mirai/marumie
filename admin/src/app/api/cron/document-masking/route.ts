import { type NextRequest, NextResponse } from "next/server";
import { requireCronResponse } from "@/server/contexts/auth/presentation/loaders/require-cron-response";
import { recoverDocumentMasking } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";

/** キューを使えない環境では、この呼び出しの中で書類を作る。途中で打ち切られないよう実行時間の上限を延ばす */
export const maxDuration = 300;

/**
 * 書類の公開用の版の作成の取りこぼしを拾い直す（#1812）。Vercel Cron が 5 分ごとに呼ぶ（admin/vercel.json）。
 * キューを使えない環境（ローカルなど）では、手で呼ぶと未作成の版をその場で作る（docs/getting-started.md）。
 */
export async function GET(request: NextRequest) {
  const denied = requireCronResponse(request.headers.get("authorization"));
  if (denied) return denied;
  try {
    return NextResponse.json(await recoverDocumentMasking());
  } catch (error) {
    console.error("[document-masking] 取りこぼしの拾い直しに失敗しました", error);
    return NextResponse.json(
      { error: "公開用の版の作成の拾い直しに失敗しました" },
      { status: 500 },
    );
  }
}
