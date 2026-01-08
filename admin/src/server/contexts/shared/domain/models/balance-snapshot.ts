export interface BalanceSnapshot {
  id: string;
  political_organization_id: string;
  snapshot_date: Date;
  balance: number;
  created_at: Date;
  updated_at: Date;
}
