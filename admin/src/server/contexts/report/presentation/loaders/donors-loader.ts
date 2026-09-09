import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { GetDonorsUsecase } from "@/server/contexts/report/application/usecases/manage-donor-usecase";
import type {
  Donor,
  DonorWithUsage,
  DonorType,
} from "@/server/contexts/report/domain/models/donor";

interface LoadDonorsInput {
  searchQuery?: string;
  donorType?: DonorType;
  page?: number;
  perPage?: number;
}

interface LoadDonorsResult {
  donors: DonorWithUsage[];
  total: number;
  page: number;
  perPage: number;
}

export async function loadDonorsData(input: LoadDonorsInput = {}): Promise<LoadDonorsResult> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;
  const searchQuery = input.searchQuery ?? "";
  const offset = (page - 1) * perPage;

  const repository = new PrismaDonorRepository(prisma);
  const usecase = new GetDonorsUsecase(repository);

  const result = await usecase.execute({
    searchQuery: searchQuery || undefined,
    donorType: input.donorType,
    limit: perPage,
    offset,
  });

  return {
    donors: result.donors,
    total: result.total,
    page,
    perPage,
  };
}

export async function loadAllDonorsData(): Promise<Donor[]> {
  const repository = new PrismaDonorRepository(prisma);
  return repository.findAll({ limit: 1000 });
}
