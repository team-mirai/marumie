import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { MaskingRegion } from "@/server/contexts/research-fund/domain/models/masking-region";
import type { PersonalInfoRegionDetector } from "@/server/contexts/research-fund/domain/repositories/personal-info-region-detector.interface";
import { buildPersonalInfoMaskingPrompt } from "@/server/contexts/research-fund/domain/services/personal-info-masking-prompt";

/** 黒塗り箇所の判定に使うモデル */
function maskingModel(): string {
  return process.env.RESEARCH_FUND_MASKING_MODEL?.trim() || "claude-opus-5-5";
}

const regionsSchema = z.object({
  regions: z.array(
    z.object({
      label: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  ),
});

/** 塗る箇所の判定も座標の特定も LLM だけで行う（OCR は使わない） */
export class VercelAIPersonalInfoRegionDetector implements PersonalInfoRegionDetector {
  async detect(page: {
    jpeg: Uint8Array;
    width: number;
    height: number;
  }): Promise<MaskingRegion[]> {
    const { output } = await generateText({
      model: anthropic(maskingModel()),
      system: buildPersonalInfoMaskingPrompt(page.width, page.height),
      messages: [
        {
          role: "user",
          content: [{ type: "image", image: page.jpeg, mediaType: "image/jpeg" }],
        },
      ],
      output: Output.object({ schema: regionsSchema }),
      abortSignal: AbortSignal.timeout(120_000),
    });
    return output.regions.map(({ x, y, width, height }) => ({ x, y, width, height }));
  }
}
