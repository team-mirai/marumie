import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import {
  JournalReviewError,
  type JournalWrite,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { Payee, PayeeInput } from "@/server/contexts/research-fund/domain/models/payee";
import { Publication } from "@/server/contexts/research-fund/domain/models/publication";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

const include = {
  lines: { include: { account: true } },
  document: {
    include: {
      scanJobs: {
        where: { status: "succeeded" as const },
        orderBy: { createdAt: "desc" as const },
        include: { prompt: true },
      },
    },
  },
} satisfies Prisma.ResearchFundJournalEntryInclude;
type Row = Prisma.ResearchFundJournalEntryGetPayload<{ include: typeof include }>;
const expenseWhere = {
  source: { in: ["manual", "scan"] },
  lines: { some: { side: "debit", account: { type: "expense" } } },
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
// 支給は支給の登録画面で作るが、確認済の収入として一覧にも並べ、支給日の修正と取り下げはこの画面で行う。
const grantWhere = {
  source: "grant",
  lines: { some: { side: "credit", accountKey: "grant-income" } },
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
const listWhere = {
  OR: [expenseWhere, grantWhere],
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
function model(row: Row): ReviewEntry | null {
  const grant = row.source === "grant";
  const amountLine = grant
    ? row.lines.find((l) => l.side === "credit" && l.accountKey === "grant-income")
    : row.lines.find((l) => l.side === "debit" && l.account.type === "expense");
  const assetLine = grant
    ? row.lines.find((l) => l.side === "debit" && l.accountKey === "bank")
    : row.lines.find(
        (l) => l.side === "credit" && l.accountKey === "bank" && l.account.type === "asset",
      );
  // このフォームが損失なく再生成できる「費用1行／普通預金1行」（支給は貸借が逆）だけを扱う。
  if (
    row.lines.length !== 2 ||
    !amountLine ||
    !assetLine ||
    !amountLine.amount.equals(assetLine.amount)
  )
    return null;
  // 書類の再スキャンで過去の仕訳に別のモデル・版を表示しない。
  const job = row.document?.scanJobs.find((j) => j.createdAt <= row.createdAt);
  return {
    id: String(row.id),
    entryDate: row.entryDate.toISOString().slice(0, 10),
    description: row.description,
    amount: amountLine.amount.toNumber(),
    accountKey: amountLine.accountKey,
    note: row.note ?? "",
    memo: row.memo ?? "",
    status: row.status,
    source: row.source,
    documentId: row.documentId === null ? null : String(row.documentId),
    splitGroup: row.splitGroup,
    updatedAt: row.updatedAt.toISOString(),
    model: job?.model ?? null,
    promptVersion: job?.prompt.version ?? null,
    advancedBy: row.advancedBy ?? null,
    settledAt: row.settledAt ? row.settledAt.toISOString().slice(0, 10) : null,
    payeeId: row.payeeId === null ? null : String(row.payeeId),
    payeeLinkSource: row.payeeLinkSource ?? null,
    issuer: ExtractedReceipt.issuerOf(job?.rawJson),
  };
}
function data(input: JournalWrite) {
  return {
    entryDate: new Date(input.entryDate),
    description: input.description,
    note: input.note || null,
    memo: input.memo || null,
    status: input.status,
    hash: input.hash,
  };
}
// 同じ日付・金額・項目名・書類の仕訳は (book_id, hash) の一意制約で二重登録にならない。
async function unique<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new JournalReviewError("同じ日付・金額・項目名の仕訳がすでに登録されています");
    throw error;
  }
}
type EditableStatus = "draft" | "approved" | "published";
function guard(
  bookId: string,
  entry: ReviewEntry,
  statuses: EditableStatus[] = ["draft", "approved"],
) {
  return {
    id: BigInt(entry.id),
    bookId: BigInt(bookId),
    status: { in: statuses },
    updatedAt: new Date(entry.updatedAt),
    ...(entry.source === "grant" ? grantWhere : expenseWhere),
  };
}
// 人の手での紐づけなので紐づけ元は manual にし、AI の確信度・根拠は消す。1 件でも競合していたら投げて巻き戻させる。
async function linkPayee(
  tx: Prisma.TransactionClient,
  bookId: string,
  entries: readonly ReviewEntry[],
  payeeId: string | null,
) {
  for (const entry of entries) {
    const result = await tx.researchFundJournalEntry.updateMany({
      where: { ...guard(bookId, entry, ["draft", "approved", "published"]), ...expenseWhere },
      data: {
        payeeId: payeeId === null ? null : BigInt(payeeId),
        payeeLinkSource: payeeId === null ? null : "manual",
        payeeLinkConfidence: null,
        payeeLinkReason: null,
      },
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
  }
}
export class PrismaJournalReviewRepository implements JournalReviewRepository {
  constructor(private prisma: PrismaClient) {}
  async list(bookId: string) {
    return (
      await this.prisma.researchFundJournalEntry.findMany({
        where: { bookId: BigInt(bookId), ...listWhere },
        include,
        orderBy: [{ entryDate: "desc" }, { id: "asc" }],
      })
    )
      .map(model)
      .filter((entry): entry is ReviewEntry => entry !== null);
  }
  async termStart(bookId: string) {
    const row = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { politician: { select: { termStart: true } } },
    });
    return row ? row.politician.termStart.toISOString().slice(0, 10) : null;
  }
  async accounts() {
    return this.prisma.researchFundAccount.findMany({ orderBy: { displayOrder: "asc" } });
  }
  async find(bookId: string, id: string) {
    const row = await this.prisma.researchFundJournalEntry.findFirst({
      where: { bookId: BigInt(bookId), id: BigInt(id), ...listWhere },
      include,
    });
    return row ? model(row) : null;
  }
  async findMany(bookId: string, ids: readonly string[]) {
    return (
      await this.prisma.researchFundJournalEntry.findMany({
        where: { bookId: BigInt(bookId), id: { in: ids.map((id) => BigInt(id)) }, ...expenseWhere },
        include,
      })
    )
      .map(model)
      .filter((entry): entry is ReviewEntry => entry !== null);
  }
  async year(bookId: string) {
    return (
      (await this.prisma.researchFundBook.findUnique({ where: { id: BigInt(bookId) } }))
        ?.financialYear ?? null
    );
  }
  async create(bookId: string, input: JournalWrite, userId: string) {
    const row = await unique(() =>
      this.prisma.researchFundJournalEntry.create({
        data: {
          ...data(input),
          bookId: BigInt(bookId),
          source: "manual",
          createdById: userId,
          lines: { create: input.lines.map((l) => ({ ...l })) },
        },
      }),
    );
    return String(row.id);
  }
  async update(bookId: string, entry: ReviewEntry, input: JournalWrite) {
    await unique(() =>
      this.prisma.$transaction(async (tx) => {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: guard(bookId, entry),
          data: data(input),
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
        const row = await tx.researchFundJournalEntry.findFirst({
          where: { id: BigInt(entry.id), bookId: BigInt(bookId) },
          include,
        });
        if (!row || !model(row)) throw new JournalReviewError("この形式の仕訳は編集できません");
        await tx.researchFundJournalLine.deleteMany({ where: { entryId: BigInt(entry.id) } });
        await tx.researchFundJournalLine.createMany({
          data: input.lines.map((l) => ({ ...l, entryId: BigInt(entry.id) })),
        });
      }),
    );
  }
  // 一括の確認済は内容を変えないので、複式行と hash は再生成せず状態だけを進める。
  // 1 件でも競合していたらトランザクションごと巻き戻し、中途半端に一部だけ確認済にしない。
  async approveMany(bookId: string, entries: readonly ReviewEntry[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: { ...guard(bookId, entry), status: "draft" as const },
          data: { status: "approved" },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
      }
    });
  }
  // 一括の破棄は下書き・確認済の支出だけを対象にし、1 件でも競合していたらトランザクションごと巻き戻す。
  // 精算済の仕訳は精算した額と記録が合わなくなるので消さない（settled_at IS NULL で照合する）。
  async discardMany(bookId: string, entries: readonly ReviewEntry[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.deleteMany({
          where: { ...guard(bookId, entry), ...expenseWhere, settledAt: null },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
      }
    });
  }
  // 一括で下書きに戻すのも内容を変えないので状態だけを戻す。1 件でも競合していたら巻き戻す。
  async revertManyToDraft(bookId: string, entries: readonly ReviewEntry[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: { ...guard(bookId, entry, ["approved"]), ...expenseWhere },
          data: { status: "draft" },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
      }
    });
  }
  // 取り下げは内容を変えないので状態だけを戻し、公開日時も消す（再公開で入れ直す）。
  // 帳簿の published_through は、残った公開中の仕訳の最新月末を超えないよう同じトランザクションで戻す。
  // 日付を誤った仕訳を取り下げても、公開ページの「〜支給分」が実データより先の月を指したまま残らないように。
  // 同じ帳簿の取り下げが並行すると、互いの取り下げ前の仕訳を公開中と数えて公開範囲を戻し損ねるため、
  // 仕訳を更新する前に帳簿の行をロックして直列化する（後続は先行のコミット後の状態を数える）。
  async unpublish(bookId: string, entry: ReviewEntry) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM research_fund_books WHERE id = ${BigInt(bookId)} FOR UPDATE`;
      const result = await tx.researchFundJournalEntry.updateMany({
        where: guard(bookId, entry, ["published"]),
        data: { status: "approved", publishedAt: null },
      });
      if (result.count !== 1)
        throw new JournalReviewError("仕訳の状態が変わりました。画面を再読み込みしてください");
      const book = await tx.researchFundBook.findUnique({
        where: { id: BigInt(bookId) },
        select: { publishedThrough: true },
      });
      if (!book) return;
      const latest = await tx.researchFundJournalEntry.findFirst({
        where: { bookId: BigInt(bookId), status: "published" },
        orderBy: { entryDate: "desc" },
        select: { entryDate: true },
      });
      const current = book.publishedThrough?.toISOString().slice(0, 10) ?? null;
      const next = Publication.retreatPublishedThrough(
        current,
        latest?.entryDate.toISOString().slice(0, 10) ?? null,
      );
      if (next !== current)
        await tx.researchFundBook.update({
          where: { id: BigInt(bookId) },
          data: { publishedThrough: next === null ? null : new Date(next) },
        });
    });
  }
  // 下書きに戻すのは内容を変えないので状態だけを戻す。支給は下書きを経ない仕様なので、
  // 支出の形式に限って照合する。
  async revertToDraft(bookId: string, entry: ReviewEntry) {
    const result = await this.prisma.researchFundJournalEntry.updateMany({
      where: { ...guard(bookId, entry, ["approved"]), ...expenseWhere },
      data: { status: "draft" },
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
  }
  async discard(bookId: string, entry: ReviewEntry) {
    const result = await this.prisma.researchFundJournalEntry.deleteMany({
      where: { ...guard(bookId, entry), settledAt: null },
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
  }
  // 入力欄の候補。年度をまたいで同じ秘書が立て替えるので、同じ政治家の全帳簿から集める。
  async advancers(bookId: string) {
    const book = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { politicianId: true },
    });
    if (!book) return [];
    const rows = await this.prisma.researchFundJournalEntry.findMany({
      where: { book: { politicianId: book.politicianId }, advancedBy: { not: null } },
      distinct: ["advancedBy"],
      select: { advancedBy: true },
      orderBy: { advancedBy: "asc" },
    });
    return rows.flatMap((row) => (row.advancedBy === null ? [] : [row.advancedBy]));
  }
  // 立替情報は公開内容に影響しないので、公開中の仕訳も対象にする（複式行と hash は作り直さない）。
  // 精算済の仕訳は精算した額と記録が合わなくなるので変更しない（settled_at IS NULL で照合する）。
  // 1 件でも競合していたらトランザクションごと巻き戻し、一部だけ変わった状態にしない。
  async setAdvancedBy(bookId: string, entries: readonly ReviewEntry[], advancedBy: string | null) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: {
            ...guard(bookId, entry, ["draft", "approved", "published"]),
            ...expenseWhere,
            settledAt: null,
          },
          data: { advancedBy },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
      }
    });
  }
  async politicianId(bookId: string) {
    const book = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { politicianId: true },
    });
    return book ? String(book.politicianId) : null;
  }
  // 支払先は公開内容に影響しないので、公開中・精算済の仕訳も対象にする（複式行と hash は作り直さない）。
  // 支払先が帳簿と同じ議員のものかを同じトランザクションで確かめ、別の議員の支払先を紐づけない
  // （DB の外部キーは支払先の存在しか見ないため。#1674）。1 件でも競合していたら巻き戻す。
  async setPayee(bookId: string, entries: readonly ReviewEntry[], payeeId: string | null) {
    await this.prisma.$transaction(async (tx) => {
      if (payeeId !== null) {
        const owned = await tx.researchFundPayee.count({
          where: { id: BigInt(payeeId), politician: { books: { some: { id: BigInt(bookId) } } } },
        });
        if (owned !== 1) throw new JournalReviewError("支払先が見つかりません");
      }
      await linkPayee(tx, bookId, entries, payeeId);
    });
  }
  // 支払先の作成と紐づけを同じトランザクションで行い、紐づけが競合したら作成も巻き戻す（紐づかない支払先を残さない）。
  // 支払先は帳簿の議員（politicianId）のものとして作るので、議員の照合は要らない。
  async createPayeeAndSetPayee(
    bookId: string,
    entries: readonly ReviewEntry[],
    politicianId: string,
    input: PayeeInput,
  ): Promise<Payee> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.researchFundPayee.create({
          data: { ...input, politicianId: BigInt(politicianId) },
        });
        await linkPayee(tx, bookId, entries, String(row.id));
        return {
          id: String(row.id),
          politicianId: String(row.politicianId),
          name: row.name,
          postalCode: row.postalCode,
          address: row.address,
          invoiceRegistrationNumber: row.invoiceRegistrationNumber,
        };
      });
    } catch (error) {
      // 支払先は (議員, 名称, 住所) で一意。同じ相手を二重に作らせない。
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new JournalReviewError("同じ名称・住所の支払先がすでに登録されています");
      throw error;
    }
  }
  // 精算は確認済・公開中の未精算の立替だけを対象にする。1 件でも競合していたら巻き戻す。
  async settleMany(bookId: string, entries: readonly ReviewEntry[], settledAt: string) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: {
            ...guard(bookId, entry, ["approved", "published"]),
            ...expenseWhere,
            advancedBy: { not: null },
            settledAt: null,
          },
          data: { settledAt: new Date(`${settledAt}T00:00:00.000Z`) },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
      }
    });
  }
  // 誤操作の取り消し。精算済の仕訳だけを未精算に戻す。1 件でも競合していたら巻き戻す。
  async unsettleMany(bookId: string, entries: readonly ReviewEntry[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: {
            ...guard(bookId, entry, ["draft", "approved", "published"]),
            ...expenseWhere,
            settledAt: { not: null },
          },
          data: { settledAt: null },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
      }
    });
  }
}
