import { prisma } from "@/server/lib/prisma";
import type { TransactionType } from "@/shared/models/transaction";
import { escapeXml, formatAmount, sanitizeText } from "../utils/xml-utils";

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
    bikou: sanitizeText(transaction.memo, 200) || undefined,
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
): string {
  const lines = [
    "<SYUUSHI07_06>",
    "  <SHEET>",
    `    <KINGAKU_GK>${formatAmount(section.totalAmount)}</KINGAKU_GK>`,
    section.underThresholdAmount !== null
      ? `    <MIMAN_GK>${formatAmount(section.underThresholdAmount)}</MIMAN_GK>`
      : "    <MIMAN_GK/>",
  ];

  section.rows.forEach((row) => {
    lines.push("    <ROW>");
    lines.push(`      <ICHIREN_NO>${row.ichirenNo}</ICHIREN_NO>`);
    lines.push(`      <TEKIYOU>${escapeXml(row.tekiyou)}</TEKIYOU>`);
    lines.push(`      <KINGAKU>${formatAmount(row.kingaku)}</KINGAKU>`);
    lines.push(
      row.bikou
        ? `      <BIKOU>${escapeXml(row.bikou)}</BIKOU>`
        : "      <BIKOU/>",
    );
    lines.push("    </ROW>");
  });

  lines.push("  </SHEET>");
  lines.push("</SYUUSHI07_06>");

  return lines.join("\n");
}

function buildTekiyou(transaction: SectionTransaction): string {
  const teks = sanitizeText(
    transaction.label || transaction.description || transaction.transactionNo,
    200,
  );

  return teks;
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
