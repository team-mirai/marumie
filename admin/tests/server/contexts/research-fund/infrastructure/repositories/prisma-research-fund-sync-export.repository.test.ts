import type { PrismaClient } from "@prisma/client";
import { PrismaResearchFundSyncExportRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund-sync-export.repository";

const timestamps = {
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-02T00:00:00.000Z"),
};

function politicianRow(slug: string) {
  return {
    slug,
    name: "未来太郎",
    nameKana: null,
    termStart: new Date("2025-07-20T00:00:00.000Z"),
    displayOrder: 0,
    isResearchFundPublic: false,
    house: null,
    constituency: null,
    profileUrl: null,
    websiteUrl: null,
    snsUrls: [],
    ...timestamps,
    memberships: [
      {
        startedOn: new Date("2025-05-08T00:00:00.000Z"),
        endedOn: null,
        ...timestamps,
        politicalOrganization: { slug: "team-mirai" },
      },
    ],
    payees: [],
    prompts: [],
    addressSearchPrompts: [],
    books: [
      {
        financialYear: 2026,
        status: "active",
        publishedThrough: null,
        asOfDate: null,
        nextUpdateNote: null,
        policyComment: null,
        details: null,
        allowLegalCategoryOverride: false,
        ...timestamps,
        journalEntries: [],
        expenditureGroups: [
          {
            title: "群",
            description: "",
            displayOrder: 0,
            ...timestamps,
            items: [{ entry: { hash: "a" } }, { entry: { hash: "b" } }],
            outcomes: [],
          },
        ],
      },
    ],
  };
}

function setup(rows: unknown[]) {
  const tx = { politician: { findMany: jest.fn().mockResolvedValue(rows) } };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new PrismaResearchFundSyncExportRepository(prisma as unknown as PrismaClient);
  return { tx, repository };
}

test("指定した議員を slug 順に読み出す", async () => {
  const { tx, repository } = setup([politicianRow("a"), politicianRow("b")]);

  await repository.findSourcesByPoliticianIds(["2", "1", "2"]);

  expect(tx.politician.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: { in: [BigInt(2), BigInt(1)] } },
      orderBy: { slug: "asc" },
    }),
  );
});

test("書類・ユーザーへの参照・顔写真は読み出さない", async () => {
  const { tx, repository } = setup([politicianRow("a")]);

  await repository.findSourcesByPoliticianIds(["1"]);

  const { select } = tx.politician.findMany.mock.calls[0][0];
  expect(select).not.toHaveProperty("photoPath");
  expect(select).not.toHaveProperty("id");
  const entrySelect = select.books.select.journalEntries.select;
  expect(entrySelect).not.toHaveProperty("documentId");
  expect(entrySelect).not.toHaveProperty("document");
  expect(entrySelect).not.toHaveProperty("createdById");
  expect(entrySelect.legalCategoryOverride.select).not.toHaveProperty("createdById");
  expect(select.prompts.select).not.toHaveProperty("updatedById");
  expect(select.payees.select.aliases.select).not.toHaveProperty("documentId");
});

test("所属先を政治団体の slug に、支出群の対象を仕訳の hash に置き換える", async () => {
  const { repository } = setup([politicianRow("a")]);

  const [source] = (await repository.findSourcesByPoliticianIds(["1"])) ?? [];

  expect(source.memberships[0]).toMatchObject({ organizationSlug: "team-mirai" });
  expect(source.memberships[0]).not.toHaveProperty("politicalOrganization");
  expect(source.books[0].expenditureGroups[0].entryHashes).toEqual(["a", "b"]);
  expect(source.books[0].expenditureGroups[0]).not.toHaveProperty("items");
});

test("見つからない議員が 1 件でもあれば null を返す", async () => {
  const { repository } = setup([politicianRow("a")]);

  await expect(repository.findSourcesByPoliticianIds(["1", "2"])).resolves.toBeNull();
});
