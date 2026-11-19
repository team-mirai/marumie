import {
  RESEARCH_FUND_SYNC_EXPORT_FORMAT_VERSION,
  type ResearchFundSyncExport,
  type ResearchFundSyncPolitician,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import type { ResearchFundSyncSourcePolitician } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-export-repository.interface";

/** 仕訳の行の金額は Decimal(12, 0)（円・整数）。 */
const AMOUNT_DECIMAL_PLACES = 0;
/** 支払先の紐づけの確信度は Decimal(4, 3)。 */
const CONFIDENCE_DECIMAL_PLACES = 3;

/**
 * `@db.Date` のカラムを `YYYY-MM-DD` にする。
 * Prisma は日付のみのカラムを UTC 0 時の Date として返すため、必ず UTC で読む。
 */
function formatDateOnly(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNullableDateOnly(date: Date | null): string | null {
  return date ? formatDateOnly(date) : null;
}

function timestamps(row: { createdAt: Date; updatedAt: Date }) {
  return { createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function buildPolitician(source: ResearchFundSyncSourcePolitician): ResearchFundSyncPolitician {
  const { profile } = source;

  return {
    profile: {
      slug: profile.slug,
      name: profile.name,
      nameKana: profile.nameKana,
      termStart: formatDateOnly(profile.termStart),
      displayOrder: profile.displayOrder,
      isResearchFundPublic: profile.isResearchFundPublic,
      house: profile.house,
      constituency: profile.constituency,
      profileUrl: profile.profileUrl,
      websiteUrl: profile.websiteUrl,
      snsUrls: [...profile.snsUrls],
      ...timestamps(profile),
    },
    memberships: source.memberships.map((membership) => ({
      organizationSlug: membership.organizationSlug,
      startedOn: formatDateOnly(membership.startedOn),
      endedOn: formatNullableDateOnly(membership.endedOn),
      ...timestamps(membership),
    })),
    payees: source.payees.map((payee) => ({
      name: payee.name,
      address: payee.address,
      postalCode: payee.postalCode,
      invoiceRegistrationNumber: payee.invoiceRegistrationNumber,
      ...timestamps(payee),
      aliases: payee.aliases.map((alias) => ({
        name: alias.name,
        normalizedName: alias.normalizedName,
        source: alias.source,
        ...timestamps(alias),
      })),
    })),
    prompts: source.prompts.map(buildPromptVersion),
    addressSearchPrompts: source.addressSearchPrompts.map(buildPromptVersion),
    books: source.books.map((book) => ({
      financialYear: book.financialYear,
      status: book.status,
      publishedThrough: formatNullableDateOnly(book.publishedThrough),
      asOfDate: formatNullableDateOnly(book.asOfDate),
      nextUpdateNote: book.nextUpdateNote,
      policyComment: book.policyComment,
      details: book.details,
      allowLegalCategoryOverride: book.allowLegalCategoryOverride,
      ...timestamps(book),
      journalEntries: book.journalEntries.map((entry) => ({
        hash: entry.hash,
        entryDate: formatDateOnly(entry.entryDate),
        description: entry.description,
        status: entry.status,
        source: entry.source,
        splitGroup: entry.splitGroup,
        note: entry.note,
        memo: entry.memo,
        advancedBy: entry.advancedBy,
        settledAt: formatNullableDateOnly(entry.settledAt),
        payee: entry.payee ? { name: entry.payee.name, address: entry.payee.address } : null,
        payeeLinkSource: entry.payeeLinkSource,
        payeeLinkConfidence: entry.payeeLinkConfidence
          ? entry.payeeLinkConfidence.toFixed(CONFIDENCE_DECIMAL_PLACES)
          : null,
        payeeLinkReason: entry.payeeLinkReason,
        receiptAbsent: entry.receiptAbsent,
        receiptAbsenceReason: entry.receiptAbsenceReason,
        fromFundManagementOrg: entry.fromFundManagementOrg,
        treatAsOverTenThousand: entry.treatAsOverTenThousand,
        publishedAt: entry.publishedAt ? entry.publishedAt.toISOString() : null,
        ...timestamps(entry),
        lines: entry.lines.map((line) => ({
          side: line.side,
          accountKey: line.accountKey,
          amount: line.amount.toFixed(AMOUNT_DECIMAL_PLACES),
        })),
        legalCategoryOverride: entry.legalCategoryOverride
          ? {
              legalCategoryKey: entry.legalCategoryOverride.legalCategoryKey,
              reason: entry.legalCategoryOverride.reason,
              ...timestamps(entry.legalCategoryOverride),
            }
          : null,
      })),
      expenditureGroups: book.expenditureGroups.map((group) => ({
        title: group.title,
        description: group.description,
        displayOrder: group.displayOrder,
        ...timestamps(group),
        entryHashes: [...group.entryHashes],
        outcomes: group.outcomes.map((outcome) => ({
          label: outcome.label,
          url: outcome.url,
          displayOrder: outcome.displayOrder,
          ...timestamps(outcome),
        })),
      })),
    })),
  };
}

function buildPromptVersion(prompt: ResearchFundSyncSourcePolitician["prompts"][number]) {
  return {
    version: prompt.version,
    body: prompt.body,
    isActive: prompt.isActive,
    ...timestamps(prompt),
  };
}

function countPolitician(politician: ResearchFundSyncPolitician) {
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

interface BuildResearchFundSyncExportInput {
  sources: ResearchFundSyncSourcePolitician[];
  exportedAt: Date;
  /** 書き出し元の環境識別（VERCEL_ENV 相当）。 */
  sourceEnvironment: string;
  latestMigrationName: string | null;
}

/**
 * DB から読み出した議員室のデータを、環境間で復元できる JSON の構造に組み立てる。
 * DB の ID・ユーザーへの参照・書類は含めず、自然キーだけで表現する。
 */
export function buildResearchFundSyncExport({
  sources,
  exportedAt,
  sourceEnvironment,
  latestMigrationName,
}: BuildResearchFundSyncExportInput): ResearchFundSyncExport {
  const politicians = sources.map(buildPolitician);

  return {
    meta: {
      formatVersion: RESEARCH_FUND_SYNC_EXPORT_FORMAT_VERSION,
      exportedAt: exportedAt.toISOString(),
      sourceEnvironment,
      latestMigrationName,
      politicians: politicians.map((politician) => ({
        slug: politician.profile.slug,
        counts: countPolitician(politician),
      })),
    },
    politicians,
  };
}
