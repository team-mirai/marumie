import { type NextRequest, NextResponse } from "next/server";
import { requireRoleResponse } from "@/server/contexts/auth/presentation/loaders/require-role-response";
import { loadMaskedDocument } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";
import { loadJournalDocument } from "@/server/contexts/research-fund/presentation/loaders/load-journal-document";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const denied = await requireRoleResponse("research_fund");
  if (denied) return denied;
  const { documentId } = await params;
  const bookId = request.nextUrl.searchParams.get("bookId") ?? "";
  const politicianId = request.nextUrl.searchParams.get("politicianId") ?? "";
  // version=masked なら公開用の版（個人情報を黒塗りした版）を開く
  const masked = request.nextUrl.searchParams.get("version") === "masked";
  try {
    const document = masked
      ? await loadMaskedDocument(politicianId, bookId, documentId)
      : await loadJournalDocument(politicianId, bookId, documentId);
    if (!document)
      return new NextResponse(masked ? "公開用の版が見つかりません" : "領収書が見つかりません", {
        status: 404,
      });
    return NextResponse.redirect(document.signedUrl, {
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return new NextResponse("領収書を表示できません。ストレージ設定を確認してください。", {
      status: 503,
    });
  }
}
