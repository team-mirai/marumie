import "server-only";
import { NextResponse } from "next/server";
import { researchFundCsvFilename } from "@/server/contexts/research-fund/domain/services/research-fund-csv";
import { loadResearchFundCsv } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-csv";

/**
 * 議員ページの全支出を CSV で配信する。published の仕訳だけが含まれる。
 *
 * 既存の取引 CSV に合わせて UTF-8 + BOM（Excel で文字化けしないため）で返す。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; year: string }> },
) {
  const { slug, year } = await params;
  // 年度が数字でない URL では DB を引かずに 404 にする。
  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const financialYear = Number(year);
  const csv = await loadResearchFundCsv({ slug, financialYear });
  if (csv === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = researchFundCsvFilename(slug, financialYear, new Date());
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
