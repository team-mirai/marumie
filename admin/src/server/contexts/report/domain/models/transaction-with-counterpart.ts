export interface TransactionWithCounterpart {
  id: string;
  transactionNo: string;
  transactionDate: Date;
  financialYear: number;
  transactionType: "income" | "expense";
  categoryKey: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
  debitPartner: string | null;
  creditPartner: string | null;
  counterpart: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  /** 取引先情報の記載が必要（閾値以上かつ対象カテゴリ）かどうか。閾値は経常経費10万円、政治活動費5万円 */
  requiresCounterpart: boolean;
  /** 交付金に係る支出かどうか */
  isGrantExpenditure: boolean;
}

export interface TransactionWithCounterpartFilters {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  requiresCounterpartOnly?: boolean;
  categoryKey?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}

export interface TransactionWithCounterpartResult {
  transactions: TransactionWithCounterpart[];
  total: number;
}

export interface TransactionByCounterpartFilters {
  counterpartId: string;
  politicalOrganizationId?: string;
  financialYear?: number;
  limit?: number;
  offset?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}
