import { type NextRequest, NextResponse } from "next/server";
import { requireRoleResponse } from "@/server/contexts/auth/presentation/loaders/require-role-response";
import { isReceiptPrintScope } from "@/server/contexts/research-fund/domain/models/receipt-print";
import { loadReceiptPrintManifest } from "@/server/contexts/research-fund/presentation/loaders/load-submission-ledger";

/**
 * 領収書の印刷用 PDF に入れる書類の一覧（印刷順・署名付き URL つき）を JSON で返す。
 * PDF の結合はブラウザで行う（関数のレスポンス上限を超えないため）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const denied = await requireRoleResponse("research_fund");
  if (denied) return denied;
  const { bookId } = await params;
  const politicianId = request.nextUrl.searchParams.get("politicianId") ?? "";
  const scope = request.nextUrl.searchParams.get("scope") ?? "";
  if (!isReceiptPrintScope(scope)) return new NextResponse("範囲の指定が不正です", { status: 400 });
  try {
    const manifest = await loadReceiptPrintManifest(politicianId, bookId, scope);
    if (!manifest) return new NextResponse("帳簿が見つかりません", { status: 404 });
    return NextResponse.json(manifest, {
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return new NextResponse("領収書を取得できません。ストレージ設定を確認してください。", {
      status: 503,
    });
  }
}
