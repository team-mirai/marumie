"use client";
import "client-only";

import { useId } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import { useAddressSearch } from "./useAddressSearch";
import type { AddressCandidate } from "@/server/contexts/report/infrastructure/llm/types";
import { MAX_ADDRESS_LENGTH } from "@/server/contexts/report/domain/models/counterpart";

interface AddressInputProps {
  companyName: string;
  address: string;
  onChange: (address: string) => void;
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
  companyName,
  address,
  onChange,
  disabled = false,
}: AddressInputProps) {
  const addressId = useId();
  const hintId = useId();

  const {
    phase,
    searchResult,
    hint,
    isSearching,
    startSearch,
    reSearch,
    selectCandidate,
    switchToManual,
    clear,
    setHint,
  } = useAddressSearch({
    companyName,
    initialAddress: address || undefined,
  });

  const handleSelectCandidate = (candidate: AddressCandidate) => {
    selectCandidate(candidate);
    onChange(candidate.address);
  };

  const handleSwitchToManual = () => {
    switchToManual();
  };

  const handleClear = () => {
    clear();
    onChange("");
  };

  const handleAddressChange = (value: string) => {
    onChange(value);
  };

  const canSearch = companyName.trim() !== "";

  // 初期状態: AI検索ボタンと手動入力リンク
  if (phase === "initial") {
    return (
      <div className="space-y-3">
        <Label>住所</Label>

        <div>
          <Label htmlFor={hintId} className="text-sm text-muted-foreground">
            業態ヒント（任意）
          </Label>
          <Input
            type="text"
            id={hintId}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="例: 印刷、IT、広告"
            disabled={disabled}
            className="mt-1"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={startSearch} disabled={disabled || !canSearch}>
            🔍 AI検索
          </Button>
          <button
            type="button"
            onClick={handleSwitchToManual}
            disabled={disabled}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            手動で入力する
          </button>
        </div>
      </div>
    );
  }

  // 検索中
  if (phase === "searching") {
    return (
      <div className="space-y-3">
        <Label>住所</Label>
        <div className="border border-border rounded-lg p-4 text-center text-muted-foreground">
          検索中...
        </div>
      </div>
    );
  }

  // 検索結果表示
  if (phase === "results") {
    return (
      <div className="space-y-3">
        <Label>住所</Label>

        {searchResult?.success ? (
          <div className="border border-border rounded-lg divide-y divide-border">
            {searchResult.data.candidates.map((candidate, index) => {
              const confidence = getConfidenceLabel(candidate.confidence);
              const key = `${index}-${candidate.companyName}-${candidate.address}`;
              return (
                <div key={key} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {candidate.postalCode && (
                        <div className="text-muted-foreground text-xs">{candidate.postalCode}</div>
                      )}
                      <div className="text-white text-sm">{candidate.address}</div>
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
          <div className="text-yellow-500 p-3 bg-yellow-900/20 rounded-lg border border-yellow-900/30 text-sm">
            {searchResult?.error.type === "NO_RESULTS"
              ? searchResult.error.message
              : searchResult?.error.type === "RATE_LIMIT"
                ? `レート制限中です。${searchResult.error.retryAfter}秒後に再試行してください。`
                : (searchResult?.error.message ?? "検索に失敗しました")}
          </div>
        )}

        <div>
          <Label htmlFor={hintId} className="text-sm text-muted-foreground">
            業態ヒント（任意）
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              type="text"
              id={hintId}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="例: 印刷、IT、広告"
              disabled={disabled || isSearching}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={reSearch}
              disabled={disabled || isSearching || !canSearch}
            >
              再検索
            </Button>
          </div>
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={handleSwitchToManual}
            disabled={disabled}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            手動で入力する
          </button>
        </div>
      </div>
    );
  }

  // 確定後: Input表示
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={addressId}>住所</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reSearch}
            disabled={disabled || !canSearch}
          >
            再検索
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={disabled}>
            クリア
          </Button>
        </div>
      </div>
      <Input
        type="text"
        id={addressId}
        value={address}
        onChange={(e) => handleAddressChange(e.target.value)}
        maxLength={MAX_ADDRESS_LENGTH}
        placeholder="住所を入力"
        disabled={disabled}
      />
    </div>
  );
}
