import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { isParliamentHouse } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import { loadSubmissionLedgerCsv } from "@/server/contexts/research-fund/presentation/loaders/load-submission-ledger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  await requireAuth();
  const { bookId } = await params;
  const politicianId = request.nextUrl.searchParams.get("politicianId") ?? "";
  const house = request.nextUrl.searchParams.get("house") ?? "";
  if (!isParliamentHouse(house)) return new NextResponse("院の指定が不正です", { status: 400 });
  const result = await loadSubmissionLedgerCsv(politicianId, bookId, house);
  if (!result) return new NextResponse("帳簿が見つかりません", { status: 404 });
  return new NextResponse(result.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
