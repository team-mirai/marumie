"use client";
import "client-only";

import { useState, useCallback } from "react";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import type {
  AddressCandidate,
  SearchResult,
  SearchError,
} from "@/server/contexts/report/domain/models/address-search";
import { searchCounterpartAddressAction } from "@/server/contexts/report/presentation/actions/search-counterpart-address-action";
import { updateCounterpartAction } from "@/server/contexts/report/presentation/actions/update-counterpart";
import { MAX_ADDRESS_LENGTH } from "@/server/contexts/report/domain/models/counterpart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from "@/client/components/ui";

interface AddressSearchDialogProps {
  counterpart: CounterpartWithUsage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "success"; candidates: AddressCandidate[]; searchQuery: string }
  | { status: "error"; error: SearchError };

function getConfidenceLabel(confidence: AddressCandidate["confidence"]): string {
  switch (confidence) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

function getConfidenceColor(confidence: AddressCandidate["confidence"]): string {
  switch (confidence) {
    case "high":
      return "text-green-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-red-400";
  }
}

function getErrorMessage(error: SearchError): string {
  switch (error.type) {
    case "API_ERROR":
      return error.message;
    case "TIMEOUT":
      return error.message;
    case "RATE_LIMIT":
      return `レート制限に達しました。${error.retryAfter}秒後に再試行してください。`;
    case "NO_RESULTS":
      return error.message;
  }
}

function buildGoogleSearchUrl(companyName: string, address: string): string {
  const query = encodeURIComponent(`${companyName} ${address}`);
  return `https://www.google.com/search?q=${query}`;
}

export function AddressSearchDialog({
  counterpart,
  open,
  onOpenChange,
  onUpdate,
}: AddressSearchDialogProps) {
  const [hint, setHint] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [editedAddress, setEditedAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    setSearchState({ status: "searching" });
    setSelectedIndex(null);
    setManualMode(false);
    setSaveError(null);

    const result: SearchResult = await searchCounterpartAddressAction(
      counterpart.name,
      hint || undefined,
    );

    if (result.success) {
      setSearchState({
        status: "success",
        candidates: result.data.candidates,
        searchQuery: result.data.searchQuery,
      });
      if (result.data.candidates.length > 0) {
        setSelectedIndex(0);
        setEditedAddress(result.data.candidates[0].address);
      }
    } else {
      setSearchState({ status: "error", error: result.error });
    }
  }, [counterpart.name, hint]);

  const handleSelectCandidate = useCallback(
    (index: number) => {
      if (searchState.status !== "success") return;
      setSelectedIndex(index);
      setManualMode(false);
      setEditedAddress(searchState.candidates[index].address);
    },
    [searchState],
  );

  const handleManualMode = useCallback(() => {
    setSelectedIndex(null);
    setManualMode(true);
    setEditedAddress(counterpart.address ?? "");
  }, [counterpart.address]);

  const handleSave = useCallback(async () => {
    if (!editedAddress.trim()) {
      setSaveError("住所を入力してください");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const result = await updateCounterpartAction(counterpart.id, {
      address: editedAddress.trim(),
    });

    setIsSaving(false);

    if (result.success) {
      onUpdate();
      onOpenChange(false);
    } else {
      setSaveError(result.errors?.join(", ") ?? "保存に失敗しました");
    }
  }, [counterpart.id, editedAddress, onUpdate, onOpenChange]);

  const handleClose = useCallback(() => {
    setSearchState({ status: "idle" });
    setSelectedIndex(null);
    setManualMode(false);
    setHint("");
    setEditedAddress("");
    setSaveError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>住所検索: {counterpart.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="hint">業態ヒント（任意）</Label>
              <Input
                id="hint"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="例: 印刷業、IT、広告"
                disabled={searchState.status === "searching"}
              />
            </div>
            <Button onClick={handleSearch} disabled={searchState.status === "searching"}>
              {searchState.status === "searching" ? "検索中..." : "検索"}
            </Button>
          </div>

          {searchState.status === "error" && (
            <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400">
              {getErrorMessage(searchState.error)}
              {searchState.error.type === "API_ERROR" && searchState.error.retryable && (
                <Button variant="outline" size="sm" className="ml-2" onClick={handleSearch}>
                  再試行
                </Button>
              )}
            </div>
          )}

          {searchState.status === "success" && (
            <>
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  検索結果（自信度順）
                </h3>

                {searchState.candidates.length === 0 ? (
                  <p className="text-muted-foreground">候補が見つかりませんでした</p>
                ) : (
                  <div className="space-y-2">
                    {searchState.candidates.map((candidate, index) => (
                      <button
                        type="button"
                        key={`${candidate.companyName}-${candidate.address}-${index}`}
                        className={`w-full text-left p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIndex === index && !manualMode
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => handleSelectCandidate(index)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={selectedIndex === index && !manualMode}
                              onChange={() => handleSelectCandidate(index)}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium">
                                候補{index + 1}
                                <span
                                  className={`ml-2 text-sm ${getConfidenceColor(candidate.confidence)}`}
                                >
                                  （自信度: {getConfidenceLabel(candidate.confidence)}）
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {candidate.companyName}
                              </div>
                              {candidate.postalCode && (
                                <div className="text-sm">〒{candidate.postalCode}</div>
                              )}
                              <div className="text-sm">{candidate.address}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                根拠: {candidate.source}
                              </div>
                            </div>
                          </div>
                          <a
                            href={buildGoogleSearchUrl(candidate.companyName, candidate.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Googleで確認
                          </a>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className={`w-full text-left mt-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    manualMode
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={handleManualMode}
                >
                  <div className="flex items-center gap-2">
                    <input type="radio" checked={manualMode} onChange={handleManualMode} />
                    <span>該当なし - 手動で入力する</span>
                  </div>
                </button>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  手動修正（選択した候補を編集可能）
                </h3>
                <div>
                  <Label htmlFor="edited-address">住所</Label>
                  <Input
                    id="edited-address"
                    value={editedAddress}
                    onChange={(e) => setEditedAddress(e.target.value)}
                    maxLength={MAX_ADDRESS_LENGTH}
                    placeholder="住所を入力"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </>
          )}

          {saveError && (
            <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400">
              {saveError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSaving ||
              searchState.status !== "success" ||
              (!manualMode && selectedIndex === null) ||
              !editedAddress.trim()
            }
          >
            {isSaving ? "保存中..." : "この住所を保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
