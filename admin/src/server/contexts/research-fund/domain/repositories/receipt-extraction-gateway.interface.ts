import type { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

export interface ReceiptExtractionParams {
  document: { bytes: Uint8Array; mime: "image/jpeg" | "image/png" | "application/pdf" };
  officePrompt: string;
}

export interface ReceiptExtractionGateway {
  extract(params: ReceiptExtractionParams): Promise<ResearchFundResult<ExtractedReceipt>>;
}
