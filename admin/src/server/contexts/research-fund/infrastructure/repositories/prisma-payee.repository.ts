import "server-only";
import { Prisma, type PrismaClient, type ResearchFundPayee } from "@prisma/client";
import {
  PayeeError,
  type Payee,
  type PayeeDeletionResult,
  type PayeeInput,
  type PayeeJournalEntry,
} from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeAlias } from "@/server/contexts/research-fund/domain/models/payee-alias";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

function model(row: ResearchFundPayee): Payee {
  return {
    id: String(row.id),
    politicianId: String(row.politicianId),
    name: row.name,
    postalCode: row.postalCode,
    address: row.address,
    invoiceRegistrationNumber: row.invoiceRegistrationNumber,
  };
}
// 支払先は (議員, 名称, 住所) で一意。同じ相手を二重に作らせない。
async function unique<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new PayeeError("同じ名称・住所の支払先がすでに登録されています");
    throw error;
  }
}
// 公開中の仕訳が見つかったときに、削除のトランザクションを巻き戻すための目印
class PublishedEntriesFound extends Error {
  constructor(readonly publishedCount: number) {
    super("published entries found");
  }
}
export class PrismaPayeeRepository implements PayeeRepository {
  constructor(private prisma: PrismaClient) {}
  async list(politicianId: string, bookId: string) {
    const rows = await this.prisma.researchFundPayee.findMany({
      where: { politicianId: BigInt(politicianId) },
      include: { _count: { select: { journalEntries: { where: { bookId: BigInt(bookId) } } } } },
      orderBy: [{ name: "asc" }, { address: "asc" }],
    });
    return rows.map((row) => ({ ...model(row), usageCount: row._count.journalEntries }));
  }
  // 件数は list と同じ条件（帳簿・支払先）で数えるので、一覧の件数とここで返す件数は一致する。
  async listJournalEntries(politicianId: string, id: string, bookId: string) {
    const rows = await this.prisma.researchFundJournalEntry.findMany({
      where: {
        bookId: BigInt(bookId),
        payeeId: BigInt(id),
        payee: { politicianId: BigInt(politicianId) },
      },
      include: { lines: { where: { side: "debit" }, select: { amount: true } } },
      orderBy: [{ entryDate: "desc" }, { id: "asc" }],
    });
    return rows.map(
      (row): PayeeJournalEntry => ({
        id: String(row.id),
        entryDate: row.entryDate.toISOString().slice(0, 10),
        description: row.description,
        amount: row.lines.reduce((sum, line) => sum + line.amount.toNumber(), 0),
        status: row.status,
      }),
    );
  }
  async find(politicianId: string, id: string) {
    const row = await this.prisma.researchFundPayee.findFirst({
      where: { id: BigInt(id), politicianId: BigInt(politicianId) },
    });
    return row ? model(row) : null;
  }
  async create(politicianId: string, input: PayeeInput) {
    return model(
      await unique(() =>
        this.prisma.researchFundPayee.create({
          data: { ...input, politicianId: BigInt(politicianId) },
        }),
      ),
    );
  }
  // 議員で絞り込んで更新し、別の議員の支払先は id を知っていても変更できないようにする。
  async update(politicianId: string, id: string, input: PayeeInput) {
    return unique(() =>
      this.prisma.$transaction(async (tx) => {
        const result = await tx.researchFundPayee.updateMany({
          where: { id: BigInt(id), politicianId: BigInt(politicianId) },
          data: input,
        });
        if (result.count !== 1) throw new PayeeError("支払先が見つかりません");
        return model(await tx.researchFundPayee.findUniqueOrThrow({ where: { id: BigInt(id) } }));
      }),
    );
  }
  async listAliases(politicianId: string, id: string): Promise<PayeeAlias[]> {
    const rows = await this.prisma.researchFundPayeeAlias.findMany({
      where: { payeeId: BigInt(id), payee: { politicianId: BigInt(politicianId) } },
      include: { document: { select: { id: true, originalFilename: true } } },
      orderBy: { id: "asc" },
    });
    if (rows.length === 0) return [];
    // 照合は議員の支払先すべてを相手にするので、同じ表記を持つ別の支払先も同じ議員の中で探す
    const shared = await this.prisma.researchFundPayeeAlias.findMany({
      where: {
        normalizedName: { in: rows.map((row) => row.normalizedName) },
        payeeId: { not: BigInt(id) },
        payee: { politicianId: BigInt(politicianId) },
      },
      include: { payee: { select: { id: true, name: true } } },
      orderBy: [{ payeeId: "asc" }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      source: row.source,
      document: row.document
        ? { id: String(row.document.id), originalFilename: row.document.originalFilename }
        : null,
      createdAt: row.createdAt.toISOString(),
      sharedWith: shared
        .filter((other) => other.normalizedName === row.normalizedName)
        .map((other) => ({ id: String(other.payee.id), name: other.payee.name })),
    }));
  }
  // 支払先と議員で絞り込んで消し、別の議員・別の支払先の表記は id を知っていても消せないようにする。
  async deleteAlias(politicianId: string, id: string, aliasId: string) {
    const result = await this.prisma.researchFundPayeeAlias.deleteMany({
      where: {
        id: BigInt(aliasId),
        payeeId: BigInt(id),
        payee: { politicianId: BigInt(politicianId) },
      },
    });
    return result.count === 1;
  }
  // 支払先が議員のものかを確かめてから、議員のすべての帳簿の仕訳を状態で分けて数える。
  async deletionImpact(politicianId: string, id: string) {
    if (!(await this.find(politicianId, id))) return null;
    const [publishedCount, unlinkedCount] = await Promise.all([
      this.prisma.researchFundJournalEntry.count({
        where: { payeeId: BigInt(id), status: "published" },
      }),
      this.prisma.researchFundJournalEntry.count({
        where: { payeeId: BigInt(id), status: { not: "published" } },
      }),
    ]);
    return { publishedCount, unlinkedCount };
  }
  // 公開中でない仕訳の紐づけを外してから、残った仕訳（公開中のもの）を数える。
  // 外す更新は対象の行をロックし、並行して公開された仕訳は条件の再評価で外さない。
  // 公開中の仕訳が残っていれば、外した紐づけも含めて巻き戻す。表記は外部キーのカスケードで一緒に消える。
  async delete(politicianId: string, id: string): Promise<PayeeDeletionResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const payee = await tx.researchFundPayee.findFirst({
          where: { id: BigInt(id), politicianId: BigInt(politicianId) },
          select: { id: true },
        });
        if (!payee) return { status: "not-found" as const };
        // 支払先が無い仕訳は紐づけの経路・確信度・根拠を持てない（DB の CHECK 制約）ので一緒に消す
        const unlinked = await tx.researchFundJournalEntry.updateMany({
          where: { payeeId: payee.id, status: { not: "published" } },
          data: {
            payeeId: null,
            payeeLinkSource: null,
            payeeLinkConfidence: null,
            payeeLinkReason: null,
          },
        });
        const publishedCount = await tx.researchFundJournalEntry.count({
          where: { payeeId: payee.id, status: "published" },
        });
        if (publishedCount > 0) throw new PublishedEntriesFound(publishedCount);
        await tx.researchFundPayee.delete({ where: { id: payee.id } });
        return { status: "deleted" as const, unlinkedCount: unlinked.count };
      });
    } catch (error) {
      if (error instanceof PublishedEntriesFound)
        return { status: "published", publishedCount: error.publishedCount };
      // 確認のあとに別の仕訳が紐づけられると、外部キーで削除が止まる
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
        throw new PayeeError(
          "削除中に仕訳が紐づけられたため削除できませんでした。もう一度お試しください",
        );
      throw error;
    }
  }
}
