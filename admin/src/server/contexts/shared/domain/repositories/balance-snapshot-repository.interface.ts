import type {
  BalanceSnapshot,
  CreateBalanceSnapshotInput,
  BalanceSnapshotFilters,
} from "@/shared/models/balance-snapshot";

export interface IBalanceSnapshotRepository {
  create(input: CreateBalanceSnapshotInput): Promise<BalanceSnapshot>;
  findAll(filters?: BalanceSnapshotFilters): Promise<BalanceSnapshot[]>;
  delete(id: string): Promise<void>;
}
