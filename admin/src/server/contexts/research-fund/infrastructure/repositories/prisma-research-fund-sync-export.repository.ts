import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  IResearchFundSyncExportRepository,
  ResearchFundSyncSourcePolitician,
} from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-export-repository.interface";

const timestampsSelect = { createdAt: true, updatedAt: true } as const;

const promptVersionSelect = {
  version: true,
  body: true,
  isActive: true,
  ...timestampsSelect,
} as const;

// 書類・ユーザーへの参照（documentId / createdById / updatedById）と DB の ID は読み出さない。
// 環境間で差分を取りやすいよう、どの環境でも同じ並びになる自然キー順で読む
// （自然キーを持たない行の行・支出群・成果は表示順のあと作成順で並べる）。
const politicianSelect = {
  slug: true,
  name: true,
  nameKana: true,
  termStart: true,
  displayOrder: true,
  isResearchFundPublic: true,
  house: true,
  constituency: true,
  profileUrl: true,
  websiteUrl: true,
  snsUrls: true,
  ...timestampsSelect,
  memberships: {
    select: {
      startedOn: true,
      endedOn: true,
      ...timestampsSelect,
      politicalOrganization: { select: { slug: true } },
    },
    orderBy: [{ startedOn: "asc" }, { politicalOrganization: { slug: "asc" } }],
  },
  payees: {
    select: {
      name: true,
      address: true,
      postalCode: true,
      invoiceRegistrationNumber: true,
      ...timestampsSelect,
      aliases: {
        select: { name: true, normalizedName: true, source: true, ...timestampsSelect },
        orderBy: { normalizedName: "asc" },
      },
    },
    orderBy: [{ name: "asc" }, { address: "asc" }],
  },
  prompts: { select: promptVersionSelect, orderBy: { version: "asc" } },
  addressSearchPrompts: { select: promptVersionSelect, orderBy: { version: "asc" } },
  books: {
    select: {
      financialYear: true,
      status: true,
      publishedThrough: true,
      asOfDate: true,
      nextUpdateNote: true,
      policyComment: true,
      details: true,
      allowLegalCategoryOverride: true,
      ...timestampsSelect,
      journalEntries: {
        select: {
          hash: true,
          entryDate: true,
          description: true,
          status: true,
          source: true,
          splitGroup: true,
          note: true,
          memo: true,
          advancedBy: true,
          settledAt: true,
          payee: { select: { name: true, address: true } },
          payeeLinkSource: true,
          payeeLinkConfidence: true,
          payeeLinkReason: true,
          receiptAbsent: true,
          receiptAbsenceReason: true,
          fromFundManagementOrg: true,
          treatAsOverTenThousand: true,
          publishedAt: true,
          ...timestampsSelect,
          lines: {
            select: { side: true, accountKey: true, amount: true },
            orderBy: { id: "asc" },
          },
          legalCategoryOverride: {
            select: { legalCategoryKey: true, reason: true, ...timestampsSelect },
          },
        },
        // hash は帳簿の中で一意
        orderBy: { hash: "asc" },
      },
      expenditureGroups: {
        select: {
          title: true,
          description: true,
          displayOrder: true,
          ...timestampsSelect,
          items: {
            select: { entry: { select: { hash: true } } },
            orderBy: { entry: { hash: "asc" } },
          },
          outcomes: {
            select: { label: true, url: true, displayOrder: true, ...timestampsSelect },
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
          },
        },
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { financialYear: "asc" },
  },
} satisfies Prisma.PoliticianSelect;

type PoliticianRow = Prisma.PoliticianGetPayload<{ select: typeof politicianSelect }>;

function toSource(row: PoliticianRow): ResearchFundSyncSourcePolitician {
  const { memberships, payees, prompts, addressSearchPrompts, books, ...profile } = row;

  return {
    profile,
    memberships: memberships.map(({ politicalOrganization, ...membership }) => ({
      ...membership,
      organizationSlug: politicalOrganization.slug,
    })),
    payees,
    prompts,
    addressSearchPrompts,
    books: books.map(({ expenditureGroups, ...book }) => ({
      ...book,
      expenditureGroups: expenditureGroups.map(({ items, ...group }) => ({
        ...group,
        entryHashes: items.map((item) => item.entry.hash),
      })),
    })),
  };
}

export class PrismaResearchFundSyncExportRepository implements IResearchFundSyncExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findSourcesByPoliticianIds(
    politicianIds: string[],
  ): Promise<ResearchFundSyncSourcePolitician[] | null> {
    const ids = [...new Set(politicianIds)].map((id) => BigInt(id));

    // 仕訳だけ更新前・支出群だけ更新後、のような不整合な写しを作らないよう、
    // 読み取りは 1 つのスナップショット（REPEATABLE READ）に揃える。
    // 議員室まるごとの読み出しは既定の 5 秒に収まらないことがあるので timeout を広げる。
    const rows = await this.prisma.$transaction(
      (tx) =>
        tx.politician.findMany({
          where: { id: { in: ids } },
          select: politicianSelect,
          orderBy: { slug: "asc" },
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 60000,
      },
    );

    if (rows.length !== ids.length) return null;

    return rows.map(toSource);
  }
}
