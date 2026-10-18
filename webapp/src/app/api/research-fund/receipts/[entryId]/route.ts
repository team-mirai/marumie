import "server-only";
import { NextResponse } from "next/server";
import { RESEARCH_FUND_RECEIPTS_PUBLISHED } from "@/server/contexts/research-fund/domain/models/research-fund-receipt-publication";
import { loadResearchFundReceiptUrl } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-receipt";

// 署名URLは短時間で失効するため、レスポンスをキャッシュさせない。
export const dynamic = "force-dynamic";

/**
 * 領収書の公開用の版（個人情報を黒塗りし、メタデータを消した版）を配信する。原本は配信しない。
 * 非公開バケットの署名URLへリダイレクトするだけで、公開済み（published）の仕訳に紐づく、
 * 作成済みの公開用の版しか返さない。
 * 領収書を公開していない間（RESEARCH_FUND_RECEIPTS_PUBLISHED が false）は、どの仕訳にも 404 を返す。
 */
export async function GET(_request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  if (!RESEARCH_FUND_RECEIPTS_PUBLISHED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { entryId } = await params;
  const signedUrl = await loadResearchFundReceiptUrl(entryId);
  if (!signedUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, {
    status: 307,
    headers: { Location: signedUrl, "Cache-Control": "no-store" },
  });
}
