import "server-only";
import { NextResponse } from "next/server";
import { loadPoliticianPhotoUrl } from "@/server/contexts/research-fund/presentation/loaders/load-politician-photo-url";

// 署名URLは短時間で失効するため、レスポンスをキャッシュさせない。
export const dynamic = "force-dynamic";

/**
 * 議員の顔写真を配信する。非公開バケットの署名URLへリダイレクトするだけで、
 * 議員ページを開ける議員（調研費を公開中、またはプレビュー URL の slug の区間）の写真しか返さない。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pathSlug: string }> },
) {
  const { pathSlug } = await params;
  const signedUrl = await loadPoliticianPhotoUrl(pathSlug);
  if (!signedUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, {
    status: 307,
    headers: { Location: signedUrl, "Cache-Control": "no-store" },
  });
}
