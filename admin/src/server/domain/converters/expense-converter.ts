/**
 * Expense Converter
 *
 * Converts raw transaction data from the database into expense-related domain objects.
 * This is a pure function layer that handles data transformation and business rules.
 */

import type {
  UtilityExpenseTransaction,
  EquipmentSuppliesExpenseTransaction,
  OfficeExpenseTransaction,
  OrganizationalExpenseTransaction,
  ElectionExpenseTransaction,
  PublicationExpenseTransaction,
  AdvertisingExpenseTransaction,
  FundraisingPartyExpenseTransaction,
  OtherBusinessExpenseTransaction,
  ResearchExpenseTransaction,
  DonationsGrantsExpenseTransaction,
  OtherExpenseTransaction,
  GrantToHeadquartersTransaction,
} from "@/server/domain/types/expense-transaction";

// Re-export input types for consumers
export type {
  UtilityExpenseTransaction,
  EquipmentSuppliesExpenseTransaction,
  OfficeExpenseTransaction,
  OrganizationalExpenseTransaction,
  ElectionExpenseTransaction,
  PublicationExpenseTransaction,
  AdvertisingExpenseTransaction,
  FundraisingPartyExpenseTransaction,
  OtherBusinessExpenseTransaction,
  ResearchExpenseTransaction,
  DonationsGrantsExpenseTransaction,
  OtherExpenseTransaction,
  GrantToHeadquartersTransaction,
};

// ============================================================
// Output Types (Domain Objects)
// ============================================================

/**
 * SYUUSHI07_14: 経常経費の支出の明細行
 */
export interface RegularExpenseRow {
  ichirenNo: string; // 一連番号
  mokuteki: string; // 目的
  kingaku: number; // 金額
  dt: Date; // 年月日
  nm: string; // 氏名
  adr: string; // 住所
  bikou?: string; // 備考
  ryousyu?: number; // 領収書区分
}

/**
 * SYUUSHI07_14: 経常経費の支出（KUBUN別）
 */
export interface RegularExpenseSection {
  totalAmount: number; // 合計
  sonotaGk: number; // その他の支出
  rows: RegularExpenseRow[];
}

/**
 * SYUUSHI07_14: 経常経費の支出
 */
export interface RegularExpenseData {
  utilities: RegularExpenseSection; // KUBUN1: 光熱水費
  equipmentSupplies: RegularExpenseSection; // KUBUN2: 備品・消耗品費
  officeExpenses: RegularExpenseSection; // KUBUN3: 事務所費
}

/**
 * SYUUSHI07_15: 政治活動費の支出の明細行
 */
export interface PoliticalActivityExpenseRow {
  ichirenNo: string; // 一連番号
  mokuteki: string; // 目的
  kingaku: number; // 金額
  dt: Date; // 年月日
  nm: string; // 氏名
  adr: string; // 住所
  bikou?: string; // 備考
  ryousyu?: number; // 領収書区分
}

/**
 * SYUUSHI07_15: 政治活動費の支出（KUBUN別）
 */
export interface PoliticalActivityExpenseSection {
  himoku: string; // 費目
  totalAmount: number; // 合計
  sonotaGk: number; // その他の支出
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15: 政治活動費の支出
 */
export interface PoliticalActivityExpenseData {
  organizationalActivities: PoliticalActivityExpenseSection; // KUBUN1: 組織活動費
  electionExpenses: PoliticalActivityExpenseSection; // KUBUN2: 選挙関係費
  publicationExpenses: PoliticalActivityExpenseSection; // KUBUN3: 機関紙誌の発行事業費
  advertisingExpenses: PoliticalActivityExpenseSection; // KUBUN4: 宣伝事業費
  fundraisingPartyExpenses: PoliticalActivityExpenseSection; // KUBUN5: 政治資金パーティー開催事業費
  otherBusinessExpenses: PoliticalActivityExpenseSection; // KUBUN6: その他の事業費
  researchExpenses: PoliticalActivityExpenseSection; // KUBUN7: 調査研究費
  donationsGrantsExpenses: PoliticalActivityExpenseSection; // KUBUN8: 寄附・交付金
  otherExpenses: PoliticalActivityExpenseSection; // KUBUN9: その他の経費
}

/**
 * SYUUSHI07_16: 本部又は支部に対する交付金の明細行
 */
export interface GrantToHeadquartersRow {
  ichirenNo: string; // 一連番号
  shisyutuKmk: string; // 支出項目
  kingaku: number; // 金額
  dt: Date; // 年月日
  honsibuNm: string; // 本支部名称
  jimuAdr: string; // 主たる事務所の所在地
  bikou?: string; // 備考
}

/**
 * SYUUSHI07_16: 本部又は支部に対する交付金
 */
export interface GrantToHeadquartersSection {
  totalAmount: number;
  rows: GrantToHeadquartersRow[];
}

// ============================================================
// Internal Types
// ============================================================

interface ExpenseTransaction {
  transactionNo: string;
  transactionDate: Date;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  amount: number;
  counterpartName: string;
  counterpartAddress: string;
}

// ============================================================
// Converter Functions
// ============================================================

/**
 * SYUUSHI07_14: 経常経費を変換
 */
export function convertToRegularExpenseData(
  utilities: UtilityExpenseTransaction[],
  equipmentSupplies: EquipmentSuppliesExpenseTransaction[],
  officeExpenses: OfficeExpenseTransaction[],
): RegularExpenseData {
  return {
    utilities: aggregateRegularExpenseSection(
      utilities.map(toExpenseTransaction),
    ),
    equipmentSupplies: aggregateRegularExpenseSection(
      equipmentSupplies.map(toExpenseTransaction),
    ),
    officeExpenses: aggregateRegularExpenseSection(
      officeExpenses.map(toExpenseTransaction),
    ),
  };
}

/**
 * SYUUSHI07_15: 政治活動費を変換
 */
export function convertToPoliticalActivityExpenseData(
  organizationalActivities: OrganizationalExpenseTransaction[],
  electionExpenses: ElectionExpenseTransaction[],
  publicationExpenses: PublicationExpenseTransaction[],
  advertisingExpenses: AdvertisingExpenseTransaction[],
  fundraisingPartyExpenses: FundraisingPartyExpenseTransaction[],
  otherBusinessExpenses: OtherBusinessExpenseTransaction[],
  researchExpenses: ResearchExpenseTransaction[],
  donationsGrantsExpenses: DonationsGrantsExpenseTransaction[],
  otherExpenses: OtherExpenseTransaction[],
): PoliticalActivityExpenseData {
  return {
    organizationalActivities: aggregatePoliticalActivityExpenseSection(
      organizationalActivities.map(toExpenseTransaction),
      "組織活動費",
    ),
    electionExpenses: aggregatePoliticalActivityExpenseSection(
      electionExpenses.map(toExpenseTransaction),
      "選挙関係費",
    ),
    publicationExpenses: aggregatePoliticalActivityExpenseSection(
      publicationExpenses.map(toExpenseTransaction),
      "機関紙誌の発行事業費",
    ),
    advertisingExpenses: aggregatePoliticalActivityExpenseSection(
      advertisingExpenses.map(toExpenseTransaction),
      "宣伝事業費",
    ),
    fundraisingPartyExpenses: aggregatePoliticalActivityExpenseSection(
      fundraisingPartyExpenses.map(toExpenseTransaction),
      "政治資金パーティー開催事業費",
    ),
    otherBusinessExpenses: aggregatePoliticalActivityExpenseSection(
      otherBusinessExpenses.map(toExpenseTransaction),
      "その他の事業費",
    ),
    researchExpenses: aggregatePoliticalActivityExpenseSection(
      researchExpenses.map(toExpenseTransaction),
      "調査研究費",
    ),
    donationsGrantsExpenses: aggregatePoliticalActivityExpenseSection(
      donationsGrantsExpenses.map(toExpenseTransaction),
      "寄附・交付金",
    ),
    otherExpenses: aggregatePoliticalActivityExpenseSection(
      otherExpenses.map(toExpenseTransaction),
      "その他の経費",
    ),
  };
}

/**
 * SYUUSHI07_16: 本部又は支部に対する交付金を変換
 */
export function convertToGrantToHeadquartersSection(
  transactions: GrantToHeadquartersTransaction[],
): GrantToHeadquartersSection {
  const expenseTransactions = transactions.map(toExpenseTransaction);
  return aggregateGrantToHeadquartersSection(expenseTransactions);
}

// ============================================================
// Input Mapping Functions
// ============================================================

function toExpenseTransaction(
  t:
    | UtilityExpenseTransaction
    | EquipmentSuppliesExpenseTransaction
    | OfficeExpenseTransaction
    | OrganizationalExpenseTransaction
    | ElectionExpenseTransaction
    | PublicationExpenseTransaction
    | AdvertisingExpenseTransaction
    | FundraisingPartyExpenseTransaction
    | OtherBusinessExpenseTransaction
    | ResearchExpenseTransaction
    | DonationsGrantsExpenseTransaction
    | OtherExpenseTransaction
    | GrantToHeadquartersTransaction,
): ExpenseTransaction {
  return {
    transactionNo: t.transactionNo,
    transactionDate: t.transactionDate,
    friendlyCategory: t.friendlyCategory,
    label: t.label,
    description: t.description,
    memo: t.memo,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
    counterpartName: t.counterpartName,
    counterpartAddress: t.counterpartAddress,
  };
}

// ============================================================
// Aggregation Functions
// ============================================================

function aggregateRegularExpenseSection(
  transactions: ExpenseTransaction[],
): RegularExpenseSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const rows: RegularExpenseRow[] = transactions.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    mokuteki: buildMokuteki(t),
    kingaku: Math.round(t.amount),
    dt: t.transactionDate,
    nm: sanitizeText(t.counterpartName, 120),
    adr: sanitizeText(t.counterpartAddress, 120),
    bikou: buildBikou(t),
  }));

  return {
    totalAmount,
    sonotaGk: 0, // その他の支出は現時点では0
    rows,
  };
}

function aggregatePoliticalActivityExpenseSection(
  transactions: ExpenseTransaction[],
  himoku: string,
): PoliticalActivityExpenseSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const rows: PoliticalActivityExpenseRow[] = transactions.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    mokuteki: buildMokuteki(t),
    kingaku: Math.round(t.amount),
    dt: t.transactionDate,
    nm: sanitizeText(t.counterpartName, 120),
    adr: sanitizeText(t.counterpartAddress, 120),
    bikou: buildBikou(t),
  }));

  return {
    himoku,
    totalAmount,
    sonotaGk: 0, // その他の支出は現時点では0
    rows,
  };
}

function aggregateGrantToHeadquartersSection(
  transactions: ExpenseTransaction[],
): GrantToHeadquartersSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const rows: GrantToHeadquartersRow[] = transactions.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    shisyutuKmk: buildShisyutuKmk(t),
    kingaku: Math.round(t.amount),
    dt: t.transactionDate,
    honsibuNm: sanitizeText(t.counterpartName, 120),
    jimuAdr: sanitizeText(t.counterpartAddress, 120),
    bikou: buildBikou(t),
  }));

  return {
    totalAmount,
    rows,
  };
}

// ============================================================
// Field Builder Functions
// ============================================================

function buildMokuteki(t: ExpenseTransaction): string {
  // 優先順位: description > label > friendlyCategory
  const mokuteki = t.description || t.label || t.friendlyCategory || "";
  return sanitizeText(mokuteki, 200);
}

function buildShisyutuKmk(t: ExpenseTransaction): string {
  // 優先順位: friendlyCategory > label > description
  const kmk = t.friendlyCategory || t.label || t.description || "交付金";
  return sanitizeText(kmk, 100);
}

function buildBikou(t: ExpenseTransaction): string {
  const mfRowInfo = `MF行番号: ${t.transactionNo || "-"}`;
  const memoText = sanitizeText(t.memo, 70);
  const combined = memoText ? `${memoText} / ${mfRowInfo}` : mfRowInfo;

  return sanitizeText(combined, 100) || mfRowInfo;
}

function resolveTransactionAmount(
  debitAmount: number,
  creditAmount: number,
): number {
  // 支出の場合は借方(debit)を優先
  if (Number.isFinite(debitAmount) && debitAmount > 0) {
    return debitAmount;
  }

  return Number.isFinite(creditAmount) ? creditAmount : 0;
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
