import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { loadPoliticianDocument } from "@/server/contexts/research-fund/presentation/loaders/load-politician-document";

/** 選択中の帳簿の議員の書類を、帳簿を問わず開く（支払先の表記の最初の書類） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  await requireAuth();
  const { documentId } = await params;
  const bookId = request.nextUrl.searchParams.get("bookId") ?? "";
  const politicianId = request.nextUrl.searchParams.get("politicianId") ?? "";
  try {
    const document = await loadPoliticianDocument(politicianId, bookId, documentId);
    if (!document) return new NextResponse("書類が見つかりません", { status: 404 });
    return NextResponse.redirect(document.signedUrl, {
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return new NextResponse("書類を表示できません。ストレージ設定を確認してください。", {
      status: 503,
    });
  }
}
