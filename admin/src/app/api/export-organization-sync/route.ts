import { NextResponse } from "next/server";
import { requireAdminResponse } from "@/server/contexts/auth/presentation/loaders/require-admin-response";
import { ExportOrganizationSyncUsecase } from "@/server/contexts/shared/application/usecases/export-organization-sync-usecase";
import {
  buildSyncExportFilename,
  OrganizationSyncExportNotFoundError,
} from "@/server/contexts/shared/domain/models/organization-sync-export";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDatabaseMigrationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-database-migration.repository";
import { PrismaOrganizationSyncExportRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-organization-sync-export.repository";

/** PostgreSQL の BIGINT の上限。これを超える ID は存在しえない。 */
const MAX_BIGINT = BigInt("9223372036854775807");

/**
 * 政治団体 1 件分の政治資金データを、環境間同期用の JSON として書き出す。
 * 読み取り専用なので環境による制限は設けず、admin ロールだけに開放する。
 */
export async function GET(request: Request) {
  const forbidden = await requireAdminResponse();
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const politicalOrganizationId = url.searchParams.get("politicalOrganizationId");

  if (!politicalOrganizationId) {
    return NextResponse.json({ error: "politicalOrganizationId is required" }, { status: 400 });
  }

  // BigInt() は "0x10" や "0b1" も受け付けてしまい、意図しない団体を引ける。
  // BIGSERIAL の取りうる値（先頭 0 無しの正の 10 進数、BIGINT 上限まで）だけを通す。
  if (
    !/^[1-9][0-9]*$/.test(politicalOrganizationId) ||
    BigInt(politicalOrganizationId) > MAX_BIGINT
  ) {
    return NextResponse.json(
      { error: "politicalOrganizationId must be a valid number" },
      { status: 400 },
    );
  }

  try {
    const usecase = new ExportOrganizationSyncUsecase(
      new PrismaOrganizationSyncExportRepository(prisma),
      new PrismaDatabaseMigrationRepository(prisma),
    );

    const exportedAt = new Date();
    const result = await usecase.execute({
      politicalOrganizationId,
      sourceEnvironment: process.env.VERCEL_ENV ?? "local",
      exportedAt,
    });

    const filename = buildSyncExportFilename(result.meta.organizationSlug, exportedAt);

    return new NextResponse(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof OrganizationSyncExportNotFoundError) {
      return NextResponse.json({ error: "政治団体が見つかりません" }, { status: 404 });
    }

    console.error("Failed to export organization sync data:", error);
    return NextResponse.json({ error: "同期用データの書き出しに失敗しました" }, { status: 500 });
  }
}
