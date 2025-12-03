import { prisma } from "@/server/lib/prisma";
import type { TransactionType } from "@/shared/models/transaction";
import { fragment } from "../document-builder";
import { formatAmount, sanitizeText } from "../utils/xml-utils";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";

const TEN_MAN_THRESHOLD = 100_000;

interface SectionTransaction {
  transactionNo: string;
  label?: string | null;
  description?: string | null;
  memo?: string | null;
  amount: number;
}

export interface OtherIncomeRow {
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

export interface OtherIncomeSectionParams {
  politicalOrganizationId: string;
  financialYear: number;
}

export async function buildOtherIncomeSection(
  params: OtherIncomeSectionParams,
): Promise<OtherIncomeSection> {
  const transactions = await prisma.transaction.findMany({
    where: {
      politicalOrganizationId: BigInt(params.politicalOrganizationId),
      financialYear: params.financialYear,
      transactionType: "income" satisfies TransactionType,
      OR: [
        { categoryKey: "other-income" },
        { friendlyCategory: "その他の収入" },
      ],
    },
    orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
  });

  const normalized: SectionTransaction[] = transactions.map((transaction) => ({
    transactionNo: transaction.transactionNo,
    label: transaction.label,
    description: transaction.description,
    memo: transaction.memo,
    amount: resolveTransactionAmount(
      transaction.debitAmount,
      transaction.creditAmount,
    ),
  }));

  return aggregateOtherIncomeFromTransactions(normalized);
}

export function aggregateOtherIncomeFromTransactions(
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

export function serializeOtherIncomeSection(
  section: OtherIncomeSection,
): XMLBuilder {
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
  const teks = sanitizeText(
    transaction.label || transaction.description || transaction.transactionNo,
    200,
  );

  return teks;
}

function buildBikou(transaction: SectionTransaction): string {
  const mfRowInfo = `MF行番号: ${transaction.transactionNo || "-"}`;
  const memoText = sanitizeText(transaction.memo, 160);
  const combined = memoText ? `${memoText} / ${mfRowInfo}` : mfRowInfo;

  return sanitizeText(combined, 200) || mfRowInfo;
}

function resolveTransactionAmount(
  debitAmount: { toString: () => string },
  creditAmount: { toString: () => string },
): number {
  const credit = Number(creditAmount.toString());
  if (Number.isFinite(credit) && credit > 0) {
    return credit;
  }

  const debit = Number(debitAmount.toString());
  return Number.isFinite(debit) ? debit : 0;
}
