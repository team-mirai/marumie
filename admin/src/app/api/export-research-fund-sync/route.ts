import { NextResponse } from "next/server";
import { requireRoleResponse } from "@/server/contexts/auth/presentation/loaders/require-role-response";
import { ExportResearchFundSyncUsecase } from "@/server/contexts/research-fund/application/usecases/export-research-fund-sync-usecase";
import {
  buildResearchFundSyncExportFilename,
  ResearchFundSyncExportNotFoundError,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import { PrismaResearchFundSyncExportRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund-sync-export.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDatabaseMigrationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-database-migration.repository";

/** PostgreSQL の BIGINT の上限。これを超える ID は存在しえない。 */
const MAX_BIGINT = BigInt("9223372036854775807");

/** BIGSERIAL の取りうる値（先頭 0 無しの正の 10 進数、BIGINT 上限まで）か。 */
function isValidId(value: string): boolean {
  // BigInt() は "0x10" や "0b1" も受け付けてしまい、意図しない議員を引けるので形式を先に絞る。
  return /^[1-9][0-9]*$/.test(value) && BigInt(value) <= MAX_BIGINT;
}

/**
 * 選んだ議員室の調研費データを、環境間同期用の JSON としてまとめて書き出す。
 * 読み取り専用なので環境による制限は設けず、admin ロールだけに開放する。
 */
export async function GET(request: Request) {
  const forbidden = await requireRoleResponse("admin");
  if (forbidden) return forbidden;

  const politicianIds = new URL(request.url).searchParams.getAll("politicianId");

  if (politicianIds.length === 0) {
    return NextResponse.json({ error: "politicianId is required" }, { status: 400 });
  }

  if (!politicianIds.every(isValidId)) {
    return NextResponse.json({ error: "politicianId must be a valid number" }, { status: 400 });
  }

  try {
    const usecase = new ExportResearchFundSyncUsecase(
      new PrismaResearchFundSyncExportRepository(prisma),
      new PrismaDatabaseMigrationRepository(prisma),
    );

    const exportedAt = new Date();
    const result = await usecase.execute({
      politicianIds,
      sourceEnvironment: process.env.VERCEL_ENV ?? "local",
      exportedAt,
    });

    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildResearchFundSyncExportFilename(exportedAt)}"`,
      },
    });
  } catch (error) {
    if (error instanceof ResearchFundSyncExportNotFoundError) {
      return NextResponse.json({ error: "議員が見つかりません" }, { status: 404 });
    }

    console.error("Failed to export research fund sync data:", error);
    return NextResponse.json({ error: "同期用データの書き出しに失敗しました" }, { status: 500 });
  }
}
