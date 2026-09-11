import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  ExpenditureGroupError,
  type ExpenditureGroupRecord,
  type ExpenditureGroupWrite,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import type { ExpenditureGroupRepository } from "@/server/contexts/research-fund/domain/repositories/expenditure-group-repository.interface";

const include = {
  outcomes: { orderBy: { displayOrder: "asc" as const } },
  items: { orderBy: { entryId: "asc" as const } },
} satisfies Prisma.ResearchFundExpenditureGroupInclude;
type Row = Prisma.ResearchFundExpenditureGroupGetPayload<{ include: typeof include }>;

// 成果カードの対象は費用仕訳のみ。支給（収入）は含めない。
const expenseWhere = {
  source: { in: ["manual", "scan"] },
  lines: { some: { side: "debit", account: { type: "expense" } } },
} satisfies Prisma.ResearchFundJournalEntryWhereInput;

function model(row: Row): ExpenditureGroupRecord {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    outcomes: row.outcomes.map((outcome) => ({ label: outcome.label, url: outcome.url })),
    entryIds: row.items.map((item) => String(item.entryId)),
  };
}

// 「1 仕訳は 1 つの支出群だけ」は (groupId, entryId) の複合主キーでは守れないため、
// 同じ仕訳を別の支出群へ同時保存した場合は直列化の衝突として弾く。
const serializableOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};

async function serializable<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new ExpenditureGroupError("他の操作と競合しました。もう一度保存してください");
    throw error;
  }
}

export class PrismaExpenditureGroupRepository implements ExpenditureGroupRepository {
  constructor(private prisma: PrismaClient) {}

  async book(bookId: string) {
    const row = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { policyComment: true },
    });
    return row ? { policyComment: row.policyComment ?? "" } : null;
  }

  async savePolicyComment(bookId: string, policyComment: string) {
    const result = await this.prisma.researchFundBook.updateMany({
      where: { id: BigInt(bookId) },
      data: { policyComment: policyComment || null },
    });
    if (result.count !== 1) throw new ExpenditureGroupError("帳簿が見つかりません");
  }

  async list(bookId: string) {
    const rows = await this.prisma.researchFundExpenditureGroup.findMany({
      where: { bookId: BigInt(bookId) },
      include,
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
    return rows.map(model);
  }

  async find(bookId: string, groupId: string) {
    const row = await this.prisma.researchFundExpenditureGroup.findFirst({
      where: { id: BigInt(groupId), bookId: BigInt(bookId) },
      include,
    });
    return row ? model(row) : null;
  }

  async entries(bookId: string) {
    const rows = await this.prisma.researchFundJournalEntry.findMany({
      where: { bookId: BigInt(bookId), ...expenseWhere },
      include: {
        lines: { where: { side: "debit" }, include: { account: true } },
        groupItems: { select: { groupId: true } },
      },
      orderBy: [{ entryDate: "asc" }, { id: "asc" }],
    });
    return rows.flatMap((row) => {
      // 1 仕訳に費用の借方が複数あることがある（取得済みの明細は借方だけ）。全部足す。
      const expenseLines = row.lines.filter((line) => line.account.type === "expense");
      if (expenseLines.length === 0) return [];
      return [
        {
          id: String(row.id),
          entryDate: row.entryDate.toISOString().slice(0, 10),
          description: row.description,
          amount: expenseLines.reduce((total, line) => total + line.amount.toNumber(), 0),
          groupId: row.groupItems[0] ? String(row.groupItems[0].groupId) : null,
        },
      ];
    });
  }

  async create(bookId: string, input: ExpenditureGroupWrite) {
    return serializable(() =>
      this.prisma.$transaction(async (tx) => {
        const displayOrder = await tx.researchFundExpenditureGroup.count({
          where: { bookId: BigInt(bookId) },
        });
        const row = await tx.researchFundExpenditureGroup.create({
          data: {
            bookId: BigInt(bookId),
            title: input.title,
            description: input.description,
            displayOrder,
          },
        });
        await this.replaceLinks(tx, bookId, row.id, input);
        return String(row.id);
      }, serializableOptions),
    );
  }

  async update(bookId: string, groupId: string, input: ExpenditureGroupWrite) {
    await serializable(() =>
      this.prisma.$transaction(async (tx) => {
        const result = await tx.researchFundExpenditureGroup.updateMany({
          where: { id: BigInt(groupId), bookId: BigInt(bookId) },
          data: { title: input.title, description: input.description },
        });
        if (result.count !== 1) throw new ExpenditureGroupError("支出群が見つかりません");
        await tx.researchFundGroupItem.deleteMany({ where: { groupId: BigInt(groupId) } });
        await tx.researchFundGroupOutcome.deleteMany({ where: { groupId: BigInt(groupId) } });
        await this.replaceLinks(tx, bookId, BigInt(groupId), input);
      }, serializableOptions),
    );
  }

  /**
   * 紐づけと成果物を作り直す。トランザクション内で呼ぶ前提で、
   * 帳簿外・他の支出群の仕訳が混ざっていれば投げて丸ごと巻き戻す。
   */
  private async replaceLinks(
    tx: Prisma.TransactionClient,
    bookId: string,
    groupId: bigint,
    input: ExpenditureGroupWrite,
  ) {
    if (input.entryIds.length > 0) {
      const ids = input.entryIds.map((entryId) => BigInt(entryId));
      const belonging = await tx.researchFundJournalEntry.count({
        where: { id: { in: ids }, bookId: BigInt(bookId), ...expenseWhere },
      });
      if (belonging !== ids.length)
        throw new ExpenditureGroupError("この帳簿にない仕訳は紐づけられません");
      const taken = await tx.researchFundGroupItem.count({
        where: { entryId: { in: ids }, groupId: { not: groupId } },
      });
      if (taken > 0) throw new ExpenditureGroupError("他の支出群に紐づいている仕訳は選べません");
      await tx.researchFundGroupItem.createMany({
        data: ids.map((entryId) => ({ groupId, entryId })),
      });
    }
    if (input.outcomes.length > 0)
      await tx.researchFundGroupOutcome.createMany({
        data: input.outcomes.map((outcome, displayOrder) => ({
          groupId,
          label: outcome.label,
          url: outcome.url,
          displayOrder,
        })),
      });
  }
}
