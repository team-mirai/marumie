import type {
  Donor,
  DonorWithUsage,
  DonorType,
  CreateDonorInput,
  UpdateDonorInput,
} from "@/server/contexts/report/domain/models/donor";

export interface DonorFilters {
  searchQuery?: string;
  donorType?: DonorType;
  limit?: number;
  offset?: number;
}

export interface DonorWithUsageAndLastUsed extends DonorWithUsage {
  lastUsedAt: Date | null;
}

export interface IDonorRepository {
  findById(id: string): Promise<Donor | null>;
  findByNameAddressAndType(
    name: string,
    address: string | null,
    donorType: DonorType,
  ): Promise<Donor | null>;
  findAll(filters?: DonorFilters): Promise<Donor[]>;
  findAllWithUsage(filters?: DonorFilters): Promise<DonorWithUsage[]>;
  findByType(donorType: DonorType): Promise<Donor[]>;
  create(data: CreateDonorInput): Promise<Donor>;
  update(id: string, data: UpdateDonorInput): Promise<Donor>;
  delete(id: string): Promise<void>;
  getUsageCount(id: string): Promise<number>;
  count(filters?: DonorFilters): Promise<number>;
  exists(name: string, address: string | null, donorType: DonorType): Promise<boolean>;

  findByUsageFrequency(
    politicalOrganizationId: string,
    limit: number,
  ): Promise<DonorWithUsageAndLastUsed[]>;

  findByPartnerName(
    politicalOrganizationId: string,
    partnerName: string,
  ): Promise<DonorWithUsageAndLastUsed[]>;
}
