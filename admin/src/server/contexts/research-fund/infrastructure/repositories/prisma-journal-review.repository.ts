import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import {
  JournalReviewError,
  type JournalWrite,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  DocumentReplacement,
  OPERABLE_STATES,
  type OperableState,
} from "@/server/contexts/research-fund/domain/models/journal-operation";
import {
  manualPayeeLink,
  type Payee,
  type PayeeInput,
} from "@/server/contexts/research-fund/domain/models/payee";
import { payeeAliasFromIssuer } from "@/server/contexts/research-fund/domain/models/payee-alias";
import { Publication } from "@/server/contexts/research-fund/domain/models/publication";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import type { LegalCategoryOverrideInput } from "@/server/contexts/research-fund/domain/models/legal-category-override";
import {
  legalCategoryOverrideSelect,
  loadLegalCategoryCatalog,
  overrideOf,
} from "@/server/contexts/research-fund/infrastructure/repositories/legal-category-catalog";
import type { LegalCategoryCatalog } from "@/shared/research-fund/legal-category";
import { EXPENSE_LINE, GRANT_LINE, twoLineAmountLineOf } from "@/shared/research-fund/journal-line";

const include = {
  lines: { include: { account: true } },
  legalCategoryOverride: legalCategoryOverrideSelect,
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
  lines: { some: EXPENSE_LINE },
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
// 支給は支給の登録画面で作るが、確認済の収入として一覧にも並べ、支給日の修正と取り下げはこの画面で行う。
const grantWhere = {
  source: "grant",
  lines: { some: GRANT_LINE },
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
const listWhere = {
  OR: [expenseWhere, grantWhere],
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
function model(row: Row, catalog: LegalCategoryCatalog): ReviewEntry | null {
  // このフォームが損失なく再生成できる「費用1行／普通預金1行」（支給は貸借が逆）だけを扱う。
  const amountLine = twoLineAmountLineOf(row.lines, row.source === "grant" ? "grant" : "expense");
  if (!amountLine) return null;
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
    receiptAbsent: row.receiptAbsent,
    receiptAbsenceReason: row.receiptAbsenceReason ?? null,
    receiptNumber: row.document?.receiptNumber ?? null,
    issuer: ExtractedReceipt.issuerOf(job?.rawJson),
    legalCategoryOverride: legalCategoryOverrideOfRow(row, catalog),
  };
}
/** 管理画面に見せる上書き（指定した区分と理由）。上書きの無い仕訳は null */
function legalCategoryOverrideOfRow(row: Row, catalog: LegalCategoryCatalog) {
  const category = overrideOf(row, catalog);
  if (!category || !row.legalCategoryOverride) return null;
  return { ...category, reason: row.legalCategoryOverride.reason };
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
const presence = (present: boolean) => (present ? { not: null } : null);
/**
 * 同時更新の照合の条件。画面で読んだ時点から更新されておらず（updatedAt）、
 * 操作を適用してよい状態（OPERABLE_STATES。ドメインが決める）のままの仕訳だけに当てる
 */
function guard(bookId: string, entry: ReviewEntry, state: OperableState) {
  return {
    id: BigInt(entry.id),
    bookId: BigInt(bookId),
    status: { in: [...state.statuses] },
    updatedAt: new Date(entry.updatedAt),
    ...(state.expenseOnly || entry.source !== "grant" ? expenseWhere : grantWhere),
    ...(state.settled === undefined ? {} : { settledAt: presence(state.settled) }),
    ...(state.hasDocument === undefined ? {} : { documentId: presence(state.hasDocument) }),
    ...(state.advanced === undefined ? {} : { advancedBy: presence(state.advanced) }),
    ...(state.receiptAbsent === undefined ? {} : { receiptAbsent: state.receiptAbsent }),
  } satisfies Prisma.ResearchFundJournalEntryWhereInput;
}
// 紐づけ・解除で記録する内容は manualPayeeLink が決める。1 件でも競合していたら投げて巻き戻させる。
// 紐づけたら、書類の発行元の名称を支払先の表記として記録する（#1727）。
async function linkPayee(
  tx: Prisma.TransactionClient,
  bookId: string,
  entries: readonly ReviewEntry[],
  payeeId: string | null,
) {
  for (const entry of entries) {
    const link = manualPayeeLink(payeeId);
    const result = await tx.researchFundJournalEntry.updateMany({
      where: guard(bookId, entry, OPERABLE_STATES.setPayee),
      data: {
        payeeId: link.payeeId === null ? null : BigInt(link.payeeId),
        payeeLinkSource: link.source,
        payeeLinkConfidence: link.confidence,
        payeeLinkReason: link.reason,
      },
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
  }
  if (payeeId === null) return;
  // 書類から読み取った発行元の名称を、紐づけた支払先の表記として記録する（外すときは記録済みの表記を残す）。
  // 発行元は仕訳を作った読み取りの結果（model の job）から取る。(支払先, 正規化した表記) が既にあれば記録しない
  const aliases = entries.flatMap((entry) => {
    const alias = payeeAliasFromIssuer(entry.issuer);
    return alias === null || entry.documentId === null
      ? []
      : [
          {
            payeeId: BigInt(payeeId),
            ...alias,
            source: "manual" as const,
            documentId: BigInt(entry.documentId),
          },
        ];
  });
  if (aliases.length > 0)
    await tx.researchFundPayeeAlias.createMany({ data: aliases, skipDuplicates: true });
}
export class PrismaJournalReviewRepository implements JournalReviewRepository {
  constructor(private prisma: PrismaClient) {}
  async list(bookId: string) {
    return this.models(
      await this.prisma.researchFundJournalEntry.findMany({
        where: { bookId: BigInt(bookId), ...listWhere },
        include,
        orderBy: [{ entryDate: "desc" }, { id: "asc" }],
      }),
    );
  }
  private async models(rows: readonly Row[]) {
    const catalog = await loadLegalCategoryCatalog(this.prisma, rows);
    return rows
      .map((row) => model(row, catalog))
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
    return row ? ((await this.models([row]))[0] ?? null) : null;
  }
  async findMany(bookId: string, ids: readonly string[]) {
    return this.models(
      await this.prisma.researchFundJournalEntry.findMany({
        where: { bookId: BigInt(bookId), id: { in: ids.map((id) => BigInt(id)) }, ...expenseWhere },
        include,
      }),
    );
  }
  async legalCategoryOverrideAllowed(bookId: string) {
    const book = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { allowLegalCategoryOverride: true },
    });
    return book?.allowLegalCategoryOverride ?? false;
  }
  // 対象にできる仕訳の状態は OPERABLE_STATES.setLegalCategoryOverride（ドメイン）が決める。
  // 帳簿の行に共有ロックを取ってから許可を確かめる。許可の取り消し（PrismaBookRepository）は同じ行に排他ロックを
  // 取るので、両者は直列化され、許可が取り消された帳簿に上書きが残ることはない（条件だけでは帳簿の行をロックしない）。
  // 上書きは仕訳とは別の表に持つが、仕訳の更新時刻を進めて同時更新の照合に使う（複式行と hash は作り直さない）。
  async setLegalCategoryOverride(
    bookId: string,
    entry: ReviewEntry,
    input: LegalCategoryOverrideInput | null,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM research_fund_books WHERE id = ${BigInt(bookId)} FOR SHARE`;
      const result = await tx.researchFundJournalEntry.updateMany({
        where: {
          ...guard(bookId, entry, OPERABLE_STATES.setLegalCategoryOverride),
          book: { allowLegalCategoryOverride: true },
        },
        data: { updatedAt: new Date() },
      });
      if (result.count !== 1)
        throw new JournalReviewError("仕訳か帳簿が更新されました。画面を再読み込みしてください");
      const entryId = BigInt(entry.id);
      if (input === null)
        await tx.researchFundLegalCategoryOverride.deleteMany({ where: { entryId } });
      else
        await tx.researchFundLegalCategoryOverride.upsert({
          where: { entryId },
          create: { entryId, ...input, createdById: userId },
          update: { ...input, createdById: userId },
        });
      const row = await tx.researchFundJournalEntry.findUniqueOrThrow({
        where: { id: entryId },
        select: { updatedAt: true },
      });
      return { updatedAt: row.updatedAt.toISOString() };
    });
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
    return unique(() =>
      this.prisma.$transaction(async (tx) => {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: guard(bookId, entry, OPERABLE_STATES.edit),
          data: data(input),
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
        const row = await tx.researchFundJournalEntry.findFirst({
          where: { id: BigInt(entry.id), bookId: BigInt(bookId) },
          include,
        });
        if (!row || !model(row, await loadLegalCategoryCatalog(tx, [row])))
          throw new JournalReviewError("この形式の仕訳は編集できません");
        await tx.researchFundJournalLine.deleteMany({ where: { entryId: BigInt(entry.id) } });
        await tx.researchFundJournalLine.createMany({
          data: input.lines.map((l) => ({ ...l, entryId: BigInt(entry.id) })),
        });
        // 複式行の作り直しは仕訳の行を更新しないので、照合後に読んだ更新時刻が保存後のものになる
        return { updatedAt: row.updatedAt.toISOString() };
      }),
    );
  }
  // 一括の確認済は内容を変えないので、複式行と hash は再生成せず状態だけを進める。
  // 1 件でも競合していたらトランザクションごと巻き戻し、中途半端に一部だけ確認済にしない。
  async approveMany(bookId: string, entries: readonly ReviewEntry[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: guard(bookId, entry, OPERABLE_STATES.approve),
          data: { status: "approved" },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
      }
    });
  }
  // 一括の破棄は 1 件でも競合していたらトランザクションごと巻き戻す。
  // 精算済の仕訳は精算した額と記録が合わなくなるので消さない（OPERABLE_STATES.discard）。
  async discardMany(bookId: string, entries: readonly ReviewEntry[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.deleteMany({
          where: guard(bookId, entry, OPERABLE_STATES.discard),
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
          where: guard(bookId, entry, OPERABLE_STATES.revertToDraft),
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
        where: guard(bookId, entry, OPERABLE_STATES.unpublish),
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
  // 支出の形式に限って照合する（OPERABLE_STATES.revertToDraft）。
  async revertToDraft(bookId: string, entry: ReviewEntry) {
    const result = await this.prisma.researchFundJournalEntry.updateMany({
      where: guard(bookId, entry, OPERABLE_STATES.revertToDraft),
      data: { status: "draft" },
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
  }
  async discard(bookId: string, entry: ReviewEntry) {
    const result = await this.prisma.researchFundJournalEntry.deleteMany({
      where: guard(bookId, entry, OPERABLE_STATES.discard),
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
  // 精算済の仕訳は精算した額と記録が合わなくなるので変更しない（OPERABLE_STATES.setAdvancedBy）。
  // 1 件でも競合していたらトランザクションごと巻き戻し、一部だけ変わった状態にしない。
  async setAdvancedBy(bookId: string, entries: readonly ReviewEntry[], advancedBy: string | null) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: guard(bookId, entry, OPERABLE_STATES.setAdvancedBy),
          data: { advancedBy },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
      }
    });
  }
  // 徴難は公開内容に影響しないので、公開中・精算済の仕訳も対象にする（複式行と hash は作り直さない）。
  // 事情は徴難の仕訳だけが持てる（DB の CHECK 制約）ので、外すときは事情も消す。
  async setReceiptAbsent(bookId: string, entry: ReviewEntry, receiptAbsent: boolean) {
    const result = await this.prisma.researchFundJournalEntry.updateMany({
      where: guard(bookId, entry, OPERABLE_STATES.setReceiptAbsent),
      data: receiptAbsent ? { receiptAbsent } : { receiptAbsent, receiptAbsenceReason: null },
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
  }
  // 徴し難かった事情は公開内容に影響しないので、公開中・精算済の仕訳も対象にする（複式行と hash は作り直さない）。
  // 徴難でない仕訳は DB の CHECK 制約でも拒否されるが、競合として扱えるよう条件に含める（OPERABLE_STATES）。
  async setReceiptAbsenceReason(bookId: string, entry: ReviewEntry, reason: string | null) {
    const result = await this.prisma.researchFundJournalEntry.updateMany({
      where: guard(bookId, entry, OPERABLE_STATES.setReceiptAbsenceReason),
      data: { receiptAbsenceReason: reason },
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
  }
  // 書類の作成と紐づけを同じトランザクションで行い、紐づけが競合したら書類も作らない（どの仕訳にも紐づかない書類を残さない）。
  // 書類は採番前（receipt_number IS NULL）で作るので、次の採番操作で帳簿内の最大番号 + 1 から振られる。
  async attachDocument(
    bookId: string,
    entry: ReviewEntry,
    document: { storageKey: string; mime: string; originalFilename: string },
  ) {
    await unique(() =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.researchFundDocument.create({
          data: { ...document, bookId: BigInt(bookId) },
          select: { id: true },
        });
        // 編集の保存と同じく、hash は書類を含めて作る（手入力の仕訳は連番を使わない）
        const hash = JournalEntryHash.generate({
          entryDate: entry.entryDate,
          amount: entry.amount,
          description: entry.description,
          documentId: String(created.id),
        });
        if (hash.status === "invalid") throw new JournalReviewError(hash.errors[0].message);
        const result = await tx.researchFundJournalEntry.updateMany({
          where: guard(bookId, entry, OPERABLE_STATES.attachDocument),
          data: { documentId: created.id, hash: hash.value },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
      }),
    );
  }
  // 書類の行を書き換えて差し替える（領収書等番号・読み取りジョブ・支払先の表記は書類の行に付いたまま残る）。
  // 仕訳の hash は書類 ID を含むが ID は変わらないので作り直さない。
  async replaceDocument(
    bookId: string,
    entry: ReviewEntry,
    document: { storageKey: string; mime: string; originalFilename: string },
  ) {
    if (entry.documentId === null) throw new JournalReviewError("書類の無い仕訳です");
    const documentId = BigInt(entry.documentId);
    return await this.prisma.$transaction(async (tx) => {
      // 読み取りジョブの作成・再キュー（どちらも書類の行をロックする）と直列化するため、
      // 読み取り中かを数える前に書類の行をロックする
      await tx.$queryRaw`SELECT id FROM research_fund_documents WHERE id = ${documentId} FOR UPDATE`;
      const current = await tx.researchFundDocument.findFirst({
        where: { id: documentId, bookId: BigInt(bookId) },
        select: { storageKey: true, maskedKey: true },
      });
      if (!current) throw new JournalReviewError("書類が見つかりません");
      // 差し替えの可否と却下理由・差し替え後の公開用の版の状態は DocumentReplacement（ドメイン）が決める
      const reading = await tx.researchFundScanJob.count({
        where: { documentId, status: { in: [...DocumentReplacement.readingJobStatuses] } },
      });
      const readingRejection = DocumentReplacement.readingRejection(reading);
      if (readingRejection) throw new JournalReviewError(readingRejection);
      const touched = await tx.researchFundJournalEntry.updateMany({
        where: { ...guard(bookId, entry, OPERABLE_STATES.replaceDocument), documentId },
        data: { updatedAt: new Date() },
      });
      if (touched.count !== 1)
        throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
      await tx.researchFundJournalEntry.updateMany({
        where: { documentId, bookId: BigInt(bookId), id: { not: BigInt(entry.id) } },
        data: { updatedAt: new Date() },
      });
      // 同じ書類の仕訳の行ロックを取った後で公開中の仕訳を数え、並行する公開が確認と差し替えの間に入らないようにする
      const published = await tx.researchFundJournalEntry.count({
        where: { documentId, status: "published" },
      });
      const publishedRejection = DocumentReplacement.publishedEntriesRejection(published);
      if (publishedRejection) throw new JournalReviewError(publishedRejection);
      await tx.researchFundDocument.update({
        where: { id: documentId },
        data: {
          ...document,
          maskedKey: null,
          maskingStatus: DocumentReplacement.maskingStatusAfterReplacement,
          maskingStartedAt: null,
          maskingError: null,
          maskedRegionCount: null,
        },
      });
      return current;
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
  // 精算できる状態は OPERABLE_STATES.settle（ドメイン）が決める。1 件でも競合していたら巻き戻す。
  async settleMany(bookId: string, entries: readonly ReviewEntry[], settledAt: string) {
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const result = await tx.researchFundJournalEntry.updateMany({
          where: guard(bookId, entry, OPERABLE_STATES.settle),
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
          where: guard(bookId, entry, OPERABLE_STATES.unsettle),
          data: { settledAt: null },
        });
        if (result.count !== 1)
          throw new JournalReviewError("仕訳が更新されました。画面を再読み込みしてください");
      }
    });
  }
}
