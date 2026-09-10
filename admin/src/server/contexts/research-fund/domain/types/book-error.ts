import type { ResearchFundValidationError } from "@/server/contexts/research-fund/domain/types/validation";

export class BookError extends Error {
  constructor(
    readonly code: ResearchFundValidationError["code"] | "INVALID_ID" | "DUPLICATE_BOOK",
    message: string,
  ) {
    super(message);
    this.name = "BookError";
  }
}
