import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { GetDonorsUsecase } from "@/server/contexts/report/application/usecases/manage-donor-usecase";
import type {
  Donor,
  DonorWithUsage,
  DonorType,
} from "@/server/contexts/report/domain/models/donor";

const CACHE_REVALIDATE_SECONDS = 60;

export interface LoadDonorsInput {
  tenantId: bigint;
  searchQuery?: string;
  donorType?: DonorType;
  page?: number;
  perPage?: number;
}

export interface LoadDonorsResult {
  donors: DonorWithUsage[];
  total: number;
  page: number;
  perPage: number;
}

export async function loadDonorsData(input: LoadDonorsInput): Promise<LoadDonorsResult> {
  const { tenantId } = input;
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;
  const searchQuery = input.searchQuery ?? "";
  const donorType = input.donorType;

  const cachedLoader = unstable_cache(
    async (
      tenantIdStr: string,
      searchQuery: string,
      donorType: DonorType | undefined,
      page: number,
      perPage: number,
    ): Promise<LoadDonorsResult> => {
      const offset = (page - 1) * perPage;

      const repository = new PrismaDonorRepository(prisma);
      const usecase = new GetDonorsUsecase(repository);

      const result = await usecase.execute({
        tenantId: BigInt(tenantIdStr),
        searchQuery: searchQuery || undefined,
        donorType,
        limit: perPage,
        offset,
      });

      return {
        donors: result.donors,
        total: result.total,
        page,
        perPage,
      };
    },
    [
      "donors-data",
      tenantId.toString(),
      searchQuery,
      donorType ?? "",
      String(page),
      String(perPage),
    ],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader(tenantId.toString(), searchQuery, donorType, page, perPage);
}

export async function loadAllDonorsData(tenantId: bigint): Promise<Donor[]> {
  const cachedLoader = unstable_cache(
    async (tenantIdStr: string): Promise<Donor[]> => {
      const repository = new PrismaDonorRepository(prisma);
      const donors = await repository.findAll({ tenantId: BigInt(tenantIdStr), limit: 1000 });
      return donors;
    },
    ["all-donors-data", tenantId.toString()],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader(tenantId.toString());
}
