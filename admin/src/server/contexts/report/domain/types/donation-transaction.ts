/**
 * Donation Transaction Types
 *
 * Input types for donation-related transactions fetched from the repository.
 * These types represent the data structure returned by the database layer.
 */

/**
 * SYUUSHI07_07 KUBUN1: 個人からの寄附のトランザクション
 */
export interface PersonalDonationTransaction {
  transactionNo: string;
  transactionDate: Date;
  debitAmount: number;
  creditAmount: number;
  memo: string | null;
  // 寄付者情報（現在はダミー値を返す）
  donorName: string; // 寄附者氏名
  donorAddress: string; // 住所
  donorOccupation: string; // 職業
}
