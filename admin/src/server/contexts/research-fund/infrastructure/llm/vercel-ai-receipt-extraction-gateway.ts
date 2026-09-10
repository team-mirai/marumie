import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, jsonSchema, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import {
  ExtractedReceipt,
  extractedReceiptSchema,
} from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import type {
  ReceiptExtractionGateway,
  ReceiptExtractionParams,
} from "@/server/contexts/research-fund/domain/repositories/receipt-extraction-gateway.interface";
import { buildReceiptExtractionPrompt } from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export class VercelAIReceiptExtractionGateway implements ReceiptExtractionGateway {
  async extract(params: ReceiptExtractionParams): Promise<ResearchFundResult<ExtractedReceipt>> {
    const { document, officePrompt } = params;
    if (
      !document.bytes.length ||
      !["image/jpeg", "image/png", "application/pdf"].includes(document.mime)
    ) {
      return invalidResearchFundResult(
        "document",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "JPEG・PNG・PDFの書類を指定してください",
      );
    }
    try {
      const { output } = await generateText({
        model: anthropic(process.env.RESEARCH_FUND_EXTRACTION_MODEL?.trim() || "claude-sonnet-5"),
        system: buildReceiptExtractionPrompt(officePrompt),
        messages: [
          {
            role: "user",
            content:
              document.mime === "application/pdf"
                ? [{ type: "file", data: document.bytes, mediaType: document.mime }]
                : [{ type: "image", image: document.bytes, mediaType: document.mime }],
          },
        ],
        output: Output.object({
          schema: jsonSchema<ExtractedReceipt>(z.toJSONSchema(extractedReceiptSchema), {
            validate: (value) => {
              const result = ExtractedReceipt.normalize(value);
              return result.status === "valid"
                ? { success: true, value: result.value }
                : { success: false, error: new Error(RF_ERROR_CODES.INVALID_EXTRACTION_OUTPUT) };
            },
          }),
        }),
        abortSignal: AbortSignal.timeout(60_000),
        maxRetries: 0,
      });
      return ExtractedReceipt.normalize(output);
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return invalidResearchFundResult(
          "",
          RF_ERROR_CODES.INVALID_EXTRACTION_OUTPUT,
          "領収書の構造化出力を取得できませんでした",
        );
      }
      return invalidResearchFundResult(
        "",
        RF_ERROR_CODES.EXTRACTION_FAILED,
        "領収書の読み取りに失敗しました",
      );
    }
  }
}
