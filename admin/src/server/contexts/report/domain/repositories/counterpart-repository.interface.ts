import type {
  Counterpart,
  CounterpartWithUsage,
  CreateCounterpartInput,
  UpdateCounterpartInput,
} from "@/server/contexts/report/domain/models/counterpart";

export interface CounterpartFilters {
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface ICounterpartRepository {
  findById(id: string): Promise<Counterpart | null>;
  findByNameAndAddress(name: string, address: string): Promise<Counterpart | null>;
  findAll(filters?: CounterpartFilters): Promise<Counterpart[]>;
  findAllWithUsage(filters?: CounterpartFilters): Promise<CounterpartWithUsage[]>;
  create(data: CreateCounterpartInput): Promise<Counterpart>;
  update(id: string, data: UpdateCounterpartInput): Promise<Counterpart>;
  delete(id: string): Promise<void>;
  getUsageCount(id: string): Promise<number>;
  count(filters?: CounterpartFilters): Promise<number>;
}
