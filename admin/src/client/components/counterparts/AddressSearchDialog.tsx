"use client";
import "client-only";

import { useState, useEffect, useCallback } from "react";
import { searchCounterpartAddressAction } from "@/server/contexts/report/presentation/actions/search-counterpart-address";
import type {
  AddressCandidate,
  SearchResult,
} from "@/server/contexts/report/infrastructure/llm/types";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/client/components/ui";

interface AddressSearchDialogProps {
  companyName: string;
  currentAddress: string;
  onClose: () => void;
  onSelect: (address: string) => void;
}

export function AddressSearchDialog({
  companyName,
  currentAddress,
  onClose,
  onSelect,
}: AddressSearchDialogProps) {
  const [hint, setHint] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isManualInput, setIsManualInput] = useState(false);
  const [editedAddress, setEditedAddress] = useState(currentAddress);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(
    async (searchHint?: string) => {
      setIsSearching(true);
      setError(null);
      setSelectedIndex(null);
      setIsManualInput(false);

      const result = await searchCounterpartAddressAction(companyName, searchHint);
      setSearchResult(result);
      setIsSearching(false);

      if (result.success && result.data.candidates.length > 0) {
        setSelectedIndex(0);
        setEditedAddress(result.data.candidates[0].address);
      }
    },
    [companyName],
  );

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const handleSearch = () => {
    doSearch(hint || undefined);
  };

  const handleCandidateSelect = (index: number, candidate: AddressCandidate) => {
    setSelectedIndex(index);
    setIsManualInput(false);
    setEditedAddress(candidate.address);
  };

  const handleManualInputSelect = () => {
    setSelectedIndex(null);
    setIsManualInput(true);
  };

  const handleSave = () => {
    if (!editedAddress.trim()) {
      setError("住所を入力してください");
      return;
    }
    onSelect(editedAddress.trim());
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

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSearching) {
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>住所検索: {companyName}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Label htmlFor="hint">業態ヒント（任意）</Label>
            <Input
              type="text"
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="例: 印刷、IT、広告"
              disabled={isSearching}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "検索中..." : "再検索"}
            </Button>
          </div>
        </div>

        <hr className="border-border mb-4" />

        {error && (
          <div className="text-red-500 mb-4 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
            {error}
          </div>
        )}

        {isSearching && (
          <div className="text-center py-8 text-muted-foreground">住所を検索中...</div>
        )}

        {!isSearching && searchResult && (
          <>
            {searchResult.success ? (
              <div className="space-y-3 mb-4">
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
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                            isSelected ? "border-primary" : "border-gray-500"
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">候補{index + 1}</span>
                            <span className={`text-sm ${confidence.className}`}>
                              （自信度: {confidence.text}）
                            </span>
                          </div>
                          <div className="text-white mb-1">{candidate.companyName}</div>
                          {candidate.postalCode && (
                            <div className="text-muted-foreground text-sm">
                              {candidate.postalCode}
                            </div>
                          )}
                          <div className="text-muted-foreground text-sm mb-2">
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
              <div className="text-yellow-500 mb-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-900/30">
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
              className={`w-full text-left p-4 rounded-lg border transition-colors mb-4 ${
                isManualInput
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isManualInput ? "border-primary" : "border-gray-500"
                  }`}
                >
                  {isManualInput && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="text-muted-foreground">該当なし - 手動で入力する</span>
              </div>
            </button>

            <hr className="border-border mb-4" />

            <div className="mb-4">
              <Label htmlFor="edited-address">手動修正（選択した候補を編集可能）</Label>
              <Input
                type="text"
                id="edited-address"
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                placeholder="住所を入力"
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSearching}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSearching || !editedAddress.trim()}
          >
            この住所を保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
