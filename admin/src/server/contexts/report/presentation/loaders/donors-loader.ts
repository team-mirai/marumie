import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import type { Donor } from "@/server/contexts/report/domain/models/donor";

const CACHE_REVALIDATE_SECONDS = 60;

export async function loadAllDonorsData(): Promise<Donor[]> {
  const cachedLoader = unstable_cache(
    async (): Promise<Donor[]> => {
      const repository = new PrismaDonorRepository(prisma);
      const donors = await repository.findAll({ limit: 1000 });
      return donors;
    },
    ["all-donors-data"],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader();
}
