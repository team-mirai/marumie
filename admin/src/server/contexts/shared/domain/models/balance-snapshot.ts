export interface BalanceSnapshot {
  id: string;
  political_organization_id: string;
  snapshot_date: Date;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBalanceSnapshotInput {
  political_organization_id: string;
  snapshot_date: Date;
  balance: number;
}

export interface BalanceSnapshotFilters {
  political_organization_id?: string;
}
