import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type {
  PayeeAddressCandidate,
  PayeeAddressSearchData,
} from "@/server/contexts/research-fund/domain/models/payee-address-search";
import type { PayeeAddressSearchGateway } from "@/server/contexts/research-fund/domain/repositories/payee-address-search-gateway.interface";

/** 住所検索に使うモデル。政治資金の取引先の住所検索と同じ環境変数で差し替える */
function addressSearchModel(): string {
  return process.env.COUNTERPART_ADDRESS_SEARCH_MODEL?.trim() || "claude-opus-5-5";
}

const MAX_CANDIDATES = 5;

export class VercelAIPayeeAddressSearchGateway implements PayeeAddressSearchGateway {
  async search(prompt: string, name: string): Promise<PayeeAddressSearchData> {
    const { text } = await generateText({
      model: anthropic(addressSearchModel()),
      prompt,
      tools: { web_search: anthropic.tools.webSearch_20260209({ maxUses: 3 }) },
    });
    return parseResponse(text, name);
  }
}

type RawCandidate = {
  companyName?: unknown;
  postalCode?: unknown;
  address?: unknown;
  confidence?: unknown;
  source?: unknown;
};

/** 応答から JSON を取り出して候補一覧にする。解析できない応答は候補なしとして扱う */
function parseResponse(text: string, searchQuery: string): PayeeAddressSearchData {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { candidates: [], searchQuery };
  let parsed: { candidates?: unknown; searchQuery?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { candidates: [], searchQuery };
  }
  const rawCandidates = Array.isArray(parsed.candidates)
    ? (parsed.candidates as RawCandidate[])
    : [];
  const candidates: PayeeAddressCandidate[] = rawCandidates
    .filter((c): c is RawCandidate => typeof c === "object" && c !== null)
    .slice(0, MAX_CANDIDATES)
    .map((c) => ({
      companyName: stringOr(c.companyName, ""),
      postalCode: stringOr(c.postalCode, "") || null,
      address: stringOr(c.address, ""),
      confidence:
        c.confidence === "high" || c.confidence === "medium" || c.confidence === "low"
          ? c.confidence
          : "low",
      source: stringOr(c.source, "") || "LLM知識",
    }));
  return {
    candidates,
    searchQuery: stringOr(parsed.searchQuery, "") || searchQuery,
  };
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
