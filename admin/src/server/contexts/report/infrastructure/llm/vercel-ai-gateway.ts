import "server-only";

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type {
  CounterpartAddressSearchResult,
  AddressCandidate,
  ConfidenceLevel,
} from "@/server/contexts/report/domain/models/address-search";
import type {
  ILLMGateway,
  SearchCounterpartAddressParams,
} from "@/server/contexts/report/infrastructure/llm/llm-gateway.interface";
import { buildCounterpartAddressSearchPrompt } from "@/server/contexts/report/application/prompts/counterpart-address-search";

interface LLMResponseCandidate {
  companyName: string;
  postalCode: string | null;
  address: string;
  confidence: string;
  source: string;
}

interface LLMResponse {
  candidates: LLMResponseCandidate[];
  searchQuery: string;
}

function isValidConfidence(value: string): value is ConfidenceLevel {
  return value === "high" || value === "medium" || value === "low";
}

function parseAndValidateResponse(text: string): CounterpartAddressSearchResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { candidates: [], searchQuery: "" };
  }

  const parsed = JSON.parse(jsonMatch[0]) as LLMResponse;

  if (!Array.isArray(parsed.candidates)) {
    return { candidates: [], searchQuery: parsed.searchQuery || "" };
  }

  const validatedCandidates: AddressCandidate[] = parsed.candidates
    .filter(
      (c): c is LLMResponseCandidate =>
        typeof c.companyName === "string" &&
        typeof c.address === "string" &&
        typeof c.confidence === "string" &&
        typeof c.source === "string",
    )
    .map((c) => ({
      companyName: c.companyName,
      postalCode: typeof c.postalCode === "string" ? c.postalCode : null,
      address: c.address,
      confidence: isValidConfidence(c.confidence) ? c.confidence : "low",
      source: c.source,
    }))
    .slice(0, 5);

  return {
    candidates: validatedCandidates,
    searchQuery: parsed.searchQuery || "",
  };
}

export class VercelAIGateway implements ILLMGateway {
  async searchCounterpartAddress(
    params: SearchCounterpartAddressParams,
  ): Promise<CounterpartAddressSearchResult> {
    const prompt = buildCounterpartAddressSearchPrompt({
      companyName: params.name,
      hint: params.hint,
    });

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "searchCounterpartAddress",
      },
    });

    return parseAndValidateResponse(text);
  }
}
