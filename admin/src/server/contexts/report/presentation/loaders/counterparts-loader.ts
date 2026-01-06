import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import {
  GetCounterpartsUsecase,
  GetCounterpartDetailUsecase,
  GetAllCounterpartsUsecase,
} from "@/server/contexts/report/application/usecases/manage-counterpart-usecase";
import type {
  CounterpartWithUsage,
  Counterpart,
} from "@/server/contexts/report/domain/models/counterpart";

const CACHE_REVALIDATE_SECONDS = 60;

export interface LoadCounterpartsInput {
  searchQuery?: string;
  page?: number;
  perPage?: number;
}

export interface LoadCounterpartsResult {
  counterparts: CounterpartWithUsage[];
  total: number;
  page: number;
  perPage: number;
}

export async function loadCounterpartsData(
  input: LoadCounterpartsInput = {},
): Promise<LoadCounterpartsResult> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;
  const searchQuery = input.searchQuery ?? "";

  const cachedLoader = unstable_cache(
    async (searchQuery: string, page: number, perPage: number): Promise<LoadCounterpartsResult> => {
      const offset = (page - 1) * perPage;

      const repository = new PrismaCounterpartRepository(prisma);
      const usecase = new GetCounterpartsUsecase(repository);

      const result = await usecase.execute({
        searchQuery: searchQuery || undefined,
        limit: perPage,
        offset,
      });

      return {
        counterparts: result.counterparts,
        total: result.total,
        page,
        perPage,
      };
    },
    ["counterparts-data", searchQuery, String(page), String(perPage)],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader(searchQuery, page, perPage);
}

export interface LoadCounterpartDetailPageResult {
  counterpart: Counterpart | null;
  usageCount: number;
  allCounterparts: Counterpart[];
}

export async function loadCounterpartDetailPageData(
  id: string,
): Promise<LoadCounterpartDetailPageResult> {
  const cachedLoader = unstable_cache(
    async (id: string): Promise<LoadCounterpartDetailPageResult> => {
      const repository = new PrismaCounterpartRepository(prisma);
      const usecase = new GetCounterpartDetailUsecase(repository);
      return usecase.execute(id);
    },
    ["counterpart-detail-page-data", id],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader(id);
}

export async function loadAllCounterpartsData(): Promise<Counterpart[]> {
  const cachedLoader = unstable_cache(
    async (): Promise<Counterpart[]> => {
      const repository = new PrismaCounterpartRepository(prisma);
      const usecase = new GetAllCounterpartsUsecase(repository);
      return usecase.execute();
    },
    ["all-counterparts-data"],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader();
}
