import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  Politician,
  PoliticianInput,
  PoliticianProfileInput,
  PoliticianResearchFundPublicationChange,
} from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import { PoliticianOrgMembership } from "@/server/contexts/shared/domain/models/politician-org-membership";

const include = {
  memberships: {
    where: { endedOn: null },
    orderBy: { startedOn: "desc" as const },
    include: { politicalOrganization: true },
  },
};
type Row = Prisma.PoliticianGetPayload<{ include: typeof include }>;
const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);
function toModel(row: Row): Politician {
  const membership = row.memberships[0];
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    termStart: toDateOnly(row.termStart),
    politicalOrganizationId: membership ? String(membership.politicalOrganizationId) : "",
    politicalOrganizationName: membership?.politicalOrganization.displayName ?? null,
    isResearchFundPublic: row.isResearchFundPublic,
    researchFundComingSoonNote: row.researchFundComingSoonNote,
    nameKana: row.nameKana ?? "",
    house: row.house ?? "",
    constituency: row.constituency ?? "",
    profileUrl: row.profileUrl ?? "",
    websiteUrl: row.websiteUrl ?? "",
    snsUrls: row.snsUrls,
    photoPath: row.photoPath,
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
          const data = {
            name: input.name,
            slug: input.slug,
            termStart: new Date(input.termStart),
            nameKana: input.nameKana || null,
            house: input.house || null,
            constituency: input.constituency || null,
            profileUrl: input.profileUrl || null,
            websiteUrl: input.websiteUrl || null,
            snsUrls: input.snsUrls,
          };
          const politician =
            id === null
              ? await tx.politician.create({ data })
              : await tx.politician.update({ where: { id: BigInt(id) }, data });
          const current = await tx.politicianOrgMembership.findMany({
            where: { politicianId: politician.id, endedOn: null },
          });
          const reassignment = PoliticianOrgMembership.planReassignment({
            isNewPolitician: id === null,
            termStart: input.termStart,
            current: current.map((m) => ({
              id: String(m.id),
              politicalOrganizationId: String(m.politicalOrganizationId),
              startedOn: toDateOnly(m.startedOn),
            })),
            nextPoliticalOrganizationId: input.politicalOrganizationId,
            today: toDateOnly(new Date()),
          });
          if (!reassignment) return;
          for (const ending of reassignment.endings) {
            await tx.politicianOrgMembership.update({
              where: { id: BigInt(ending.id) },
              data: { endedOn: new Date(ending.endedOn) },
            });
          }
          if (reassignment.start) {
            await tx.politicianOrgMembership.create({
              data: {
                politicianId: politician.id,
                politicalOrganizationId: BigInt(reassignment.start.politicalOrganizationId),
                startedOn: new Date(reassignment.start.startedOn),
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
  async saveProfile(id: string, profile: PoliticianProfileInput) {
    try {
      await this.prisma.politician.update({
        where: { id: BigInt(id) },
        data: {
          nameKana: profile.nameKana || null,
          house: profile.house || null,
          constituency: profile.constituency || null,
          profileUrl: profile.profileUrl || null,
          websiteUrl: profile.websiteUrl || null,
          snsUrls: profile.snsUrls,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
        throw new Error("議員が見つかりません");
      throw new Error("議員の保存に失敗しました。もう一度お試しください");
    }
  }
  async setResearchFundPublic(id: string, change: PoliticianResearchFundPublicationChange) {
    await this.prisma.politician.update({
      where: { id: BigInt(id) },
      // 非公開にするときは公開フラグだけ（添え書きを data に入れないので、同時に保存された添え書きを上書きしない）
      data: change,
    });
  }
  async setResearchFundComingSoonNote(id: string, note: string | null) {
    await this.prisma.politician.update({
      where: { id: BigInt(id) },
      data: { researchFundComingSoonNote: note },
    });
  }
  async setPhotoPath(id: string, photoPath: string | null) {
    await this.prisma.politician.update({ where: { id: BigInt(id) }, data: { photoPath } });
  }
  async delete(id: string) {
    await this.prisma.$transaction(async (tx) => {
      // 帳簿を先に削除し、ジョブからプロンプトへの参照を解消する。
      await tx.researchFundBook.deleteMany({ where: { politicianId: BigInt(id) } });
      await tx.politician.delete({ where: { id: BigInt(id) } });
    });
  }
}
