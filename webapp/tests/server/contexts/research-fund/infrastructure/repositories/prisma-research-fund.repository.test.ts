import type { PrismaClient } from "@prisma/client";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";

function setup() {
  const prisma = {
    researchFundBook: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    politicalOrganization: { findUnique: jest.fn().mockResolvedValue(null) },
    politician: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    prisma,
    repository: new PrismaResearchFundRepository(prisma as unknown as PrismaClient),
  };
}

describe("PrismaResearchFundRepository の調研費の公開フラグ", () => {
  it("組織セレクターには調研費を公開する議員だけを出す", async () => {
    const { prisma, repository } = setup();

    await repository.findPoliticians(2026);

    expect(prisma.politician.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isResearchFundPublic: true, books: { some: { financialYear: 2026 } } },
      }),
    );
  });

  it("sitemap には調研費を公開する議員のページだけを載せる", async () => {
    const { prisma, repository } = setup();

    await repository.findPublishedPageRefs();

    expect(prisma.researchFundBook.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          politician: { isResearchFundPublic: true },
          journalEntries: { some: { status: "published" } },
        },
      }),
    );
  });

  it("政党ページの調査研究費セクションには調研費を公開する所属議員だけを出す", async () => {
    const { prisma, repository } = setup();

    await repository.findPublishedByOrganization("team-mirai", 2026);

    const args = prisma.politicalOrganization.findUnique.mock.calls[0][0];
    expect(args.select.politicianMemberships.where).toEqual({
      endedOn: null,
      politician: { isResearchFundPublic: true },
    });
  });

  it.each([true, false])(
    "議員ページには公開フラグ（%s）を添え、公開しない議員でもデータを返す",
    async (isResearchFundPublic) => {
      const { prisma, repository } = setup();
      prisma.researchFundBook.findFirst.mockResolvedValue({
        financialYear: 2026,
        publishedThrough: null,
        asOfDate: null,
        nextUpdateNote: null,
        policyComment: null,
        details: null,
        politician: { name: "サンプル太郎", slug: "sample-taro", isResearchFundPublic },
        journalEntries: [],
        expenditureGroups: [],
      });

      const result = await repository.findPublished("sample-taro", 2026);

      expect(result?.politician).toEqual({ name: "サンプル太郎", slug: "sample-taro" });
      expect(result?.isPublic).toBe(isResearchFundPublic);
    },
  );
});
