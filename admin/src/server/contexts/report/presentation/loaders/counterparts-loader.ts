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
  tenantId: bigint;
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
  input: LoadCounterpartsInput,
): Promise<LoadCounterpartsResult> {
  const { tenantId } = input;
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;
  const searchQuery = input.searchQuery ?? "";

  const cachedLoader = unstable_cache(
    async (
      tenantIdStr: string,
      searchQuery: string,
      page: number,
      perPage: number,
    ): Promise<LoadCounterpartsResult> => {
      const offset = (page - 1) * perPage;

      const repository = new PrismaCounterpartRepository(prisma);
      const usecase = new GetCounterpartsUsecase(repository);

      const result = await usecase.execute({
        tenantId: BigInt(tenantIdStr),
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
    ["counterparts-data", tenantId.toString(), searchQuery, String(page), String(perPage)],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader(tenantId.toString(), searchQuery, page, perPage);
}

export interface LoadCounterpartDetailPageResult {
  counterpart: Counterpart | null;
  usageCount: number;
  allCounterparts: Counterpart[];
}

export async function loadCounterpartDetailPageData(
  id: string,
  tenantId: bigint,
): Promise<LoadCounterpartDetailPageResult> {
  const cachedLoader = unstable_cache(
    async (id: string, tenantIdStr: string): Promise<LoadCounterpartDetailPageResult> => {
      const repository = new PrismaCounterpartRepository(prisma);
      const usecase = new GetCounterpartDetailUsecase(repository);
      return usecase.execute(id, BigInt(tenantIdStr));
    },
    ["counterpart-detail-page-data", id, tenantId.toString()],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader(id, tenantId.toString());
}

export async function loadAllCounterpartsData(tenantId: bigint): Promise<Counterpart[]> {
  const cachedLoader = unstable_cache(
    async (tenantIdStr: string): Promise<Counterpart[]> => {
      const repository = new PrismaCounterpartRepository(prisma);
      const usecase = new GetAllCounterpartsUsecase(repository);
      return usecase.execute({ tenantId: BigInt(tenantIdStr) });
    },
    ["all-counterparts-data", tenantId.toString()],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader(tenantId.toString());
}
