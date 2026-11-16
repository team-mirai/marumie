/**
 * 調研費の環境間同期用エクスポートの入力（DB から読み出したままの形）。
 *
 * 日付は Date、金額・確信度は Decimal のまま受け取り、文字列化はドメインサービス
 * （research-fund-sync-export-builder）が行う。Prisma に依存しないよう、
 * Decimal は必要な最小のインターフェースだけを要求する。
 * DB の ID・ユーザーへの参照・書類はこの時点で含めない。
 */

/** Prisma の Decimal のように、桁を落とさず固定小数の文字列へ変換できる値。 */
interface DecimalLike {
  toFixed(decimalPlaces: number): string;
}

interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

interface ResearchFundSyncSourceProfile extends Timestamps {
  slug: string;
  name: string;
  nameKana: string | null;
  termStart: Date;
  displayOrder: number;
  isResearchFundPublic: boolean;
  house: string | null;
  constituency: string | null;
  profileUrl: string | null;
  websiteUrl: string | null;
  snsUrls: string[];
}

interface ResearchFundSyncSourceMembership extends Timestamps {
  organizationSlug: string;
  startedOn: Date;
  endedOn: Date | null;
}

interface ResearchFundSyncSourcePayee extends Timestamps {
  name: string;
  address: string;
  postalCode: string | null;
  invoiceRegistrationNumber: string | null;
  aliases: (Timestamps & { name: string; normalizedName: string; source: string })[];
}

interface ResearchFundSyncSourcePromptVersion extends Timestamps {
  version: number;
  body: string;
  isActive: boolean;
}

interface ResearchFundSyncSourceJournalEntry extends Timestamps {
  hash: string;
  entryDate: Date;
  description: string;
  status: string;
  source: string;
  splitGroup: string | null;
  note: string | null;
  memo: string | null;
  advancedBy: string | null;
  settledAt: Date | null;
  payee: { name: string; address: string } | null;
  payeeLinkSource: string | null;
  payeeLinkConfidence: DecimalLike | null;
  payeeLinkReason: string | null;
  receiptAbsent: boolean;
  receiptAbsenceReason: string | null;
  fromFundManagementOrg: boolean;
  treatAsOverTenThousand: boolean | null;
  publishedAt: Date | null;
  lines: { side: string; accountKey: string; amount: DecimalLike }[];
  legalCategoryOverride: (Timestamps & { legalCategoryKey: string; reason: string }) | null;
}

interface ResearchFundSyncSourceExpenditureGroup extends Timestamps {
  title: string;
  description: string;
  displayOrder: number;
  /** 対象の仕訳の hash */
  entryHashes: string[];
  outcomes: (Timestamps & { label: string; url: string | null; displayOrder: number })[];
}

interface ResearchFundSyncSourceBook extends Timestamps {
  financialYear: number;
  status: string;
  publishedThrough: Date | null;
  asOfDate: Date | null;
  nextUpdateNote: string | null;
  policyComment: string | null;
  details: unknown;
  allowLegalCategoryOverride: boolean;
  journalEntries: ResearchFundSyncSourceJournalEntry[];
  expenditureGroups: ResearchFundSyncSourceExpenditureGroup[];
}

export interface ResearchFundSyncSourcePolitician {
  profile: ResearchFundSyncSourceProfile;
  memberships: ResearchFundSyncSourceMembership[];
  payees: ResearchFundSyncSourcePayee[];
  prompts: ResearchFundSyncSourcePromptVersion[];
  addressSearchPrompts: ResearchFundSyncSourcePromptVersion[];
  books: ResearchFundSyncSourceBook[];
}

export interface IResearchFundSyncExportRepository {
  /**
   * 指定した議員室の同期対象データをまとめて取得する。
   * 1 件でも見つからない議員があれば null（呼び出し元は 404 にする）。
   * 並びは議員の slug 順。
   */
  findSourcesByPoliticianIds(
    politicianIds: string[],
  ): Promise<ResearchFundSyncSourcePolitician[] | null>;
}
