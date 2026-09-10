import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { Politician, PoliticianInput } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

const include = {
  memberships: {
    where: { endedOn: null },
    orderBy: { startedOn: "desc" as const },
    include: { politicalOrganization: true },
  },
};
type Row = Prisma.PoliticianGetPayload<{ include: typeof include }>;
function toModel(row: Row): Politician {
  const membership = row.memberships[0];
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    termStart: row.termStart.toISOString().slice(0, 10),
    politicalOrganizationId: membership ? String(membership.politicalOrganizationId) : "",
    politicalOrganizationName: membership?.politicalOrganization.displayName ?? null,
  };
}

export class PrismaPoliticianRepository implements IPoliticianRepository {
  constructor(private prisma: PrismaClient) {}
  async findAll() {
    return (
      await this.prisma.politician.findMany({
        include,
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      })
    ).map(toModel);
  }
  async findById(id: string) {
    const row = await this.prisma.politician.findUnique({ where: { id: BigInt(id) }, include });
    return row ? toModel(row) : null;
  }
  async save(id: string | null, input: PoliticianInput) {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const data = { name: input.name, slug: input.slug, termStart: new Date(input.termStart) };
          const politician =
            id === null
              ? await tx.politician.create({ data })
              : await tx.politician.update({ where: { id: BigInt(id) }, data });
          const current = await tx.politicianOrgMembership.findMany({
            where: { politicianId: politician.id, endedOn: null },
          });
          if (
            current.length === (input.politicalOrganizationId ? 1 : 0) &&
            current.every(
              (m) => String(m.politicalOrganizationId) === input.politicalOrganizationId,
            )
          )
            return;
          const today = new Date(new Date().toISOString().slice(0, 10));
          for (const membership of current) {
            await tx.politicianOrgMembership.update({
              where: { id: membership.id },
              data: { endedOn: membership.startedOn > today ? membership.startedOn : today },
            });
          }
          if (input.politicalOrganizationId) {
            await tx.politicianOrgMembership.create({
              data: {
                politicianId: politician.id,
                politicalOrganizationId: BigInt(input.politicalOrganizationId),
                startedOn: id === null ? data.termStart : today,
              },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") throw new Error("このスラッグは既に使用されています");
        if (error.code === "P2003") throw new Error("所属する政治団体が見つかりません");
        if (error.code === "P2034")
          throw new Error("他の操作と競合しました。もう一度保存してください");
      }
      throw new Error("議員の保存に失敗しました。もう一度お試しください");
    }
  }
  async delete(id: string) {
    await this.prisma.$transaction(async (tx) => {
      // 帳簿を先に削除し、ジョブからプロンプトへの参照を解消する。
      await tx.researchFundBook.deleteMany({ where: { politicianId: BigInt(id) } });
      await tx.politician.delete({ where: { id: BigInt(id) } });
    });
  }
}
