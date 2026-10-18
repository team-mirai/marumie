"use server";

import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { ClearWebappCacheUsecase } from "@/server/contexts/shared/application/usecases/clear-webapp-cache-usecase";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

interface ClearWebappCacheResponse {
  success: boolean;
  message: string;
}

const cacheInvalidator = new WebappCacheInvalidator();
const clearWebappCacheUsecase = new ClearWebappCacheUsecase(cacheInvalidator);

export async function clearWebappCacheAction(): Promise<ClearWebappCacheResponse> {
  await requireRole("political_fund");

  return await clearWebappCacheUsecase.execute();
}
