/**
 * Expense Transaction Types
 *
 * Input types for expense-related transactions fetched from the repository.
 * These types represent the data structure returned by the database layer.
 */

/**
 * 共通フィールド（全支出トランザクション共通）
 */
interface BaseExpenseTransaction {
  transactionNo: string;
  transactionDate: Date;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
  // 支払先情報（現在はダミー値を返す）
  counterpartName: string; // 支払先氏名/名称
  counterpartAddress: string; // 支払先住所
}

/**
 * SYUUSHI07_14 KUBUN1: 光熱水費のトランザクション
 */
export interface UtilityExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_14 KUBUN2: 備品・消耗品費のトランザクション
 */
export interface EquipmentSuppliesExpenseTransaction
  extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_14 KUBUN3: 事務所費のトランザクション
 */
export interface OfficeExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN1: 組織活動費のトランザクション
 */
export interface OrganizationalExpenseTransaction
  extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN2: 選挙関係費のトランザクション
 */
export interface ElectionExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN3: 機関紙誌の発行事業費のトランザクション
 */
export interface PublicationExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN4: 宣伝事業費のトランザクション
 */
export interface AdvertisingExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN5: 政治資金パーティー開催事業費のトランザクション
 */
export interface FundraisingPartyExpenseTransaction
  extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN6: その他の事業費のトランザクション
 */
export interface OtherBusinessExpenseTransaction
  extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN7: 調査研究費のトランザクション
 */
export interface ResearchExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN8: 寄附・交付金のトランザクション
 */
export interface DonationsGrantsExpenseTransaction
  extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN9: その他の経費のトランザクション
 */
export interface OtherExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_16: 本部又は支部に対する交付金のトランザクション
 */
export interface GrantToHeadquartersTransaction extends BaseExpenseTransaction {
  counterpartName: string; // 本支部名称
  counterpartAddress: string; // 主たる事務所の所在地
}
