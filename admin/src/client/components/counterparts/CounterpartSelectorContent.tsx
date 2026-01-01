"use client";
import "client-only";

import { useState, useEffect, useMemo } from "react";
import { Input, Label } from "@/client/components/ui";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { suggestCounterpartAction } from "@/server/contexts/report/presentation/actions/suggest-counterpart";
import type { CounterpartSuggestion } from "@/server/contexts/report/presentation/types/counterpart-suggestion";

interface CounterpartSelectorContentProps {
  allCounterparts: Counterpart[];
  selectedCounterpartId: string | null;
  onSelect: (counterpartId: string) => void;
  transactions: TransactionWithCounterpart[];
  politicalOrganizationId: string;
}

export function CounterpartSelectorContent({
  allCounterparts,
  selectedCounterpartId,
  onSelect,
  transactions,
  politicalOrganizationId,
}: CounterpartSelectorContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CounterpartSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const filteredCounterparts = useMemo(() => {
    return allCounterparts.filter((cp) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        cp.name.toLowerCase().includes(query) ||
        (cp.address?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [allCounterparts, searchQuery]);

  const suggestedIds = useMemo(
    () => new Set(suggestions.map((s) => s.counterpart.id)),
    [suggestions],
  );
  const nonSuggestedCounterparts = useMemo(
    () => filteredCounterparts.filter((cp) => !suggestedIds.has(cp.id)),
    [filteredCounterparts, suggestedIds],
  );

  useEffect(() => {
    if (transactions.length === 0 || !politicalOrganizationId) return;

    setIsLoadingSuggestions(true);
    const transactionId = transactions[0].id;
    suggestCounterpartAction(transactionId, politicalOrganizationId, 5)
      .then((result) => {
        if (result.success) {
          setSuggestions(result.suggestions);
        }
      })
      .finally(() => {
        setIsLoadingSuggestions(false);
      });
  }, [transactions, politicalOrganizationId]);

  const selectedCounterpart = allCounterparts.find((cp) => cp.id === selectedCounterpartId);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="counterpart-search">取引先を検索</Label>
        <Input
          id="counterpart-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="名前または住所で検索..."
        />
      </div>

      {selectedCounterpart && (
        <div className="bg-primary/10 border border-primary rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">選択中:</p>
          <p className="text-white font-medium">{selectedCounterpart.name}</p>
          {selectedCounterpart.address && (
            <p className="text-muted-foreground text-xs">{selectedCounterpart.address}</p>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
        {isLoadingSuggestions && (
          <div className="px-3 py-2 text-muted-foreground text-sm">提案を読み込み中...</div>
        )}

        {!isLoadingSuggestions && suggestions.length > 0 && !searchQuery.trim() && (
          <div className="py-1 border-b border-border">
            <div className="px-3 py-1 text-xs text-muted-foreground bg-secondary/30">
              {transactions.length === 1
                ? "提案（このTransactionに基づく）"
                : "提案（選択したTransactionに基づく）"}
            </div>
            {suggestions.map((suggestion) => {
              const isSelected = selectedCounterpartId === suggestion.counterpart.id;
              return (
                <button
                  key={suggestion.counterpart.id}
                  type="button"
                  onClick={() => onSelect(suggestion.counterpart.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors flex items-start gap-3 ${
                    isSelected ? "bg-secondary" : ""
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      isSelected ? "border-primary" : "border-gray-500"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium block">
                      {suggestion.counterpart.name}
                    </span>
                    {suggestion.counterpart.address && (
                      <span className="text-muted-foreground text-xs truncate block">
                        {suggestion.counterpart.address}
                      </span>
                    )}
                    <span className="text-primary text-xs mt-0.5 block">{suggestion.reason}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {nonSuggestedCounterparts.length > 0 ? (
          <div className="py-1">
            <div className="px-3 py-1 text-xs text-muted-foreground bg-secondary/30">
              すべての取引先
            </div>
            {nonSuggestedCounterparts.map((cp) => {
              const isSelected = selectedCounterpartId === cp.id;
              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => onSelect(cp.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors flex items-start gap-3 ${
                    isSelected ? "bg-secondary" : ""
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      isSelected ? "border-primary" : "border-gray-500"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium block">{cp.name}</span>
                    {cp.address && (
                      <span className="text-muted-foreground text-xs truncate block">
                        {cp.address}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          !suggestions.length &&
          !isLoadingSuggestions && (
            <div className="px-3 py-4 text-center text-muted-foreground text-sm">
              該当する取引先がありません
            </div>
          )
        )}
      </div>
    </div>
  );
}
