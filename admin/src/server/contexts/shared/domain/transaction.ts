import type { Transaction, TransactionType } from "@/shared/models/transaction";

export interface TransactionWithOrganization extends Transaction {
  political_organization_name?: string;
}

export interface TransactionFilters {
  political_organization_ids?: string[];
  transaction_type?: TransactionType;
  debit_account?: string;
  credit_account?: string;
  date_from?: Date;
  date_to?: Date;
  financial_year?: number;
  category_keys?: string[];
}

export interface CreateTransactionInput {
  political_organization_id: string;
  transaction_no: string;
  transaction_date: Date;
  financial_year: number;
  transaction_type: TransactionType;
  debit_account: string;
  debit_sub_account?: string;
  debit_department?: string;
  debit_partner?: string;
  debit_tax_category?: string;
  debit_amount: number;
  credit_account: string;
  credit_sub_account?: string;
  credit_department?: string;
  credit_partner?: string;
  credit_tax_category?: string;
  credit_amount: number;
  description?: string;
  friendly_category: string;
  memo?: string;
  category_key: string;
  label?: string;
  hash: string;
}

export type UpdateTransactionInput = Partial<CreateTransactionInput>;
