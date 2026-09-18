import { NextResponse } from "next/server";
import { requireAdminResponse } from "@/server/contexts/auth/presentation/loaders/require-admin-response";
import { ExportOrganizationSyncUsecase } from "@/server/contexts/shared/application/usecases/export-organization-sync-usecase";
import { buildSyncExportFilename } from "@/server/contexts/shared/domain/models/organization-sync-export";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDatabaseMigrationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-database-migration.repository";
import { PrismaOrganizationSyncExportRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-organization-sync-export.repository";

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

  try {
    BigInt(politicalOrganizationId);
  } catch {
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
    console.error("Failed to export organization sync data:", error);
    return NextResponse.json({ error: "同期用データの書き出しに失敗しました" }, { status: 500 });
  }
}
