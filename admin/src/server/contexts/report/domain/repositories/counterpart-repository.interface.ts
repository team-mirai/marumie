import type {
  Counterpart,
  CounterpartWithUsage,
  CreateCounterpartInput,
  UpdateCounterpartInput,
} from "@/server/contexts/report/domain/models/counterpart";

export interface CounterpartFilters {
  tenantId: bigint;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface CounterpartWithUsageAndLastUsed extends CounterpartWithUsage {
  lastUsedAt: Date | null;
}

export interface ICounterpartRepository {
  findById(id: string, tenantId: bigint): Promise<Counterpart | null>;
  findByNameAndAddress(
    tenantId: bigint,
    name: string,
    address: string | null,
  ): Promise<Counterpart | null>;
  findAll(filters: CounterpartFilters): Promise<Counterpart[]>;
  findAllWithUsage(filters: CounterpartFilters): Promise<CounterpartWithUsage[]>;
  create(data: CreateCounterpartInput): Promise<Counterpart>;
  update(id: string, tenantId: bigint, data: UpdateCounterpartInput): Promise<Counterpart>;
  delete(id: string, tenantId: bigint): Promise<void>;
  getUsageCount(id: string): Promise<number>;
  count(filters: CounterpartFilters): Promise<number>;

  findByUsageFrequency(
    tenantId: bigint,
    politicalOrganizationId: string,
    limit: number,
  ): Promise<CounterpartWithUsageAndLastUsed[]>;

  findByPartnerName(
    tenantId: bigint,
    politicalOrganizationId: string,
    partnerName: string,
  ): Promise<CounterpartWithUsageAndLastUsed[]>;
}
