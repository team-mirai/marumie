import "server-only";

import {
  type PoliticianHouse,
  Prisma,
  type PrismaClient,
  type ResearchFundBookStatus,
  type ResearchFundEntrySource,
  type ResearchFundEntryStatus,
  type ResearchFundJournalSide,
  type ResearchFundPayeeLinkSource,
} from "@prisma/client";
import type {
  ResearchFundSyncBook,
  ResearchFundSyncExport,
  ResearchFundSyncPolitician,
  ResearchFundSyncPromptVersion,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import type {
  ResearchFundSyncDeletingCounts,
  ResearchFundSyncImportResultPolitician,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import type {
  IResearchFundSyncImportRepository,
  ResearchFundSyncTargetPolitician,
} from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-import-repository.interface";
import { SyncImportTimeoutError } from "@/server/contexts/shared/domain/models/sync-import-file";

/**
 * 1 文あたり PostgreSQL のバインド変数上限（65535）を超えないための分割サイズ。
 * 最も列数の多い仕訳（20 列超）に合わせて小さめに取る。
 */
const INSERT_CHUNK_SIZE = 1000;

/** 議員室まるごとの置き換えは既定の 5 秒では終わらないので、関数の上限（300 秒）まで使う。 */
const REPLACE_TRANSACTION_TIMEOUT_MS = 300_000;
const REPLACE_TRANSACTION_MAX_WAIT_MS = 15_000;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** `@db.Date` のカラムは UTC 0 時の Date として扱う（書き出し側と対称）。 */
function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toNullableDateOnly(value: string | null): Date | null {
  return value === null ? null : toDateOnly(value);
}

function toTimestamps(row: { createdAt: string; updatedAt: string }) {
  return { createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) };
}

/** 支払先の自然キー（議員の中で一意）。 */
function payeeKey(payee: { name: string; address: string }): string {
  return JSON.stringify([payee.name, payee.address]);
}

/** 仕訳の自然キー（帳簿 + hash）。 */
function entryKey(bookId: bigint, hash: string): string {
  return `${bookId}:${hash}`;
}

/**
 * 直前に自分で作った ID 対応表を引く。引けないのは実装の不整合（パーサーが参照を検証済み）なので、
 * 中途半端な紐づけを入れずにトランザクションごと失敗させる。
 */
function resolveId<T>(idByKey: Map<string, T>, key: string, label: string): T {
  const id = idByKey.get(key);
  if (id === undefined) {
    throw new Error(`調研費の同期データの取り込み中に ${label} の ID を解決できませんでした`);
  }
  return id;
}

function toPromptCreateInput(prompt: ResearchFundSyncPromptVersion, politicianId: bigint) {
  return {
    politicianId,
    version: prompt.version,
    body: prompt.body,
    isActive: prompt.isActive,
    ...toTimestamps(prompt),
  };
}

type JournalEntry = ResearchFundSyncBook["journalEntries"][number];

function toEntryCreateInput(
  entry: JournalEntry,
  bookId: bigint,
  payeeIdByKey: Map<string, bigint>,
): Prisma.ResearchFundJournalEntryCreateManyInput {
  return {
    bookId,
    hash: entry.hash,
    entryDate: toDateOnly(entry.entryDate),
    description: entry.description,
    // パーサーが現在の enum の値であることを検証済み。
    status: entry.status as ResearchFundEntryStatus,
    source: entry.source as ResearchFundEntrySource,
    // 書類は運ばないので「書類なし」（元ファイルなし）として入れる。
    documentId: null,
    splitGroup: entry.splitGroup,
    note: entry.note,
    memo: entry.memo,
    advancedBy: entry.advancedBy,
    settledAt: toNullableDateOnly(entry.settledAt),
    payeeId: entry.payee
      ? resolveId(payeeIdByKey, payeeKey(entry.payee), `仕訳 ${entry.hash} の支払先`)
      : null,
    payeeLinkSource: entry.payeeLinkSource as ResearchFundPayeeLinkSource | null,
    payeeLinkConfidence: entry.payeeLinkConfidence,
    payeeLinkReason: entry.payeeLinkReason,
    receiptAbsent: entry.receiptAbsent,
    receiptAbsenceReason: entry.receiptAbsenceReason,
    fromFundManagementOrg: entry.fromFundManagementOrg,
    treatAsOverTenThousand: entry.treatAsOverTenThousand,
    publishedAt: entry.publishedAt === null ? null : new Date(entry.publishedAt),
    ...toTimestamps(entry),
  };
}

export class PrismaResearchFundSyncImportRepository implements IResearchFundSyncImportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findPoliticiansBySlugs(slugs: string[]): Promise<ResearchFundSyncTargetPolitician[]> {
    const rows = await this.prisma.politician.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true },
    });
    return rows.map((row) => ({ id: row.id.toString(), slug: row.slug, name: row.name }));
  }

  async countPoliticianData(politicianId: string): Promise<ResearchFundSyncDeletingCounts> {
    const id = BigInt(politicianId);
    const inBooks = { book: { politicianId: id } };

    const [
      books,
      payees,
      journalEntries,
      expenditureGroups,
      prompts,
      addressSearchPrompts,
      documents,
      scanJobs,
    ] = await Promise.all([
      this.prisma.researchFundBook.count({ where: { politicianId: id } }),
      this.prisma.researchFundPayee.count({ where: { politicianId: id } }),
      this.prisma.researchFundJournalEntry.count({ where: inBooks }),
      this.prisma.researchFundExpenditureGroup.count({ where: inBooks }),
      this.prisma.researchFundPrompt.count({ where: { politicianId: id } }),
      this.prisma.researchFundAddressSearchPrompt.count({ where: { politicianId: id } }),
      this.prisma.researchFundDocument.count({ where: inBooks }),
      this.prisma.researchFundScanJob.count({ where: { batch: inBooks } }),
    ]);

    return {
      books,
      payees,
      journalEntries,
      expenditureGroups,
      prompts,
      addressSearchPrompts,
      documents,
      scanJobs,
    };
  }

  async findExistingOrganizationSlugs(slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];
    const rows = await this.prisma.politicalOrganization.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  }

  async findExistingAccountKeys(keys: string[]): Promise<string[]> {
    if (keys.length === 0) return [];
    const rows = await this.prisma.researchFundAccount.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    });
    return rows.map((row) => row.key);
  }

  async findExistingLegalCategoryKeys(keys: string[]): Promise<string[]> {
    if (keys.length === 0) return [];
    const rows = await this.prisma.researchFundAccount.findMany({
      where: { legalCategoryKey: { in: keys } },
      select: { legalCategoryKey: true },
      distinct: ["legalCategoryKey"],
    });
    return rows.flatMap((row) => (row.legalCategoryKey ? [row.legalCategoryKey] : []));
  }

  async replaceResearchFundSyncData(
    file: ResearchFundSyncExport,
  ): Promise<ResearchFundSyncImportResultPolitician[]> {
    try {
      // 複数の議員室の置き換えを 1 つのトランザクションにまとめ、途中で失敗したらどれも変えない。
      return await this.prisma.$transaction(
        async (tx) => {
          const results: ResearchFundSyncImportResultPolitician[] = [];
          for (const politician of file.politicians) {
            results.push(await replacePolitician(tx, politician));
          }
          return results;
        },
        {
          timeout: REPLACE_TRANSACTION_TIMEOUT_MS,
          maxWait: REPLACE_TRANSACTION_MAX_WAIT_MS,
        },
      );
    } catch (error) {
      throw toTimeoutErrorIfExpired(error);
    }
  }
}

/**
 * トランザクションが制限時間を超えて取り消された（P2028）ことを、画面に出せるエラーにする。
 * それ以外のエラーはそのまま返す。
 */
function toTimeoutErrorIfExpired(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028") {
    return new SyncImportTimeoutError(
      `取り込みが制限時間（${REPLACE_TRANSACTION_TIMEOUT_MS / 1000} 秒）内に終わらなかったため中止しました。変更はすべて取り消されています`,
      { cause: error },
    );
  }
  return error;
}

/** 議員室 1 件分を置き換える（議員がいなければ作る）。 */
async function replacePolitician(
  tx: Prisma.TransactionClient,
  politician: ResearchFundSyncPolitician,
): Promise<ResearchFundSyncImportResultPolitician> {
  const { slug } = politician.profile;
  // 同じ議員への取り込みが同時に走ると、互いの登録が削除から見えず帳簿が混ざるので、議員の行をロックして直列化する。
  const [existing] = await tx.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM politicians WHERE slug = ${slug} FOR UPDATE
  `;

  let politicianId: bigint;
  let deletedJournalEntryCount = 0;
  let createdMembershipCount = 0;

  if (existing) {
    // 既存の議員はプロフィール・所属履歴・担当ユーザーを変えず、調研費データだけを入れ直す。
    politicianId = existing.id;
    deletedJournalEntryCount = await deleteResearchFundData(tx, politicianId);
  } else {
    const created = await createPolitician(tx, politician);
    politicianId = created.politicianId;
    createdMembershipCount = created.membershipCount;
  }

  await insertResearchFundData(tx, politicianId, politician);

  return {
    slug,
    mode: existing ? "replace" : "create",
    deletedJournalEntryCount,
    importedJournalEntryCount: politician.books.reduce(
      (sum, book) => sum + book.journalEntries.length,
      0,
    ),
    createdMembershipCount,
  };
}

/**
 * 議員室の調研費データを全て消す。消した仕訳の件数を返す。
 *
 * 順序に意味がある:
 * 1. 帳簿を消すと、仕訳（行・法定区分の上書き・支出群の紐づけ）・支出群（成果）・書類・スキャン履歴が
 *    onDelete: Cascade で一緒に消える
 * 2. 支払先は仕訳から NoAction で参照されるので、仕訳が消えてから消す（表記は Cascade で消える）
 * 3. 読み取りプロンプトはスキャン履歴から参照される（削除時に止まる）ので、スキャン履歴が消えてから消す
 */
async function deleteResearchFundData(
  tx: Prisma.TransactionClient,
  politicianId: bigint,
): Promise<number> {
  const journalEntryCount = await tx.researchFundJournalEntry.count({
    where: { book: { politicianId } },
  });

  await tx.researchFundBook.deleteMany({ where: { politicianId } });
  await tx.researchFundPayee.deleteMany({ where: { politicianId } });
  await tx.researchFundPrompt.deleteMany({ where: { politicianId } });
  await tx.researchFundAddressSearchPrompt.deleteMany({ where: { politicianId } });

  return journalEntryCount;
}

/**
 * ファイルのプロフィール（顔写真なし）で議員を作る。
 * 所属履歴は、この環境に同じ slug の政治団体があるものだけ作る。
 */
async function createPolitician(
  tx: Prisma.TransactionClient,
  politician: ResearchFundSyncPolitician,
): Promise<{ politicianId: bigint; membershipCount: number }> {
  const { profile } = politician;
  const created = await tx.politician.create({
    data: {
      slug: profile.slug,
      name: profile.name,
      nameKana: profile.nameKana,
      termStart: toDateOnly(profile.termStart),
      displayOrder: profile.displayOrder,
      isResearchFundPublic: profile.isResearchFundPublic,
      // パーサーが現在の enum の値であることを検証済み。
      house: profile.house as PoliticianHouse | null,
      constituency: profile.constituency,
      profileUrl: profile.profileUrl,
      websiteUrl: profile.websiteUrl,
      snsUrls: profile.snsUrls,
      photoPath: null,
      ...toTimestamps(profile),
    },
    select: { id: true },
  });

  const organizationSlugs = [
    ...new Set(politician.memberships.map((membership) => membership.organizationSlug)),
  ];
  const organizations =
    organizationSlugs.length === 0
      ? []
      : await tx.politicalOrganization.findMany({
          where: { slug: { in: organizationSlugs } },
          select: { id: true, slug: true },
        });
  const organizationIdBySlug = new Map(organizations.map((org) => [org.slug, org.id]));

  const memberships = politician.memberships.flatMap((membership) => {
    const politicalOrganizationId = organizationIdBySlug.get(membership.organizationSlug);
    if (politicalOrganizationId === undefined) return [];
    return [
      {
        politicianId: created.id,
        politicalOrganizationId,
        startedOn: toDateOnly(membership.startedOn),
        endedOn: toNullableDateOnly(membership.endedOn),
        ...toTimestamps(membership),
      },
    ];
  });
  if (memberships.length > 0) {
    await tx.politicianOrgMembership.createMany({ data: memberships });
  }

  return { politicianId: created.id, membershipCount: memberships.length };
}

/**
 * ファイルの調研費データを入れる。
 * 支払先と仕訳の議員の一致・支出群と仕訳の帳簿の一致は DB では保証されないので、
 * 支払先は同じ議員の中の自然キーで、支出群の仕訳は同じ帳簿の中の hash で引き当てる。
 */
async function insertResearchFundData(
  tx: Prisma.TransactionClient,
  politicianId: bigint,
  politician: ResearchFundSyncPolitician,
): Promise<void> {
  // 1. 読み取りプロンプト・住所検索プロンプト
  if (politician.prompts.length > 0) {
    await tx.researchFundPrompt.createMany({
      data: politician.prompts.map((prompt) => toPromptCreateInput(prompt, politicianId)),
    });
  }
  if (politician.addressSearchPrompts.length > 0) {
    await tx.researchFundAddressSearchPrompt.createMany({
      data: politician.addressSearchPrompts.map((prompt) =>
        toPromptCreateInput(prompt, politicianId),
      ),
    });
  }

  // 2. 支払先と表記。表記の「最初に見つかった書類」は運ばないので空にする。
  const payeeIdByKey = new Map<string, bigint>();
  for (const payeeChunk of chunk(politician.payees, INSERT_CHUNK_SIZE)) {
    const created = await tx.researchFundPayee.createManyAndReturn({
      data: payeeChunk.map((payee) => ({
        politicianId,
        name: payee.name,
        address: payee.address,
        postalCode: payee.postalCode,
        invoiceRegistrationNumber: payee.invoiceRegistrationNumber,
        ...toTimestamps(payee),
      })),
      select: { id: true, name: true, address: true },
    });
    for (const row of created) payeeIdByKey.set(payeeKey(row), row.id);
  }

  const aliases = politician.payees.flatMap((payee) =>
    payee.aliases.map((alias) => ({
      payeeId: resolveId(payeeIdByKey, payeeKey(payee), `支払先 ${payee.name}`),
      name: alias.name,
      normalizedName: alias.normalizedName,
      source: alias.source as ResearchFundPayeeLinkSource,
      documentId: null,
      ...toTimestamps(alias),
    })),
  );
  for (const aliasChunk of chunk(aliases, INSERT_CHUNK_SIZE)) {
    await tx.researchFundPayeeAlias.createMany({ data: aliasChunk });
  }

  // 3. 帳簿ごとに、仕訳（行・法定区分の上書き）と支出群（紐づけ・成果）を入れる。
  for (const book of politician.books) {
    await insertBook(tx, politicianId, book, payeeIdByKey);
  }
}

async function insertBook(
  tx: Prisma.TransactionClient,
  politicianId: bigint,
  book: ResearchFundSyncBook,
  payeeIdByKey: Map<string, bigint>,
): Promise<void> {
  const createdBook = await tx.researchFundBook.create({
    data: {
      politicianId,
      financialYear: book.financialYear,
      status: book.status as ResearchFundBookStatus,
      publishedThrough: toNullableDateOnly(book.publishedThrough),
      asOfDate: toNullableDateOnly(book.asOfDate),
      nextUpdateNote: book.nextUpdateNote,
      policyComment: book.policyComment,
      details: book.details === null ? Prisma.DbNull : (book.details as Prisma.InputJsonValue),
      allowLegalCategoryOverride: book.allowLegalCategoryOverride,
      ...toTimestamps(book),
    },
    select: { id: true },
  });
  const bookId = createdBook.id;

  const entryIdByKey = new Map<string, bigint>();
  for (const entryChunk of chunk(book.journalEntries, INSERT_CHUNK_SIZE)) {
    const created = await tx.researchFundJournalEntry.createManyAndReturn({
      data: entryChunk.map((entry) => toEntryCreateInput(entry, bookId, payeeIdByKey)),
      select: { id: true, hash: true },
    });
    for (const row of created) entryIdByKey.set(entryKey(bookId, row.hash), row.id);
  }
  const resolveEntryId = (hash: string) =>
    resolveId(entryIdByKey, entryKey(bookId, hash), `${book.financialYear} 年度の仕訳 ${hash}`);

  const lines = book.journalEntries.flatMap((entry) =>
    entry.lines.map((line) => ({
      entryId: resolveEntryId(entry.hash),
      side: line.side as ResearchFundJournalSide,
      accountKey: line.accountKey,
      amount: line.amount,
    })),
  );
  for (const lineChunk of chunk(lines, INSERT_CHUNK_SIZE)) {
    await tx.researchFundJournalLine.createMany({ data: lineChunk });
  }

  // 上書きした人（createdById）は運ばないので空にする。
  const overrides = book.journalEntries.flatMap((entry) =>
    entry.legalCategoryOverride
      ? [
          {
            entryId: resolveEntryId(entry.hash),
            legalCategoryKey: entry.legalCategoryOverride.legalCategoryKey,
            reason: entry.legalCategoryOverride.reason,
            ...toTimestamps(entry.legalCategoryOverride),
          },
        ]
      : [],
  );
  for (const overrideChunk of chunk(overrides, INSERT_CHUNK_SIZE)) {
    await tx.researchFundLegalCategoryOverride.createMany({ data: overrideChunk });
  }

  // 支出群は自然キーを持たないので 1 件ずつ作って ID を受け取る（帳簿あたり数十件程度）。
  for (const group of book.expenditureGroups) {
    const createdGroup = await tx.researchFundExpenditureGroup.create({
      data: {
        bookId,
        title: group.title,
        description: group.description,
        displayOrder: group.displayOrder,
        ...toTimestamps(group),
      },
      select: { id: true },
    });

    if (group.entryHashes.length > 0) {
      await tx.researchFundGroupItem.createMany({
        data: group.entryHashes.map((hash) => ({
          groupId: createdGroup.id,
          entryId: resolveEntryId(hash),
        })),
      });
    }
    if (group.outcomes.length > 0) {
      await tx.researchFundGroupOutcome.createMany({
        data: group.outcomes.map((outcome) => ({
          groupId: createdGroup.id,
          label: outcome.label,
          url: outcome.url,
          displayOrder: outcome.displayOrder,
          ...toTimestamps(outcome),
        })),
      });
    }
  }
}
