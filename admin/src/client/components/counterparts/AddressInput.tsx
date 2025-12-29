"use client";
import "client-only";

import { useId, useState } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import { useAddressSearch } from "@/client/components/counterparts/useAddressSearch";
import type { AddressCandidate } from "@/server/contexts/report/infrastructure/llm/types";
import { MAX_ADDRESS_LENGTH } from "@/server/contexts/report/domain/models/counterpart";

/** 候補選択時に返されるデータ */
export interface CounterpartSearchResult {
  name: string;
  postalCode: string | null;
  address: string;
}

interface AddressInputProps {
  /** 検索クエリ（摘要）のデフォルト値 */
  defaultSearchQuery?: string;
  /** 現在の住所（確定後の表示用） */
  address: string;
  /** 候補を選択したときのコールバック */
  onSelect: (result: CounterpartSearchResult) => void;
  /** 住所を手動変更したときのコールバック */
  onAddressChange: (address: string) => void;
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
  address,
  onSelect,
  onAddressChange,
  disabled = false,
}: AddressInputProps) {
  const addressId = useId();
  const searchQueryId = useId();
  const hintId = useId();

  // 検索クエリ（摘要）は内部状態として管理
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);

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
    companyName: searchQuery,
    initialAddress: address || undefined,
  });

  const handleSelectCandidate = (candidate: AddressCandidate) => {
    selectCandidate(candidate);
    onSelect({
      name: candidate.companyName,
      postalCode: candidate.postalCode,
      address: candidate.address,
    });
  };

  const handleSwitchToManual = () => {
    switchToManual();
  };

  const handleClear = () => {
    clear();
    setSearchQuery("");
    onAddressChange("");
  };

  const canSearch = searchQuery.trim() !== "";

  // 初期状態: 摘要入力欄とAI検索ボタン
  if (phase === "initial") {
    return (
      <div className="space-y-3">
        <div className="border border-border rounded-lg p-4 space-y-3">
          <Label className="text-sm font-medium">AI検索で取引先を探す</Label>

          <div>
            <Label htmlFor={searchQueryId} className="text-sm text-muted-foreground">
              摘要（検索クエリ）
            </Label>
            <Input
              type="text"
              id={searchQueryId}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="例: アクセア、株式会社ABC"
              disabled={disabled}
              className="mt-1"
            />
          </div>

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

          <Button type="button" onClick={startSearch} disabled={disabled || !canSearch}>
            AI検索
          </Button>
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

  // 検索中
  if (phase === "searching") {
    return (
      <div className="space-y-3">
        <div className="border border-border rounded-lg p-4 space-y-3">
          <Label className="text-sm font-medium">AI検索で取引先を探す</Label>

          <div>
            <Label htmlFor={searchQueryId} className="text-sm text-muted-foreground">
              摘要（検索クエリ）
            </Label>
            <Input type="text" id={searchQueryId} value={searchQuery} disabled className="mt-1" />
          </div>

          <div>
            <Label htmlFor={hintId} className="text-sm text-muted-foreground">
              業態ヒント（任意）
            </Label>
            <Input type="text" id={hintId} value={hint} disabled className="mt-1" />
          </div>

          <Button type="button" disabled>
            検索中...
          </Button>
        </div>

        <div className="text-right">
          <span className="text-sm text-muted-foreground/50">手動で入力する</span>
        </div>
      </div>
    );
  }

  // 検索結果表示: 社名・住所・郵便番号のペアを候補として表示
  if (phase === "results") {
    return (
      <div className="space-y-3">
        <div className="border border-border rounded-lg p-4 space-y-3">
          <Label className="text-sm font-medium">AI検索で取引先を探す</Label>

          <div>
            <Label htmlFor={searchQueryId} className="text-sm text-muted-foreground">
              摘要（検索クエリ）
            </Label>
            <Input
              type="text"
              id={searchQueryId}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="例: アクセア、株式会社ABC"
              disabled={disabled || isSearching}
              className="mt-1"
            />
          </div>

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
              disabled={disabled || isSearching}
              className="mt-1"
            />
          </div>

          <Button type="button" onClick={reSearch} disabled={disabled || isSearching || !canSearch}>
            再検索
          </Button>
        </div>

        {searchResult?.success ? (
          <div className="border border-border rounded-lg divide-y divide-border">
            <div className="p-2 bg-muted/30 text-xs text-muted-foreground">
              候補から選択してください（社名・住所・郵便番号がセットされます）
            </div>
            {searchResult.data.candidates.map((candidate, index) => {
              const confidence = getConfidenceLabel(candidate.confidence);
              const key = `${index}-${candidate.companyName}-${candidate.address}`;
              return (
                <div key={key} className="p-3">
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
          <div className="text-yellow-500 p-3 bg-yellow-900/20 rounded-lg border border-yellow-900/30 text-sm">
            {searchResult?.error.type === "NO_RESULTS"
              ? searchResult.error.message
              : searchResult?.error.type === "RATE_LIMIT"
                ? `レート制限中です。${searchResult.error.retryAfter}秒後に再試行してください。`
                : (searchResult?.error.message ?? "検索に失敗しました")}
          </div>
        )}

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

  // 確定後: 住所のInput表示（社名・郵便番号は親コンポーネントで表示）
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={addressId}>住所</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery(defaultSearchQuery);
              clear();
            }}
            disabled={disabled}
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
        onChange={(e) => onAddressChange(e.target.value)}
        maxLength={MAX_ADDRESS_LENGTH}
        placeholder="住所を入力"
        disabled={disabled}
      />
    </div>
  );
}
