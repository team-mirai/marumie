import "server-only";
import { NextResponse } from "next/server";
import { loadOrganizationPhotoUrl } from "@/server/contexts/public-finance/presentation/loaders/load-organization-photo-url";

// 署名URLは短時間で失効するため、レスポンスをキャッシュさせない。
export const dynamic = "force-dynamic";

/**
 * 政治団体の代表者の顔写真を配信する。非公開バケットの署名URLへリダイレクトするだけで、
 * 団体が無い・写真が未登録・ストレージが未設定のときは 404 を返す。
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const signedUrl = await loadOrganizationPhotoUrl(slug).catch((error) => {
    console.error("Organization photo error:", error);
    return null;
  });
  if (!signedUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, {
    status: 307,
    headers: { Location: signedUrl, "Cache-Control": "no-store" },
  });
}
