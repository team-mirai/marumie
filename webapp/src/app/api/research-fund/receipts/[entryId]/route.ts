import "server-only";
import { NextResponse } from "next/server";
import { loadResearchFundReceiptUrl } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-receipt";

// 署名URLは短時間で失効するため、レスポンスをキャッシュさせない。
export const dynamic = "force-dynamic";

/**
 * 領収書の原本を配信する。非公開バケットの署名URLへリダイレクトするだけで、
 * 公開済み（published）の仕訳に紐づくものしか返さない。
 */
export async function GET(_request: Request, { params }: { params: Promise<{ entryId: string }> }) {
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
