import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { loadJournalDocument } from "@/server/contexts/research-fund/presentation/loaders/load-journal-document";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  await requireAuth();
  const { documentId } = await params;
  const bookId = request.nextUrl.searchParams.get("bookId") ?? "";
  const politicianId = request.nextUrl.searchParams.get("politicianId") ?? "";
  try {
    const document = await loadJournalDocument(politicianId, bookId, documentId);
    if (!document) return new NextResponse("領収書が見つかりません", { status: 404 });
    return NextResponse.redirect(document.signedUrl, {
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return new NextResponse("領収書を表示できません。ストレージ設定を確認してください。", {
      status: 503,
    });
  }
}
