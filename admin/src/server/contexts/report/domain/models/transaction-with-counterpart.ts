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
    address: string;
  } | null;
  /** 報告書への明細記載が必要か（閾値超過の場合true） */
  requiresCounterpart: boolean;
}

export interface TransactionWithCounterpartFilters {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  /** true: 閾値超過のみ, false: 全件（デフォルト） */
  requiresCounterpart?: boolean;
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
