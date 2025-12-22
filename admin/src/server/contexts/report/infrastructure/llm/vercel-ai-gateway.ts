import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { buildCounterpartAddressSearchPrompt } from "@/server/contexts/report/application/prompt-templates/counterpart-address-search";
import type {
  LLMGateway,
  SearchAddressParams,
} from "@/server/contexts/report/infrastructure/llm/llm-gateway.interface";
import type {
  AddressCandidate,
  CounterpartAddressSearchResult,
} from "@/server/contexts/report/infrastructure/llm/types";

const MODEL = "claude-sonnet-4-20250514";

export class VercelAIGateway implements LLMGateway {
  async searchAddress(params: SearchAddressParams): Promise<CounterpartAddressSearchResult> {
    const prompt = buildCounterpartAddressSearchPrompt(params.companyName, params.hint);

    const { text } = await generateText({
      model: anthropic(MODEL),
      prompt,
      tools: {
        web_search: anthropic.tools.webSearch_20250305({
          maxUses: 3,
        }),
      },
    });

    return this.parseResponse(text, params.companyName);
  }

  private parseResponse(text: string, searchQuery: string): CounterpartAddressSearchResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { candidates: [], searchQuery };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const candidates: AddressCandidate[] = (parsed.candidates || [])
      .slice(0, 5)
      .map(
        (c: {
          companyName?: string;
          postalCode?: string;
          address?: string;
          confidence?: string;
          source?: string;
        }) => ({
          companyName: c.companyName || "",
          postalCode: c.postalCode || null,
          address: c.address || "",
          confidence: this.normalizeConfidence(c.confidence),
          source: c.source || "LLM知識",
        }),
      );

    return {
      candidates,
      searchQuery: parsed.searchQuery || searchQuery,
    };
  }

  private normalizeConfidence(value: string | undefined): "high" | "medium" | "low" {
    if (value === "high" || value === "medium" || value === "low") {
      return value;
    }
    return "low";
  }
}
