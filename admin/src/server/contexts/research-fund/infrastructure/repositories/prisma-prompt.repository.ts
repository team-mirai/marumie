import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  PromptError,
  type PromptRecord,
} from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";

export class PrismaPromptRepository implements PromptRepository {
  constructor(private prisma: PrismaClient) {}

  async list(politicianId: string): Promise<PromptRecord[]> {
    const rows = await this.prisma.researchFundPrompt.findMany({
      where: { politicianId: BigInt(politicianId) },
      orderBy: { version: "desc" },
      include: { _count: { select: { scanJobs: true } } },
    });
    return rows.map((row) => ({
      id: String(row.id),
      version: row.version,
      body: row.body,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
      jobCount: row._count.scanJobs,
    }));
  }

  async create(politicianId: string, body: string, userId: string): Promise<number> {
    const id = BigInt(politicianId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const latest = await tx.researchFundPrompt.findFirst({
          where: { politicianId: id },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        const version = (latest?.version ?? 0) + 1;
        await tx.researchFundPrompt.updateMany({
          where: { politicianId: id, isActive: true },
          data: { isActive: false },
        });
        await tx.researchFundPrompt.create({
          data: { politicianId: id, version, body, isActive: true, updatedById: userId },
        });
        return version;
      });
    } catch (error) {
      // (politician_id, version) の一意制約。別の操作が先に同じ版を採番している
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new PromptError("別の操作で新しい版が保存されました。画面を再読み込みしてください");
      throw error;
    }
  }

  async activate(politicianId: string, version: number): Promise<void> {
    const id = BigInt(politicianId);
    await this.prisma.$transaction(async (tx) => {
      const target = await tx.researchFundPrompt.findUnique({
        where: { politicianId_version: { politicianId: id, version } },
        select: { id: true },
      });
      if (!target) throw new PromptError("指定した版が見つかりません");
      await tx.researchFundPrompt.updateMany({
        where: { politicianId: id, isActive: true },
        data: { isActive: false },
      });
      await tx.researchFundPrompt.update({ where: { id: target.id }, data: { isActive: true } });
    });
  }
}
