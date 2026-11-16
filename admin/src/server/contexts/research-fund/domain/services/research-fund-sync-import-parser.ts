import {
  PoliticianHouse,
  ResearchFundBookStatus,
  ResearchFundEntrySource,
  ResearchFundEntryStatus,
  ResearchFundJournalSide,
  ResearchFundPayeeLinkSource,
} from "@prisma/client";
import type {
  ResearchFundSyncBook,
  ResearchFundSyncExport,
  ResearchFundSyncMembership,
  ResearchFundSyncPayee,
  ResearchFundSyncPolitician,
  ResearchFundSyncPoliticianProfile,
  ResearchFundSyncPromptVersion,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import { RESEARCH_FUND_SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS } from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import { SyncImportValidationError } from "@/server/contexts/shared/domain/models/sync-import-file";

/**
 * 調研費の環境間同期用 JSON を読み、現在のスキーマで取り込める形に検証する。
 *
 * - 現在のスキーマが知らないカラムがあれば、取りこぼしに気づけないので拒否する
 * - meta の議員室ごとの件数と中身の件数がずれていれば、ファイルが欠けているので拒否する
 * - 支払先と仕訳の議員の一致・支出群と仕訳の帳簿の一致などは DB ではなくアプリ側で保証しているので、
 *   ファイルの中の参照（支払先・支出群の仕訳）がファイルの同じ議員室・帳簿の中で解決できることを確かめる
 */

type JournalEntry = ResearchFundSyncBook["journalEntries"][number];
type JournalLine = JournalEntry["lines"][number];
type LegalCategoryOverride = NonNullable<JournalEntry["legalCategoryOverride"]>;
type ExpenditureGroup = ResearchFundSyncBook["expenditureGroups"][number];
type GroupOutcome = ExpenditureGroup["outcomes"][number];
type PayeeAlias = ResearchFundSyncPayee["aliases"][number];
type Meta = ResearchFundSyncExport["meta"];
type Counts = Meta["politicians"][number]["counts"];

const HOUSES: readonly string[] = Object.values(PoliticianHouse);
const BOOK_STATUSES: readonly string[] = Object.values(ResearchFundBookStatus);
const ENTRY_STATUSES: readonly string[] = Object.values(ResearchFundEntryStatus);
const ENTRY_SOURCES: readonly string[] = Object.values(ResearchFundEntrySource);
const JOURNAL_SIDES: readonly string[] = Object.values(ResearchFundJournalSide);
const PAYEE_LINK_SOURCES: readonly string[] = Object.values(ResearchFundPayeeLinkSource);

/** `@db.Date` のカラムの表記。 */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 仕訳の行の金額 Decimal(12, 0)（円・整数）。 */
const AMOUNT_PATTERN = /^-?\d{1,12}$/;
/** 支払先の紐づけの確信度 Decimal(4, 3)（0.000〜1.000）。 */
const CONFIDENCE_PATTERN = /^(0(\.\d{1,3})?|1(\.0{1,3})?)$/;

function fail(message: string): never {
  throw new SyncImportValidationError(message);
}

type Fields = Record<string, unknown>;

function readObject(value: unknown, path: string): Fields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${path} はオブジェクトである必要があります`);
  }
  return value as Fields;
}

function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(`${path} は配列である必要があります`);
  return value;
}

/** 現在のスキーマが知らないカラムを検出する（取りこぼしに気づけないので拒否する）。 */
function readRecord(value: unknown, path: string, knownKeys: readonly string[]): Fields {
  const record = readObject(value, path);
  const unknownKeys = Object.keys(record).filter((key) => !knownKeys.includes(key));
  if (unknownKeys.length > 0) {
    fail(
      `${path} に現在のスキーマが知らないカラムがあります: ${unknownKeys.join(", ")}。` +
        `ファイルの書き出し元のほうが新しい可能性があります`,
    );
  }
  return record;
}

function requiredString(record: Fields, key: string, path: string): string {
  const value = record[key];
  if (value === undefined) fail(`${path}.${key} がありません`);
  if (typeof value !== "string") fail(`${path}.${key} は文字列である必要があります`);
  return value;
}

function nullableString(record: Fields, key: string, path: string): string | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") fail(`${path}.${key} は文字列または null である必要があります`);
  return value;
}

function requiredBoolean(record: Fields, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") fail(`${path}.${key} は真偽値である必要があります`);
  return value;
}

function nullableBoolean(record: Fields, key: string, path: string): boolean | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") fail(`${path}.${key} は真偽値または null である必要があります`);
  return value;
}

function requiredInteger(record: Fields, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`${path}.${key} は整数である必要があります`);
  }
  return value;
}

function requiredEnum(
  record: Fields,
  key: string,
  path: string,
  allowed: readonly string[],
): string {
  const value = requiredString(record, key, path);
  if (!allowed.includes(value))
    fail(`${path}.${key} の値 "${value}" は現在のスキーマでは扱えません`);
  return value;
}

function nullableEnum(
  record: Fields,
  key: string,
  path: string,
  allowed: readonly string[],
): string | null {
  const value = nullableString(record, key, path);
  if (value !== null && !allowed.includes(value)) {
    fail(`${path}.${key} の値 "${value}" は現在のスキーマでは扱えません`);
  }
  return value;
}

function matchPattern(value: string, pattern: RegExp, message: string): string {
  if (!pattern.test(value)) fail(message);
  return value;
}

/**
 * 実在する日付かを確かめる。
 * `Date.parse` は 2026-02-30 のような実在しない日付を別の日付へ正規化してしまうので、
 * 解析結果を `YYYY-MM-DD` に戻して入力と一致することまで見る。
 */
function isRealDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function requiredDateOnly(record: Fields, key: string, path: string): string {
  const value = requiredString(record, key, path);
  if (!isRealDateOnly(value))
    fail(`${path}.${key} は実在する YYYY-MM-DD 形式の日付である必要があります`);
  return value;
}

function nullableDateOnly(record: Fields, key: string, path: string): string | null {
  return record[key] === undefined || record[key] === null
    ? null
    : requiredDateOnly(record, key, path);
}

function requiredTimestamp(record: Fields, key: string, path: string): string {
  const value = requiredString(record, key, path);
  if (Number.isNaN(Date.parse(value))) fail(`${path}.${key} は日時の文字列である必要があります`);
  return value;
}

function nullableTimestamp(record: Fields, key: string, path: string): string | null {
  return record[key] === undefined || record[key] === null
    ? null
    : requiredTimestamp(record, key, path);
}

function timestamps(record: Fields, path: string) {
  return {
    createdAt: requiredTimestamp(record, "createdAt", path),
    updatedAt: requiredTimestamp(record, "updatedAt", path),
  };
}

function parseList<T>(
  value: unknown,
  path: string,
  parse: (item: unknown, path: string) => T,
): T[] {
  return readArray(value, path).map((item, index) => parse(item, `${path}[${index}]`));
}

/** 自然キーの重複を検出する（取り込むと一意制約に当たるか、どちらかが黙って失われる）。 */
function assertUnique<T>(items: readonly T[], keyOf: (item: T) => string, label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) fail(`${label} が重複しています: ${key}`);
    seen.add(key);
  }
}

const TIMESTAMP_KEYS = ["createdAt", "updatedAt"] as const;

const PROFILE_KEYS = [
  "slug",
  "name",
  "nameKana",
  "termStart",
  "displayOrder",
  "isResearchFundPublic",
  "house",
  "constituency",
  "profileUrl",
  "websiteUrl",
  "snsUrls",
  ...TIMESTAMP_KEYS,
] as const;

function parseProfile(value: unknown, path: string): ResearchFundSyncPoliticianProfile {
  const record = readRecord(value, path, PROFILE_KEYS);
  const slug = requiredString(record, "slug", path);
  if (slug.trim() === "") fail(`${path}.slug が空です`);

  return {
    slug,
    name: requiredString(record, "name", path),
    nameKana: nullableString(record, "nameKana", path),
    termStart: requiredDateOnly(record, "termStart", path),
    displayOrder: requiredInteger(record, "displayOrder", path),
    isResearchFundPublic: requiredBoolean(record, "isResearchFundPublic", path),
    house: nullableEnum(record, "house", path, HOUSES),
    constituency: nullableString(record, "constituency", path),
    profileUrl: nullableString(record, "profileUrl", path),
    websiteUrl: nullableString(record, "websiteUrl", path),
    snsUrls: parseList(record.snsUrls, `${path}.snsUrls`, (item, itemPath) => {
      if (typeof item !== "string") fail(`${itemPath} は文字列である必要があります`);
      return item;
    }),
    ...timestamps(record, path),
  };
}

const MEMBERSHIP_KEYS = ["organizationSlug", "startedOn", "endedOn", ...TIMESTAMP_KEYS] as const;

function parseMembership(value: unknown, path: string): ResearchFundSyncMembership {
  const record = readRecord(value, path, MEMBERSHIP_KEYS);
  return {
    organizationSlug: requiredString(record, "organizationSlug", path),
    startedOn: requiredDateOnly(record, "startedOn", path),
    endedOn: nullableDateOnly(record, "endedOn", path),
    ...timestamps(record, path),
  };
}

const PAYEE_ALIAS_KEYS = ["name", "normalizedName", "source", ...TIMESTAMP_KEYS] as const;

function parsePayeeAlias(value: unknown, path: string): PayeeAlias {
  const record = readRecord(value, path, PAYEE_ALIAS_KEYS);
  return {
    name: requiredString(record, "name", path),
    normalizedName: requiredString(record, "normalizedName", path),
    source: requiredEnum(record, "source", path, PAYEE_LINK_SOURCES),
    ...timestamps(record, path),
  };
}

const PAYEE_KEYS = [
  "name",
  "address",
  "postalCode",
  "invoiceRegistrationNumber",
  ...TIMESTAMP_KEYS,
  "aliases",
] as const;

function parsePayee(value: unknown, path: string): ResearchFundSyncPayee {
  const record = readRecord(value, path, PAYEE_KEYS);
  const aliases = parseList(record.aliases, `${path}.aliases`, parsePayeeAlias);
  assertUnique(aliases, (alias) => alias.normalizedName, `${path}.aliases の normalizedName`);

  return {
    name: requiredString(record, "name", path),
    address: requiredString(record, "address", path),
    postalCode: nullableString(record, "postalCode", path),
    invoiceRegistrationNumber: nullableString(record, "invoiceRegistrationNumber", path),
    ...timestamps(record, path),
    aliases,
  };
}

const PROMPT_KEYS = ["version", "body", "isActive", ...TIMESTAMP_KEYS] as const;

function parsePrompt(value: unknown, path: string): ResearchFundSyncPromptVersion {
  const record = readRecord(value, path, PROMPT_KEYS);
  return {
    version: requiredInteger(record, "version", path),
    body: requiredString(record, "body", path),
    isActive: requiredBoolean(record, "isActive", path),
    ...timestamps(record, path),
  };
}

const LINE_KEYS = ["side", "accountKey", "amount"] as const;

function parseLine(value: unknown, path: string): JournalLine {
  const record = readRecord(value, path, LINE_KEYS);
  return {
    side: requiredEnum(record, "side", path, JOURNAL_SIDES),
    accountKey: requiredString(record, "accountKey", path),
    amount: matchPattern(
      requiredString(record, "amount", path),
      AMOUNT_PATTERN,
      `${path}.amount は円・整数（12 桁まで）の文字列である必要があります`,
    ),
  };
}

const OVERRIDE_KEYS = ["legalCategoryKey", "reason", ...TIMESTAMP_KEYS] as const;

function parseOverride(value: unknown, path: string): LegalCategoryOverride {
  const record = readRecord(value, path, OVERRIDE_KEYS);
  return {
    legalCategoryKey: requiredString(record, "legalCategoryKey", path),
    reason: requiredString(record, "reason", path),
    ...timestamps(record, path),
  };
}

const PAYEE_REF_KEYS = ["name", "address"] as const;

const ENTRY_KEYS = [
  "hash",
  "entryDate",
  "description",
  "status",
  "source",
  "splitGroup",
  "note",
  "memo",
  "advancedBy",
  "settledAt",
  "payee",
  "payeeLinkSource",
  "payeeLinkConfidence",
  "payeeLinkReason",
  "receiptAbsent",
  "receiptAbsenceReason",
  "fromFundManagementOrg",
  "treatAsOverTenThousand",
  "publishedAt",
  ...TIMESTAMP_KEYS,
  "lines",
  "legalCategoryOverride",
] as const;

function parseEntry(value: unknown, path: string): JournalEntry {
  const record = readRecord(value, path, ENTRY_KEYS);
  const confidence = nullableString(record, "payeeLinkConfidence", path);
  const payeePath = `${path}.payee`;
  const payeeRecord =
    record.payee === undefined || record.payee === null
      ? null
      : readRecord(record.payee, payeePath, PAYEE_REF_KEYS);

  return {
    hash: requiredString(record, "hash", path),
    entryDate: requiredDateOnly(record, "entryDate", path),
    description: requiredString(record, "description", path),
    status: requiredEnum(record, "status", path, ENTRY_STATUSES),
    source: requiredEnum(record, "source", path, ENTRY_SOURCES),
    splitGroup: nullableString(record, "splitGroup", path),
    note: nullableString(record, "note", path),
    memo: nullableString(record, "memo", path),
    advancedBy: nullableString(record, "advancedBy", path),
    settledAt: nullableDateOnly(record, "settledAt", path),
    payee: payeeRecord
      ? {
          name: requiredString(payeeRecord, "name", payeePath),
          address: requiredString(payeeRecord, "address", payeePath),
        }
      : null,
    payeeLinkSource: nullableEnum(record, "payeeLinkSource", path, PAYEE_LINK_SOURCES),
    payeeLinkConfidence:
      confidence === null
        ? null
        : matchPattern(
            confidence,
            CONFIDENCE_PATTERN,
            `${path}.payeeLinkConfidence は 0〜1（小数 3 桁まで）の文字列である必要があります`,
          ),
    payeeLinkReason: nullableString(record, "payeeLinkReason", path),
    receiptAbsent: requiredBoolean(record, "receiptAbsent", path),
    receiptAbsenceReason: nullableString(record, "receiptAbsenceReason", path),
    fromFundManagementOrg: requiredBoolean(record, "fromFundManagementOrg", path),
    treatAsOverTenThousand: nullableBoolean(record, "treatAsOverTenThousand", path),
    publishedAt: nullableTimestamp(record, "publishedAt", path),
    ...timestamps(record, path),
    lines: parseList(record.lines, `${path}.lines`, parseLine),
    legalCategoryOverride:
      record.legalCategoryOverride === undefined || record.legalCategoryOverride === null
        ? null
        : parseOverride(record.legalCategoryOverride, `${path}.legalCategoryOverride`),
  };
}

const OUTCOME_KEYS = ["label", "url", "displayOrder", ...TIMESTAMP_KEYS] as const;

function parseOutcome(value: unknown, path: string): GroupOutcome {
  const record = readRecord(value, path, OUTCOME_KEYS);
  return {
    label: requiredString(record, "label", path),
    url: nullableString(record, "url", path),
    displayOrder: requiredInteger(record, "displayOrder", path),
    ...timestamps(record, path),
  };
}

const GROUP_KEYS = [
  "title",
  "description",
  "displayOrder",
  ...TIMESTAMP_KEYS,
  "entryHashes",
  "outcomes",
] as const;

function parseGroup(value: unknown, path: string): ExpenditureGroup {
  const record = readRecord(value, path, GROUP_KEYS);
  return {
    title: requiredString(record, "title", path),
    description: requiredString(record, "description", path),
    displayOrder: requiredInteger(record, "displayOrder", path),
    ...timestamps(record, path),
    entryHashes: parseList(record.entryHashes, `${path}.entryHashes`, (item, itemPath) => {
      if (typeof item !== "string") fail(`${itemPath} は文字列である必要があります`);
      return item;
    }),
    outcomes: parseList(record.outcomes, `${path}.outcomes`, parseOutcome),
  };
}

const BOOK_KEYS = [
  "financialYear",
  "status",
  "publishedThrough",
  "asOfDate",
  "nextUpdateNote",
  "policyComment",
  "details",
  "allowLegalCategoryOverride",
  ...TIMESTAMP_KEYS,
  "journalEntries",
  "expenditureGroups",
] as const;

function parseBook(value: unknown, path: string): ResearchFundSyncBook {
  const record = readRecord(value, path, BOOK_KEYS);
  const journalEntries = parseList(record.journalEntries, `${path}.journalEntries`, parseEntry);
  const expenditureGroups = parseList(
    record.expenditureGroups,
    `${path}.expenditureGroups`,
    parseGroup,
  );

  // 支出群の仕訳は同じ帳簿の仕訳で、1 仕訳は 1 つの支出群にしか属せない。
  assertUnique(journalEntries, (entry) => entry.hash, `${path}.journalEntries の hash`);
  const hashes = new Set(journalEntries.map((entry) => entry.hash));
  const groupedHashes = expenditureGroups.flatMap((group) => group.entryHashes);
  for (const hash of groupedHashes) {
    if (!hashes.has(hash))
      fail(`${path} の支出群が、同じ帳簿に無い仕訳（hash: ${hash}）を指しています`);
  }
  assertUnique(groupedHashes, (hash) => hash, `${path} の支出群に属する仕訳`);

  return {
    financialYear: requiredInteger(record, "financialYear", path),
    status: requiredEnum(record, "status", path, BOOK_STATUSES),
    publishedThrough: nullableDateOnly(record, "publishedThrough", path),
    asOfDate: nullableDateOnly(record, "asOfDate", path),
    nextUpdateNote: nullableString(record, "nextUpdateNote", path),
    policyComment: nullableString(record, "policyComment", path),
    details: record.details === undefined ? null : record.details,
    allowLegalCategoryOverride: requiredBoolean(record, "allowLegalCategoryOverride", path),
    ...timestamps(record, path),
    journalEntries,
    expenditureGroups,
  };
}

const POLITICIAN_KEYS = [
  "profile",
  "memberships",
  "payees",
  "prompts",
  "addressSearchPrompts",
  "books",
] as const;

/** 支払先の自然キー（議員の中で一意）。 */
function payeeKey(payee: { name: string; address: string }): string {
  return JSON.stringify([payee.name, payee.address]);
}

function parsePolitician(value: unknown, path: string): ResearchFundSyncPolitician {
  const record = readRecord(value, path, POLITICIAN_KEYS);
  const politician: ResearchFundSyncPolitician = {
    profile: parseProfile(record.profile, `${path}.profile`),
    memberships: parseList(record.memberships, `${path}.memberships`, parseMembership),
    payees: parseList(record.payees, `${path}.payees`, parsePayee),
    prompts: parseList(record.prompts, `${path}.prompts`, parsePrompt),
    addressSearchPrompts: parseList(
      record.addressSearchPrompts,
      `${path}.addressSearchPrompts`,
      parsePrompt,
    ),
    books: parseList(record.books, `${path}.books`, parseBook),
  };

  assertUnique(politician.books, (book) => String(book.financialYear), `${path}.books の年度`);
  assertUnique(politician.payees, payeeKey, `${path}.payees の (name, address)`);
  assertUnique(
    politician.prompts,
    (prompt) => String(prompt.version),
    `${path}.prompts の version`,
  );
  assertUnique(
    politician.addressSearchPrompts,
    (prompt) => String(prompt.version),
    `${path}.addressSearchPrompts の version`,
  );

  // 仕訳の支払先は同じ議員の支払先でなければならない。
  const payeeKeys = new Set(politician.payees.map(payeeKey));
  for (const book of politician.books) {
    for (const entry of book.journalEntries) {
      if (entry.payee && !payeeKeys.has(payeeKey(entry.payee))) {
        fail(
          `${path} の ${book.financialYear} 年度の仕訳（hash: ${entry.hash}）の支払先 "${entry.payee.name}" が、同じ議員の支払先にありません`,
        );
      }
    }
  }

  return politician;
}

const COUNTS_KEYS = [
  "memberships",
  "books",
  "payees",
  "payeeAliases",
  "journalEntries",
  "journalLines",
  "legalCategoryOverrides",
  "expenditureGroups",
  "groupItems",
  "groupOutcomes",
  "prompts",
  "addressSearchPrompts",
] as const satisfies readonly (keyof Counts)[];

function parseMetaPolitician(value: unknown, path: string): Meta["politicians"][number] {
  const record = readRecord(value, path, ["slug", "counts"]);
  const countsPath = `${path}.counts`;
  const countsRecord = readRecord(record.counts, countsPath, COUNTS_KEYS);
  const counts = {} as Counts;
  for (const key of COUNTS_KEYS) counts[key] = requiredInteger(countsRecord, key, countsPath);
  return { slug: requiredString(record, "slug", path), counts };
}

const META_KEYS = [
  "formatVersion",
  "exportedAt",
  "sourceEnvironment",
  "latestMigrationName",
  "politicians",
] as const;

function parseMeta(value: unknown): Meta {
  const path = "meta";
  const record = readRecord(value, path, META_KEYS);

  const formatVersion = requiredInteger(record, "formatVersion", path);
  if (!RESEARCH_FUND_SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS.includes(formatVersion)) {
    fail(
      `ファイルの形式バージョン ${formatVersion} には対応していません` +
        `（対応: ${RESEARCH_FUND_SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS.join(", ")}）`,
    );
  }

  return {
    formatVersion,
    exportedAt: requiredString(record, "exportedAt", path),
    sourceEnvironment: requiredString(record, "sourceEnvironment", path),
    latestMigrationName: nullableString(record, "latestMigrationName", path),
    politicians: parseList(record.politicians, `${path}.politicians`, parseMetaPolitician),
  };
}

/** 中身から数えた件数（書き出し側の meta と同じ数え方）。 */
function countPolitician(politician: ResearchFundSyncPolitician): Counts {
  const entries = politician.books.flatMap((book) => book.journalEntries);
  const groups = politician.books.flatMap((book) => book.expenditureGroups);

  return {
    memberships: politician.memberships.length,
    books: politician.books.length,
    payees: politician.payees.length,
    payeeAliases: politician.payees.reduce((sum, payee) => sum + payee.aliases.length, 0),
    journalEntries: entries.length,
    journalLines: entries.reduce((sum, entry) => sum + entry.lines.length, 0),
    legalCategoryOverrides: entries.filter((entry) => entry.legalCategoryOverride !== null).length,
    expenditureGroups: groups.length,
    groupItems: groups.reduce((sum, group) => sum + group.entryHashes.length, 0),
    groupOutcomes: groups.reduce((sum, group) => sum + group.outcomes.length, 0),
    prompts: politician.prompts.length,
    addressSearchPrompts: politician.addressSearchPrompts.length,
  };
}

/** meta の議員室・件数と中身がずれていたら、ファイルが途中で欠けている。 */
function assertMetaMatches(file: ResearchFundSyncExport): void {
  const metaSlugs = file.meta.politicians.map((politician) => politician.slug);
  const slugs = file.politicians.map((politician) => politician.profile.slug);
  if (metaSlugs.join("\n") !== slugs.join("\n")) {
    fail(
      `meta の議員室（${metaSlugs.join(", ")}）とファイルの議員室（${slugs.join(", ")}）が一致しません`,
    );
  }

  file.politicians.forEach((politician, index) => {
    const expected = file.meta.politicians[index].counts;
    const actual = countPolitician(politician);
    for (const key of COUNTS_KEYS) {
      if (expected[key] !== actual[key]) {
        fail(
          `議員 ${politician.profile.slug} の ${key} の件数が meta と一致しません（meta: ${expected[key]} / 実際: ${actual[key]}）`,
        );
      }
    }
  });
}

const ROOT_KEYS = ["meta", "politicians"] as const;

/** 同期用 JSON の文字列を検証済みの構造にする。受け付けられなければ {@link SyncImportValidationError}。 */
export function parseResearchFundSyncImportFile(text: string): ResearchFundSyncExport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail("JSON として読み取れません");
  }

  const record = readRecord(raw, "ファイル", ROOT_KEYS);
  const meta = parseMeta(record.meta);
  const politicians = parseList(record.politicians, "politicians", parsePolitician);

  if (politicians.length === 0) fail("ファイルに議員室が含まれていません");
  assertUnique(politicians, (politician) => politician.profile.slug, "議員の slug");

  const file: ResearchFundSyncExport = { meta, politicians };
  assertMetaMatches(file);
  return file;
}
