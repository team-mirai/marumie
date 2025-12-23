"use client";
import "client-only";

import { useState, useId, useCallback } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import { searchCounterpartAddressAction } from "@/server/contexts/report/presentation/actions/search-counterpart-address";
import type {
  AddressCandidate,
  SearchResult,
} from "@/server/contexts/report/infrastructure/llm/types";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";

interface CounterpartFormContentProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    address: string | null;
    usageCount?: number;
  };
  onSubmit: (data: { name: string; address: string | null }) => Promise<void>;
  disabled?: boolean;
}

export function CounterpartFormContent({
  mode,
  initialData,
  onSubmit,
  disabled = false,
}: CounterpartFormContentProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [hint, setHint] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isManualInput, setIsManualInput] = useState(false);

  const nameId = useId();
  const addressId = useId();
  const hintId = useId();

  const isFormValid = name.trim() !== "";
  const canSearchAddress = name.trim() !== "";

  const doSearch = useCallback(
    async (searchHint?: string) => {
      if (!name.trim()) return;

      setIsSearching(true);
      setSelectedIndex(null);
      setIsManualInput(false);

      const result = await searchCounterpartAddressAction(name.trim(), searchHint);
      setSearchResult(result);
      setIsSearching(false);

      if (result.success && result.data.candidates.length > 0) {
        setSelectedIndex(0);
      }
    },
    [name],
  );

  const handleSearchClick = () => {
    setShowAddressSearch(true);
    doSearch();
  };

  const handleReSearch = () => {
    doSearch(hint || undefined);
  };

  const handleCandidateSelect = (index: number, candidate: AddressCandidate) => {
    setSelectedIndex(index);
    setIsManualInput(false);
    setAddress(candidate.address);
  };

  const handleManualInputSelect = () => {
    setSelectedIndex(null);
    setIsManualInput(true);
  };

  const getConfidenceLabel = (confidence: AddressCandidate["confidence"]) => {
    switch (confidence) {
      case "high":
        return { text: "高", className: "text-green-400" };
      case "medium":
        return { text: "中", className: "text-yellow-400" };
      case "low":
        return { text: "低", className: "text-red-400" };
    }
  };

  const openGoogleSearch = (candidate: AddressCandidate) => {
    const query = encodeURIComponent(`${candidate.companyName} ${candidate.address}`);
    window.open(`https://www.google.com/search?q=${query}`, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || disabled || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        address: address.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting;
  const submitLabel = mode === "create" ? "作成" : "保存";
  const loadingLabel = mode === "create" ? "作成中..." : "保存中...";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-500 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor={nameId}>
          名前 <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="取引先名を入力"
          disabled={isDisabled}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor={addressId}>住所</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSearchClick}
            disabled={isDisabled || !canSearchAddress}
          >
            住所を検索
          </Button>
        </div>
        <Input
          type="text"
          id={addressId}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={MAX_ADDRESS_LENGTH}
          placeholder="住所を入力（任意）"
          disabled={isDisabled}
        />
      </div>

      {showAddressSearch && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-secondary/20">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor={hintId}>業態ヒント（任意）</Label>
              <Input
                type="text"
                id={hintId}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="例: 印刷、IT、広告"
                disabled={isSearching}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleReSearch} disabled={isSearching}>
                {isSearching ? "検索中..." : "再検索"}
              </Button>
            </div>
          </div>

          {isSearching && (
            <div className="text-center py-4 text-muted-foreground">住所を検索中...</div>
          )}

          {!isSearching && searchResult && (
            <>
              {searchResult.success ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">検索結果（自信度順）</div>
                  {searchResult.data.candidates.map((candidate, index) => {
                    const confidence = getConfidenceLabel(candidate.confidence);
                    const isSelected = selectedIndex === index && !isManualInput;
                    const key = `${index}-${candidate.companyName}-${candidate.address}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleCandidateSelect(index, candidate)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              isSelected ? "border-primary" : "border-gray-500"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white text-sm">
                                候補{index + 1}
                              </span>
                              <span className={`text-xs ${confidence.className}`}>
                                （自信度: {confidence.text}）
                              </span>
                            </div>
                            <div className="text-white text-sm mb-1">{candidate.companyName}</div>
                            {candidate.postalCode && (
                              <div className="text-muted-foreground text-xs">
                                {candidate.postalCode}
                              </div>
                            )}
                            <div className="text-muted-foreground text-xs mb-2">
                              {candidate.address}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>根拠: {candidate.source}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openGoogleSearch(candidate);
                                }}
                                className="text-primary hover:underline"
                              >
                                Googleで確認
                              </button>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-yellow-500 p-3 bg-yellow-900/20 rounded-lg border border-yellow-900/30 text-sm">
                  {searchResult.error.type === "NO_RESULTS"
                    ? searchResult.error.message
                    : searchResult.error.type === "RATE_LIMIT"
                      ? `レート制限中です。${searchResult.error.retryAfter}秒後に再試行してください。`
                      : searchResult.error.type === "TIMEOUT"
                        ? searchResult.error.message
                        : searchResult.error.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleManualInputSelect}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isManualInput
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isManualInput ? "border-primary" : "border-gray-500"
                    }`}
                  >
                    {isManualInput && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-muted-foreground text-sm">該当なし - 手動で入力する</span>
                </div>
              </button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddressSearch(false)}
                className="w-full"
              >
                検索結果を閉じる
              </Button>
            </>
          )}
        </div>
      )}

      {mode === "edit" && initialData?.usageCount !== undefined && (
        <div className="text-muted-foreground text-sm">
          使用状況: {initialData.usageCount}件のTransactionで使用中
        </div>
      )}

      {mode === "create" && (
        <p className="text-muted-foreground text-sm">
          ※ 同じ名前・住所の組み合わせは登録できません
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isDisabled || !isFormValid}>
          {isSubmitting ? loadingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
