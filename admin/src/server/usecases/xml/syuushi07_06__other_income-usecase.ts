import { fragment } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { ITransactionXmlRepository } from "../../repositories/interfaces/transaction-xml-repository.interface";

const TEN_MAN_THRESHOLD = 100_000;

// ============================================================
// Types
// ============================================================

interface SectionTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  amount: number;
}

interface OtherIncomeRow {
  ichirenNo: string;
  tekiyou: string;
  kingaku: number;
  bikou?: string;
}

export interface OtherIncomeSection {
  totalAmount: number;
  underThresholdAmount: number | null;
  rows: OtherIncomeRow[];
}

export interface Syuushi0706Input {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface Syuushi0706Result {
  sectionXml: XMLBuilder;
  section: OtherIncomeSection;
  filename: string;
}

// ============================================================
// Usecase
// ============================================================

export class Syuushi0706OtherIncomeUsecase {
  constructor(private repository: ITransactionXmlRepository) {}

  async execute(input: Syuushi0706Input): Promise<Syuushi0706Result> {
    const transactions = await this.repository.findOtherIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    const sectionTransactions: SectionTransaction[] = transactions.map((t) => ({
      transactionNo: t.transactionNo,
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
    }));

    const section = aggregateOtherIncomeFromTransactions(sectionTransactions);
    const sectionXml = serializeOtherIncomeSection(section);
    const filename = `SYUUSHI07_06_${input.politicalOrganizationId}_${input.financialYear}.xml`;

    return {
      sectionXml,
      section,
      filename,
    };
  }
}

// ============================================================
// Pure Functions
// ============================================================

function aggregateOtherIncomeFromTransactions(
  transactions: SectionTransaction[],
): OtherIncomeSection {
  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const detailedRows = transactions.filter(
    (transaction) => transaction.amount >= TEN_MAN_THRESHOLD,
  );
  const underThresholdRows = transactions.filter(
    (transaction) => transaction.amount < TEN_MAN_THRESHOLD,
  );

  const underThresholdAmount = underThresholdRows.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const rows: OtherIncomeRow[] = detailedRows.map((transaction, index) => ({
    ichirenNo: (index + 1).toString(),
    tekiyou: buildTekiyou(transaction),
    kingaku: Math.round(transaction.amount),
    bikou: buildBikou(transaction),
  }));

  return {
    totalAmount,
    underThresholdAmount:
      underThresholdAmount > 0 ? underThresholdAmount : null,
    rows,
  };
}

function serializeOtherIncomeSection(section: OtherIncomeSection): XMLBuilder {
  const frag = fragment();
  const root = frag.ele("SYUUSHI07_06");
  const sheet = root.ele("SHEET");

  sheet.ele("KINGAKU_GK").txt(formatAmount(section.totalAmount));

  if (section.underThresholdAmount !== null) {
    sheet.ele("MIMAN_GK").txt(formatAmount(section.underThresholdAmount));
  } else {
    sheet.ele("MIMAN_GK");
  }

  for (const row of section.rows) {
    const rowEle = sheet.ele("ROW");
    rowEle.ele("ICHIREN_NO").txt(row.ichirenNo);
    rowEle.ele("TEKIYOU").txt(row.tekiyou);
    rowEle.ele("KINGAKU").txt(formatAmount(row.kingaku));

    if (row.bikou) {
      rowEle.ele("BIKOU").txt(row.bikou);
    } else {
      rowEle.ele("BIKOU");
    }
  }

  return frag;
}

function buildTekiyou(transaction: SectionTransaction): string {
  // タグ (friendlyCategory) を優先して使用
  return sanitizeText(
    transaction.friendlyCategory ||
      transaction.label ||
      transaction.description ||
      transaction.transactionNo,
    200,
  );
}

function buildBikou(transaction: SectionTransaction): string {
  const mfRowInfo = `MF行番号: ${transaction.transactionNo || "-"}`;
  const memoText = sanitizeText(transaction.memo, 160);
  const combined = memoText ? `${memoText} / ${mfRowInfo}` : mfRowInfo;

  return sanitizeText(combined, 200) || mfRowInfo;
}

function resolveTransactionAmount(
  debitAmount: number,
  creditAmount: number,
): number {
  if (Number.isFinite(creditAmount) && creditAmount > 0) {
    return creditAmount;
  }

  return Number.isFinite(debitAmount) ? debitAmount : 0;
}

// ============================================================
// Utilities
// ============================================================

function formatAmount(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? null)) {
    return "0";
  }
  const rounded = Math.round(Number(value));
  return rounded.toString();
}

function sanitizeText(
  value: string | null | undefined,
  maxLength?: number,
): string {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (maxLength && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}

// Export for testing
export {
  aggregateOtherIncomeFromTransactions,
  serializeOtherIncomeSection,
  resolveTransactionAmount,
  type SectionTransaction,
};
