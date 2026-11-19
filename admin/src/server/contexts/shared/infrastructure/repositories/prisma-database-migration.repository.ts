import "server-only";

import { type PrismaClient, Prisma } from "@prisma/client";
import type { IDatabaseMigrationRepository } from "@/server/contexts/shared/domain/repositories/database-migration-repository.interface";

interface MigrationNameRow {
  migration_name: string;
}

export class PrismaDatabaseMigrationRepository implements IDatabaseMigrationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLatestAppliedMigrationName(): Promise<string | null> {
    // _prisma_migrations は Prisma が管理するテーブルでモデル定義が無いため raw で読む。
    // `prisma db push` で作った DB など、テーブル自体が無い環境もありうるので
    // 取得できなければ null を返し、書き出し全体は失敗させない。
    try {
      const rows = await this.prisma.$queryRaw<MigrationNameRow[]>(Prisma.sql`
        SELECT migration_name
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
        ORDER BY finished_at DESC, migration_name DESC
        LIMIT 1
      `);

      return rows[0]?.migration_name ?? null;
    } catch (error) {
      console.warn("Failed to read the latest applied migration name:", error);
      return null;
    }
  }
}
