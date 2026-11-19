import type { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

export interface ReceiptExtractionParams {
  document: { bytes: Uint8Array; mime: "image/jpeg" | "image/png" | "application/pdf" };
  officePrompt: string;
  /** 下書きを作り直すときの読み直し指示。通常のスキャン・プロンプトのテストでは渡さない */
  rereadInstruction?: string | null;
}

export interface ReceiptExtractionGateway {
  extract(params: ReceiptExtractionParams): Promise<ResearchFundResult<ExtractedReceipt>>;
}
