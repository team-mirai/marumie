import type { DonorType } from "@/server/contexts/report/domain/models/donor";

export interface TransactionWithDonor {
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
  donor: {
    id: string;
    donorType: DonorType;
    name: string;
    address: string | null;
    occupation: string | null;
  } | null;
  /** Donor紐付けが必要かどうか（対象カテゴリかどうか） */
  requiresDonor: boolean;
  /** このカテゴリで許可されるdonor_type */
  allowedDonorTypes: DonorType[];
}

export interface TransactionWithDonorFilters {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  categoryKey?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}

export interface TransactionWithDonorResult {
  transactions: TransactionWithDonor[];
  total: number;
}

export interface TransactionByDonorFilters {
  donorId: string;
  politicalOrganizationId?: string;
  financialYear?: number;
  limit?: number;
  offset?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}
