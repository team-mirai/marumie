import { Prisma, type PrismaClient } from "@prisma/client";
import type { ResearchFundSyncExport } from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import { PrismaResearchFundSyncImportRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund-sync-import.repository";
import { SyncImportTimeoutError } from "@/server/contexts/shared/domain/models/sync-import-file";

const timestamps = {
  createdAt: "2026-04-01T09:00:00.000Z",
  updatedAt: "2026-04-02T09:00:00.000Z",
};

type FilePolitician = ResearchFundSyncExport["politicians"][number];

function filePolitician(slug: string): FilePolitician {
  return {
    profile: {
      slug,
      name: `議員 ${slug}`,
      nameKana: null,
      termStart: "2025-07-20",
      displayOrder: 0,
      isResearchFundPublic: true,
      house: "sangiin",
      constituency: null,
      profileUrl: null,
      websiteUrl: null,
      snsUrls: [],
      ...timestamps,
    },
    memberships: [
      { organizationSlug: "team-mirai", startedOn: "2025-05-08", endedOn: null, ...timestamps },
      { organizationSlug: "missing-org", startedOn: "2025-05-08", endedOn: null, ...timestamps },
    ],
    payees: [
      {
        name: "書店A",
        address: "",
        postalCode: null,
        invoiceRegistrationNumber: null,
        ...timestamps,
        aliases: [{ name: "書店Ａ", normalizedName: "書店a", source: "rule", ...timestamps }],
      },
    ],
    prompts: [{ version: 1, body: "読み取って", isActive: true, ...timestamps }],
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
        journalEntries: [
          {
            hash: "h1",
            entryDate: "2026-05-31",
            description: "書籍購入",
            status: "published",
            source: "scan",
            splitGroup: null,
            note: null,
            memo: null,
            advancedBy: null,
            settledAt: null,
            payee: { name: "書店A", address: "" },
            payeeLinkSource: "rule",
            payeeLinkConfidence: null,
            payeeLinkReason: null,
            receiptAbsent: false,
            receiptAbsenceReason: null,
            fromFundManagementOrg: false,
            treatAsOverTenThousand: null,
            publishedAt: null,
            ...timestamps,
            lines: [
              { side: "debit", accountKey: "books", amount: "3300" },
              { side: "credit", accountKey: "bank", amount: "3300" },
            ],
            legalCategoryOverride: null,
          },
        ],
        expenditureGroups: [
          {
            title: "政策調査",
            description: "",
            displayOrder: 0,
            ...timestamps,
            entryHashes: ["h1"],
            outcomes: [{ label: "議事録", url: null, displayOrder: 0, ...timestamps }],
          },
        ],
      },
    ],
  };
}

function buildFile(slugs: string[]): ResearchFundSyncExport {
  return {
    meta: {
      formatVersion: 1,
      exportedAt: "2026-11-16T01:23:45.000Z",
      sourceEnvironment: "production",
      latestMigrationName: null,
      politicians: [],
    },
    politicians: slugs.map(filePolitician),
  };
}

/** 呼び出し順を記録するトランザクションのモック。taro だけがこの環境にいる。 */
function setup() {
  const calls: string[] = [];
  const record =
    <T>(name: string, result: T) =>
    jest.fn(async (..._args: unknown[]) => {
      calls.push(name);
      return result;
    });

  let nextId = 100;
  const tx = {
    // 議員の行を slug で引いてロックする（SELECT ... FOR UPDATE）。
    $queryRaw: jest.fn(async (strings: TemplateStringsArray, slug: string) => {
      calls.push(`lock:${slug}`);
      expect(strings.join("?")).toMatch(/FOR UPDATE/);
      return slug === "taro" ? [{ id: BigInt(3) }] : [];
    }),
    politician: {
      create: record("politician.create", { id: BigInt(9) }),
    },
    politicalOrganization: {
      findMany: jest.fn(async () => [{ id: BigInt(1), slug: "team-mirai" }]),
    },
    politicianOrgMembership: { createMany: record("politicianOrgMembership.createMany", {}) },
    researchFundJournalEntry: {
      count: jest.fn(async () => 40),
      createManyAndReturn: jest.fn(async ({ data }: { data: { hash: string }[] }) =>
        data.map((entry) => ({ id: BigInt(nextId++), hash: entry.hash })),
      ),
    },
    researchFundBook: {
      deleteMany: record("researchFundBook.deleteMany", {}),
      create: jest.fn(async () => ({ id: BigInt(nextId++) })),
    },
    researchFundPayee: {
      deleteMany: record("researchFundPayee.deleteMany", {}),
      createManyAndReturn: jest.fn(
        async ({ data }: { data: { name: string; address: string }[] }) =>
          data.map((payee) => ({ id: BigInt(nextId++), name: payee.name, address: payee.address })),
      ),
    },
    researchFundPayeeAlias: { createMany: jest.fn() },
    researchFundPrompt: {
      deleteMany: record("researchFundPrompt.deleteMany", {}),
      createMany: jest.fn(),
    },
    researchFundAddressSearchPrompt: {
      deleteMany: record("researchFundAddressSearchPrompt.deleteMany", {}),
      createMany: jest.fn(),
    },
    researchFundJournalLine: { createMany: jest.fn() },
    researchFundLegalCategoryOverride: { createMany: jest.fn() },
    researchFundExpenditureGroup: { create: jest.fn(async () => ({ id: BigInt(nextId++) })) },
    researchFundGroupItem: { createMany: jest.fn() },
    researchFundGroupOutcome: { createMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new PrismaResearchFundSyncImportRepository(prisma as unknown as PrismaClient);
  return { tx, prisma, repository, calls };
}

describe("PrismaResearchFundSyncImportRepository.replaceResearchFundSyncData", () => {
  it("複数の議員室を 1 つのトランザクションで置き換える", async () => {
    const { prisma, repository } = setup();

    const result = await repository.replaceResearchFundSyncData(buildFile(["taro", "hanako"]));

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        slug: "taro",
        mode: "replace",
        deletedJournalEntryCount: 40,
        importedJournalEntryCount: 1,
        createdMembershipCount: 0,
      },
      {
        slug: "hanako",
        mode: "create",
        deletedJournalEntryCount: 0,
        importedJournalEntryCount: 1,
        createdMembershipCount: 1,
      },
    ]);
  });

  it("既存の議員は行をロックしてから、ファイルの議員室だけ帳簿→支払先→プロンプトの順に消し、議員自体は作り直さない", async () => {
    const { tx, repository, calls } = setup();

    await repository.replaceResearchFundSyncData(buildFile(["taro"]));

    expect(calls).toEqual([
      "lock:taro",
      "researchFundBook.deleteMany",
      "researchFundPayee.deleteMany",
      "researchFundPrompt.deleteMany",
      "researchFundAddressSearchPrompt.deleteMany",
    ]);
    for (const model of [
      tx.researchFundBook,
      tx.researchFundPayee,
      tx.researchFundPrompt,
      tx.researchFundAddressSearchPrompt,
    ]) {
      expect(model.deleteMany).toHaveBeenCalledWith({ where: { politicianId: BigInt(3) } });
    }
    expect(tx.politician.create).not.toHaveBeenCalled();
    expect(tx.politicianOrgMembership.createMany).not.toHaveBeenCalled();
  });

  it("ファイルの並び順によらず、議員の行は slug の昇順でまとめてロックしてから置き換える", async () => {
    const { repository, calls } = setup();

    await repository.replaceResearchFundSyncData(buildFile(["taro", "hanako"]));

    expect(calls.filter((call) => call.startsWith("lock:"))).toEqual(["lock:hanako", "lock:taro"]);
    expect(calls.indexOf("lock:taro")).toBeLessThan(calls.indexOf("researchFundBook.deleteMany"));
  });

  it("いない議員は顔写真なしで作り、この環境にある政治団体の所属履歴だけ作る。何も消さない", async () => {
    const { tx, repository } = setup();

    await repository.replaceResearchFundSyncData(buildFile(["hanako"]));

    expect(tx.politician.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "hanako", photoPath: null, house: "sangiin" }),
      }),
    );
    expect(tx.politicianOrgMembership.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ politicianId: BigInt(9), politicalOrganizationId: BigInt(1) })],
    });
    expect(tx.researchFundBook.deleteMany).not.toHaveBeenCalled();
  });

  it("仕訳は書類なしで入れ、支払先・支出群は同じ議員・帳簿の中で引き当てる", async () => {
    const { tx, repository } = setup();

    await repository.replaceResearchFundSyncData(buildFile(["taro"]));

    const [payeeCall] = tx.researchFundPayee.createManyAndReturn.mock.calls;
    expect(payeeCall[0].data).toEqual([expect.objectContaining({ politicianId: BigInt(3) })]);
    const [payee] = await tx.researchFundPayee.createManyAndReturn.mock.results[0].value;

    const [entryCall] = tx.researchFundJournalEntry.createManyAndReturn.mock.calls;
    expect(entryCall[0].data).toEqual([
      expect.objectContaining({ hash: "h1", documentId: null, payeeId: payee.id }),
    ]);
    const [entry] = await tx.researchFundJournalEntry.createManyAndReturn.mock.results[0].value;

    expect(tx.researchFundPayeeAlias.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ payeeId: payee.id, documentId: null })],
    });
    expect(tx.researchFundJournalLine.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ entryId: entry.id, side: "debit", amount: "3300" }),
        expect.objectContaining({ entryId: entry.id, side: "credit", amount: "3300" }),
      ],
    });
    expect(tx.researchFundGroupItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ entryId: entry.id })],
    });
    expect(tx.researchFundBook.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ details: Prisma.DbNull }) }),
    );
  });

  it("トランザクションが制限時間を超えたら、取り消されたことが分かるエラーにする", async () => {
    const { prisma, repository } = setup();
    prisma.$transaction.mockImplementationOnce(() => {
      throw new Prisma.PrismaClientKnownRequestError("expired", {
        code: "P2028",
        clientVersion: "6",
      });
    });

    await expect(repository.replaceResearchFundSyncData(buildFile(["taro"]))).rejects.toThrow(
      SyncImportTimeoutError,
    );
  });
});
