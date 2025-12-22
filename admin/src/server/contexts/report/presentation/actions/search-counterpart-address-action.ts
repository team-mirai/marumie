"use server";

import type { SearchResult } from "@/server/contexts/report/domain/models/address-search";
import { SearchCounterpartAddressUsecase } from "@/server/contexts/report/application/usecases/search-counterpart-address-usecase";
import { VercelAIGateway } from "@/server/contexts/report/infrastructure/llm/vercel-ai-gateway";

export async function searchCounterpartAddressAction(
  name: string,
  hint?: string,
): Promise<SearchResult> {
  const llmGateway = new VercelAIGateway();
  const usecase = new SearchCounterpartAddressUsecase(llmGateway);

  return usecase.execute({ name, hint });
}
