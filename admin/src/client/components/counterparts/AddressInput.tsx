"use client";
import "client-only";

import { useId, useState } from "react";
import { ArrowSquareOut, CircleNotch, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/client/components/ui";
import { cn } from "@/client/lib";
import {
  type SearchAddress,
  useAddressSearch,
} from "@/client/components/counterparts/useAddressSearch";
import type {
  AddressCandidate,
  AddressSearchResult,
} from "@/server/contexts/report/presentation/types/address-search";

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
  /** 住所検索の実行。省略すると政治資金の取引先の住所検索を使う */
  searchAddress?: SearchAddress;
}

/** 確度ラベル。ブランド外の色（黄・オレンジ）は使わず、高=teal deep / 中=墨 / 低=赤で表す */
function getConfidenceLabel(confidence: AddressCandidate["confidence"]) {
  switch (confidence) {
    case "high":
      return { text: "高確度", className: "text-primary-active" };
    case "medium":
      return { text: "中確度", className: "text-foreground" };
    case "low":
      return { text: "低確度", className: "text-destructive" };
  }
}

function openGoogleSearch(candidate: AddressCandidate) {
  const query = encodeURIComponent(`${candidate.companyName} ${candidate.address}`);
  window.open(`https://www.google.com/search?q=${query}`, "_blank");
}

function getErrorMessage(searchResult: AddressSearchResult | null): string {
  if (searchResult?.success !== false) return "検索に失敗しました";
  switch (searchResult.error.type) {
    case "NO_RESULTS":
      return searchResult.error.message;
    case "RATE_LIMIT":
      return `レート制限中です。${searchResult.error.retryAfter}秒後に再試行してください。`;
    default:
      return searchResult.error.message;
  }
}

/**
 * 住所の AI 検索フォーム。検索中はフォームを止めてスピナーを出し、
 * 終わったら候補（または該当なし・エラー）をモーダルで見せる。
 * 利用箇所の多くは既にダイアログの中にあるが、Radix の Dialog は入れ子にでき、
 * Esc・外側クリックは一番上のモーダルだけを閉じる（親のダイアログは閉じない）。
 */
export function AddressInput({
  defaultSearchQuery = "",
  onSelect,
  disabled = false,
  searchAddress,
}: AddressInputProps) {
  const searchQueryId = useId();
  const hintId = useId();

  // 検索クエリ（摘要）は内部状態として管理
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [isResultOpen, setIsResultOpen] = useState(false);

  const { phase, searchResult, hint, isSearching, startSearch, reSearch, setHint } =
    useAddressSearch({
      companyName: searchQuery,
      searchAddress,
    });

  const handleSearch = async (search: () => Promise<void>) => {
    await search();
    setIsResultOpen(true);
  };

  const handleSelectCandidate = (candidate: AddressCandidate) => {
    onSelect({
      name: candidate.companyName,
      postalCode: candidate.postalCode,
      address: candidate.address,
    });
    setIsResultOpen(false);
  };

  const canSearch = searchQuery.trim() !== "";
  const isNoResults = searchResult?.success === false && searchResult.error.type === "NO_RESULTS";

  return (
    <div className="rounded-lg border border-border bg-secondary">
      {/* 検索フォーム */}
      <div className="space-y-3 p-4">
        <p className="text-xs font-bold text-foreground">AI検索で入力を補助</p>

        <div className="space-y-1.5">
          <Label htmlFor={searchQueryId} className="text-muted-foreground">
            会社名
          </Label>
          <Input
            type="text"
            id={searchQueryId}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="XXX銀行"
            disabled={disabled || isSearching}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={hintId} className="text-muted-foreground">
            検索ヒント（任意）
          </Label>
          <Input
            type="text"
            id={hintId}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="印刷業/米国法人/本社住所 など"
            disabled={disabled || isSearching}
          />
        </div>

        {isSearching ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-primary bg-card px-4 py-3"
          >
            <CircleNotch aria-hidden className="size-5 shrink-0 animate-spin text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">AIで住所を検索しています</p>
              <p className="text-xs text-muted-foreground">
                Web を検索するため、数十秒かかることがあります
              </p>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSearch(phase === "results" ? reSearch : startSearch)}
            disabled={disabled || !canSearch}
          >
            <MagnifyingGlass />
            {phase === "results" ? "再検索" : "AI検索"}
          </Button>
        )}
      </div>

      {/* 検索結果（候補・該当なし・エラー）はモーダルで見せる */}
      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>住所の候補</DialogTitle>
            <DialogDescription>
              {searchResult?.success
                ? "候補から選択してください（フォームに自動入力されます）"
                : isNoResults
                  ? "候補が見つかりませんでした。会社名や検索ヒントを変えて再検索してください"
                  : "住所を検索できませんでした"}
            </DialogDescription>
          </DialogHeader>

          {searchResult?.success ? (
            <div className="divide-y divide-border-soft rounded-lg border border-border">
              {searchResult.data.candidates.map((candidate, index) => {
                const confidence = getConfidenceLabel(candidate.confidence);
                const key = `${index}-${candidate.companyName}-${candidate.address}`;
                return (
                  <div key={key} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-foreground">
                          {candidate.companyName}
                        </div>
                        <div className="mt-1 text-[13px] text-muted-foreground">
                          {candidate.postalCode && (
                            <span className="mr-2">
                              〒{candidate.postalCode.replace(/^〒/, "")}
                            </span>
                          )}
                          {candidate.address}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>根拠: {candidate.source}</span>
                          <span className={cn("font-bold", confidence.className)}>
                            {confidence.text}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openGoogleSearch(candidate)}
                          className="inline-flex items-center gap-1 text-xs text-primary-active transition-colors duration-150 ease-out hover:text-primary-hover hover:underline"
                        >
                          確認
                          <ArrowSquareOut className="size-3.5" />
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
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
            <div
              className={cn(
                "rounded-lg border p-3 text-sm",
                isNoResults
                  ? "border-border-soft bg-card text-muted-foreground"
                  : "border-destructive bg-destructive-hover text-destructive",
              )}
            >
              {getErrorMessage(searchResult)}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResultOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
