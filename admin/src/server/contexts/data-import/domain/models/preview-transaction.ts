import type { TransactionType } from "@/shared/models/transaction";

export interface PreviewTransaction {
  political_organization_id: string;
  transaction_no: string;
  transaction_date: Date;
  transaction_type: TransactionType | null;
  debit_account: string;
  debit_sub_account: string | undefined;
  debit_amount: number;
  credit_account: string;
  credit_sub_account: string | undefined;
  credit_amount: number;
  description: string | undefined;
  label: string | undefined;
  friendly_category: string;
  category_key: string;
  hash: string;
  status: "insert" | "update" | "invalid" | "skip";
  errors: string[];
  existingTransactionId?: string;
}
