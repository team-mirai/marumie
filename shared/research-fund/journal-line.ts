import type { ResearchFundRow } from "@/shared/research-fund/aggregation";
import type { ResearchFundLegalCategory } from "@/shared/research-fund/legal-category";

/**
 * 調研費の仕訳（複式）の行から「金額」「支出か支給か」「科目」を読み取る規則。
 *
 * 仕訳は借方・貸方の行で保存されるが、画面や集計が知りたいのは「いくらの支出（支給）で、科目は何か」。
 * その読み取り方を admin（確認画面・公開プレビュー・帳簿の累計・支出群・提出用の帳簿・支給の一覧・支払先）と
 * webapp（公開ページ）のすべてがこのファイルの関数で行う。画面ごとに書き分けると、行の形が変わったときに
 * 画面ごとに金額が変わり、公開プレビューと公開ページの金額が食い違う。
 *
 * 現在の仕訳の作り方（admin の JournalPosting）:
 * - 支出: 費用科目の借方 1 行 ／ 普通預金（または現金）の貸方 1 行
 * - 支給・返還: 普通預金の借方 1 行 ／ 調査研究費収入の貸方 1 行
 */

/** 普通預金（調研費口座）。支給の入金先で、支出の既定の決済科目 */
export const BANK_ACCOUNT_KEY = "bank";
/** 現金。支出の決済科目としてだけ使える */
export const CASH_ACCOUNT_KEY = "cash";
/** 調査研究費収入。支給・返還の収入科目 */
export const GRANT_INCOME_ACCOUNT_KEY = "grant-income";

/**
 * 支出の行: 費用科目の借方。DB の絞り込み（`lines: { some: EXPENSE_LINE }`）にもそのまま使える形で持つ。
 */
export const EXPENSE_LINE = { side: "debit", account: { type: "expense" } } as const;
/**
 * 支給の行: 調査研究費収入の貸方。相手勘定の普通預金は数えない。
 * DB の絞り込み（`lines: { some: GRANT_LINE }`）にもそのまま使える形で持つ。
 */
export const GRANT_LINE = { side: "credit", accountKey: GRANT_INCOME_ACCOUNT_KEY } as const;

/** 金額。DB の Decimal（toNumber を持つ）か数値 */
type LineAmount = number | { toNumber(): number };

interface SidedLine {
  readonly side: string;
}
interface ExpenseCandidateLine extends SidedLine {
  readonly account: { readonly type: string };
}
interface GrantCandidateLine extends SidedLine {
  readonly accountKey: string;
}
/** 支出・支給のどちらにあたるかを読み取るのに要る列 */
export interface ReadableJournalLine extends ExpenseCandidateLine, GrantCandidateLine {}

const amountOf = (line: { readonly amount: LineAmount }): number =>
  typeof line.amount === "number" ? line.amount : line.amount.toNumber();

const sumOf = (lines: readonly { readonly amount: LineAmount }[]): number =>
  lines.reduce((total, line) => total + amountOf(line), 0);

export function isExpenseLine(line: ExpenseCandidateLine): boolean {
  return line.side === EXPENSE_LINE.side && line.account.type === EXPENSE_LINE.account.type;
}

export function isGrantLine(line: GrantCandidateLine): boolean {
  return line.side === GRANT_LINE.side && line.accountKey === GRANT_LINE.accountKey;
}

/** 行が支出・支給のどちらにあたるか。相手勘定（普通預金・現金）の行は null */
export function journalLineType(line: ReadableJournalLine): ResearchFundRow["type"] | null {
  if (isExpenseLine(line)) return "expense";
  if (isGrantLine(line)) return "grant";
  return null;
}

/** 支出の行（費用科目の借方）。1 仕訳に複数あることがある */
export function expenseLinesOf<T extends ExpenseCandidateLine>(lines: readonly T[]): T[] {
  return lines.filter(isExpenseLine);
}

/** 支出の金額: 支出の行の合計 */
export function expenseAmountOf(
  lines: readonly (ExpenseCandidateLine & { readonly amount: LineAmount })[],
): number {
  return sumOf(expenseLinesOf(lines));
}

/** 支給の金額: 支給の行の合計 */
export function grantAmountOf(
  lines: readonly (GrantCandidateLine & { readonly amount: LineAmount })[],
): number {
  return sumOf(lines.filter(isGrantLine));
}

/** 仕訳全体の金額: 借方の合計（貸借は一致するので貸方の合計でも同じ） */
export function entryAmountOf(lines: readonly (SidedLine & { readonly amount: LineAmount })[]): number {
  return sumOf(lines.filter((line) => line.side === "debit"));
}

/**
 * 仕訳を集計の行（公開ページ・公開プレビュー・帳簿の累計が集計に使う形）に読み替える。
 * 支出の行と支給の行を 1 行ずつ集計の行にし、相手勘定の行は数えない。
 * 法定区分の上書きは支出の行にだけ添える（上書きが無ければ添えない）。
 * 呼び出し側が明細や科目名を添えられるよう、元の行と組にして返す。
 */
export function researchFundRowsOf<T extends ReadableJournalLine & { readonly amount: LineAmount }>(
  entry: {
    /** 帳簿上の日付（YYYY-MM-DD） */
    readonly date: string;
    readonly lines: readonly T[];
    readonly legalCategoryOverride: ResearchFundLegalCategory | null;
  },
): { line: T; row: ResearchFundRow }[] {
  return entry.lines.flatMap((line) => {
    const type = journalLineType(line);
    if (!type) return [];
    const row: ResearchFundRow = {
      date: entry.date,
      accountKey: line.accountKey,
      amount: amountOf(line),
      type,
      ...(type === "expense" && entry.legalCategoryOverride
        ? { legalCategoryOverride: entry.legalCategoryOverride }
        : {}),
    };
    return [{ line, row }];
  });
}

/**
 * 「支出（または支給）の行 1 行と、普通預金の相手勘定 1 行」だけでできた仕訳の、支出（支給）の行。
 * 確認画面のフォームが損失なく作り直せるのはこの形だけなので、それ以外（3 行以上・現金払い・貸借の不一致）は null。
 * - 支出: 費用科目の借方 ／ 普通預金の貸方
 * - 支給: 普通預金の借方 ／ 調査研究費収入の貸方
 */
export function twoLineAmountLineOf<T extends ReadableJournalLine & { readonly amount: LineAmount }>(
  lines: readonly T[],
  type: ResearchFundRow["type"],
): T | null {
  if (lines.length !== 2) return null;
  const amountLine = lines.find((line) =>
    type === "grant" ? isGrantLine(line) : isExpenseLine(line),
  );
  const bankSide = type === "grant" ? "debit" : "credit";
  const bankLine = lines.find(
    (line) => line.side === bankSide && line.accountKey === BANK_ACCOUNT_KEY,
  );
  if (!amountLine || !bankLine || amountOf(amountLine) !== amountOf(bankLine)) return null;
  return amountLine;
}
