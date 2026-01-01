import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { loadBalanceSnapshotsData } from "@/server/contexts/shared/presentation/loaders/load-balance-snapshots-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "政治団体IDが必要です" }, { status: 400 });
    }

    const snapshots = await loadBalanceSnapshotsData(orgId);
    return NextResponse.json(snapshots);
  } catch (error) {
    console.error("Error in balance-snapshots API:", error);
    return NextResponse.json(
      { error: "残高スナップショットの取得に失敗しました" },
      { status: 500 },
    );
  }
}
