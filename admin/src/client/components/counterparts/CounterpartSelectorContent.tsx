"use client";
import "client-only";

import { useState, useEffect, useMemo } from "react";
import { Input, Label } from "@/client/components/ui";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { suggestCounterpartAction } from "@/server/contexts/report/presentation/actions/suggest-counterpart";
import type { CounterpartSuggestion } from "@/server/contexts/report/presentation/types/counterpart-suggestion";
import {
  CandidateEmpty,
  CandidateGroupLabel,
  CandidateList,
  CandidateListItem,
} from "@/client/components/assignment/CandidateList";
import { SelectedCandidateCard } from "@/client/components/assignment/SelectedCandidateCard";

interface CounterpartSelectorContentProps {
  allCounterparts: Counterpart[];
  selectedCounterpartId: string | null;
  onSelect: (counterpartId: string) => void;
  transactions: TransactionWithCounterpart[];
  politicalOrganizationId: string;
}

/**
 * 紐付けダイアログの「既存から選択」タブ。検索 input + 候補一覧（提案 → すべて）。
 * 候補行の見た目は寄付者側と共通（CandidateListItem）。
 */
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
  const showSuggestions = !isLoadingSuggestions && suggestions.length > 0 && !searchQuery.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="counterpart-search">取引先を検索</Label>
        <Input
          id="counterpart-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="名前または住所で検索..."
          className="border-[1.5px] text-[13px]"
        />
      </div>

      {selectedCounterpart && (
        <SelectedCandidateCard>
          <p className="text-[13px] font-semibold text-foreground">{selectedCounterpart.name}</p>
          {selectedCounterpart.address && (
            <p className="text-xs text-muted-foreground">{selectedCounterpart.address}</p>
          )}
        </SelectedCandidateCard>
      )}

      <CandidateList>
        {isLoadingSuggestions && (
          <div className="px-3 py-2 text-sm text-muted-foreground">提案を読み込み中...</div>
        )}

        {showSuggestions && (
          <div className="border-b border-border-soft">
            <CandidateGroupLabel>
              {transactions.length === 1
                ? "提案（この取引に基づく）"
                : "提案（選択した取引に基づく）"}
            </CandidateGroupLabel>
            {suggestions.map((suggestion) => (
              <CandidateListItem
                key={suggestion.counterpart.id}
                selected={selectedCounterpartId === suggestion.counterpart.id}
                onSelect={() => onSelect(suggestion.counterpart.id)}
              >
                <span className="block text-[13px] font-semibold text-foreground">
                  {suggestion.counterpart.name}
                </span>
                {suggestion.counterpart.address && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.counterpart.address}
                  </span>
                )}
                <span className="mt-0.5 block text-xs text-primary-active">
                  {suggestion.reason}
                </span>
              </CandidateListItem>
            ))}
          </div>
        )}

        {nonSuggestedCounterparts.length > 0 ? (
          <div>
            <CandidateGroupLabel>すべての取引先</CandidateGroupLabel>
            {nonSuggestedCounterparts.map((cp) => (
              <CandidateListItem
                key={cp.id}
                selected={selectedCounterpartId === cp.id}
                onSelect={() => onSelect(cp.id)}
              >
                <span className="block text-[13px] font-semibold text-foreground">{cp.name}</span>
                {cp.address && (
                  <span className="block truncate text-xs text-muted-foreground">{cp.address}</span>
                )}
              </CandidateListItem>
            ))}
          </div>
        ) : (
          !suggestions.length &&
          !isLoadingSuggestions && <CandidateEmpty>該当する取引先がありません</CandidateEmpty>
        )}
      </CandidateList>
    </div>
  );
}
