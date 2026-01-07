import type { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";

export interface CreateBalanceSnapshotInput {
  political_organization_id: string;
  snapshot_date: Date;
  balance: number;
}

export interface BalanceSnapshotFilters {
  political_organization_id?: string;
}

export interface IBalanceSnapshotRepository {
  create(input: CreateBalanceSnapshotInput): Promise<BalanceSnapshot>;
  findAll(filters?: BalanceSnapshotFilters): Promise<BalanceSnapshot[]>;
  delete(id: string): Promise<void>;
}
