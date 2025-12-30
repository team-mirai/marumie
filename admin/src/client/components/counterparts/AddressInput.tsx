"use client";
import "client-only";

import { useId, useState } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import { useAddressSearch } from "@/client/components/counterparts/useAddressSearch";
import type { AddressCandidate } from "@/server/contexts/report/presentation/types/address-search";

/** 候補選択時に返されるデータ */
export interface CounterpartSearchResult {
  name: string;
  postalCode: string | null;
  address: string;
}

interface AddressInputProps {
  /** 検索クエリ（摘要）のデフォルト値 */
  defaultSearchQuery?: string;
  /** 候補を選択したときのコールバック */
  onSelect: (result: CounterpartSearchResult) => void;
  disabled?: boolean;
}

function getConfidenceLabel(confidence: AddressCandidate["confidence"]) {
  switch (confidence) {
    case "high":
      return { text: "高確度", className: "text-green-400" };
    case "medium":
      return { text: "中確度", className: "text-yellow-400" };
    case "low":
      return { text: "低確度", className: "text-red-400" };
  }
}

function openGoogleSearch(candidate: AddressCandidate) {
  const query = encodeURIComponent(`${candidate.companyName} ${candidate.address}`);
  window.open(`https://www.google.com/search?q=${query}`, "_blank");
}

export function AddressInput({
  defaultSearchQuery = "",
  onSelect,
  disabled = false,
}: AddressInputProps) {
  const searchQueryId = useId();
  const hintId = useId();

  // 検索クエリ（摘要）は内部状態として管理
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);

  const { phase, searchResult, hint, isSearching, startSearch, reSearch, setHint } =
    useAddressSearch({
      companyName: searchQuery,
    });

  const handleSelectCandidate = (candidate: AddressCandidate) => {
    onSelect({
      name: candidate.companyName,
      postalCode: candidate.postalCode,
      address: candidate.address,
    });
  };

  const canSearch = searchQuery.trim() !== "";

  return (
    <div className="border border-border rounded-lg bg-muted/30">
      {/* 検索フォーム */}
      <div className="p-4 space-y-3">
        <Label className="text-sm font-medium">AI検索で入力を補助</Label>

        <div>
          <Label htmlFor={searchQueryId} className="text-sm text-muted-foreground">
            会社名
          </Label>
          <Input
            type="text"
            id={searchQueryId}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="XXX銀行"
            disabled={disabled || phase === "searching"}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={hintId} className="text-sm text-muted-foreground">
            検索ヒント（任意）
          </Label>
          <Input
            type="text"
            id={hintId}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="印刷業/米国法人/本社住所 など"
            disabled={disabled || phase === "searching"}
            className="mt-1"
          />
        </div>

        {phase === "initial" && (
          <Button type="button" onClick={startSearch} disabled={disabled || !canSearch}>
            AI検索
          </Button>
        )}
        {phase === "searching" && (
          <Button type="button" disabled>
            検索中...
          </Button>
        )}
        {phase === "results" && (
          <Button type="button" onClick={reSearch} disabled={disabled || isSearching || !canSearch}>
            再検索
          </Button>
        )}
      </div>

      {/* 検索結果 */}
      {phase === "results" &&
        (searchResult?.success ? (
          <div className="border-t border-border divide-y divide-border">
            <div className="px-4 py-2 text-xs text-muted-foreground">
              候補から選択してください（下のフィールドに自動入力されます）
            </div>
            {searchResult.data.candidates.map((candidate, index) => {
              const confidence = getConfidenceLabel(candidate.confidence);
              const key = `${index}-${candidate.companyName}-${candidate.address}`;
              return (
                <div key={key} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium">{candidate.companyName}</div>
                      <div className="text-muted-foreground text-sm mt-1">
                        {candidate.postalCode && (
                          <span className="mr-2">〒{candidate.postalCode.replace(/^〒/, "")}</span>
                        )}
                        {candidate.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>根拠: {candidate.source}</span>
                        <span className={confidence.className}>{confidence.text}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openGoogleSearch(candidate)}
                        className="text-xs text-primary hover:underline"
                      >
                        確認↗
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSelectCandidate(candidate)}
                        disabled={disabled}
                      >
                        選択
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-t border-border p-4">
            <div className="text-yellow-500 p-3 bg-yellow-900/20 rounded-lg border border-yellow-900/30 text-sm">
              {searchResult?.error.type === "NO_RESULTS"
                ? searchResult.error.message
                : searchResult?.error.type === "RATE_LIMIT"
                  ? `レート制限中です。${searchResult.error.retryAfter}秒後に再試行してください。`
                  : (searchResult?.error.message ?? "検索に失敗しました")}
            </div>
          </div>
        ))}
    </div>
  );
}
