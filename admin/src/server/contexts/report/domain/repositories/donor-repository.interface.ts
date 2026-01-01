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

  /**
   * 複数の (name, address, donorType) 条件で既存 Donor を一括検索
   *
   * 同一人物判定に使用。政治資金報告書では同一寄付者の寄付を合算して
   * 5万円以上かを判定する必要があるため、既存Donorとの照合が重要。
   *
   * @param criteria 検索条件の配列
   * @returns 条件に一致した Donor の配列（一致しない条件は結果に含まれない）
   */
  findByMatchCriteriaBatch(
    criteria: Array<{ name: string; address: string | null; donorType: DonorType }>,
  ): Promise<Donor[]>;
}
