"use client";
import "client-only";

import { useState, useEffect, useCallback, useRef, useOptimistic, useTransition } from "react";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import {
  assignCounterpartAction,
  unassignCounterpartAction,
} from "@/server/contexts/report/presentation/actions/assign-counterpart";
import { createCounterpartAction } from "@/server/contexts/report/presentation/actions/create-counterpart";
import { suggestCounterpartAction } from "@/server/contexts/report/presentation/actions/suggest-counterpart";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";
import type { CounterpartSuggestion } from "@/server/contexts/report/application/services/counterpart-suggester";

interface CounterpartComboboxProps {
  transactionId: string;
  currentCounterpart: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  allCounterparts: Counterpart[];
  onAssigned?: () => void;
  politicalOrganizationId: string;
}

export function CounterpartCombobox({
  transactionId,
  currentCounterpart,
  allCounterparts,
  onAssigned,
  politicalOrganizationId,
}: CounterpartComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<CounterpartSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [optimisticCounterpart, setOptimisticCounterpart] = useOptimistic(
    currentCounterpart,
    (_state, newCounterpart: { id: string; name: string; address: string | null } | null) =>
      newCounterpart,
  );

  const filteredCounterparts = allCounterparts.filter((cp) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      cp.name.toLowerCase().includes(query) || (cp.address?.toLowerCase().includes(query) ?? false)
    );
  });

  const suggestedIds = new Set(suggestions.map((s) => s.counterpart.id));
  const nonSuggestedCounterparts = filteredCounterparts.filter((cp) => !suggestedIds.has(cp.id));

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setIsCreateMode(false);
      setSearchQuery("");
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && politicalOrganizationId) {
      setIsLoadingSuggestions(true);
      suggestCounterpartAction(transactionId, politicalOrganizationId, 5)
        .then((result) => {
          if (result.success) {
            setSuggestions(result.suggestions);
          }
        })
        .finally(() => {
          setIsLoadingSuggestions(false);
        });
    }
  }, [isOpen, transactionId, politicalOrganizationId]);

  const handleSelect = async (counterpart: Counterpart) => {
    setError(null);
    startTransition(async () => {
      setOptimisticCounterpart({
        id: counterpart.id,
        name: counterpart.name,
        address: counterpart.address,
      });
      setIsOpen(false);
      setSearchQuery("");

      const result = await assignCounterpartAction(transactionId, counterpart.id);
      if (!result.success) {
        setError(result.errors?.join(", ") ?? "紐付けに失敗しました");
        setOptimisticCounterpart(currentCounterpart);
      } else {
        onAssigned?.();
      }
    });
  };

  const handleUnassign = async () => {
    setError(null);
    startTransition(async () => {
      setOptimisticCounterpart(null);
      setIsOpen(false);

      const result = await unassignCounterpartAction(transactionId);
      if (!result.success) {
        setError(result.errors?.join(", ") ?? "紐付け解除に失敗しました");
        setOptimisticCounterpart(currentCounterpart);
      } else {
        onAssigned?.();
      }
    });
  };

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;

    setError(null);
    startTransition(async () => {
      const createResult = await createCounterpartAction({
        name: newName.trim(),
        address: newAddress.trim(),
      });

      if (!createResult.success) {
        setError(createResult.errors?.join(", ") ?? "作成に失敗しました");
        return;
      }

      if (createResult.counterpartId) {
        setOptimisticCounterpart({
          id: createResult.counterpartId,
          name: newName.trim(),
          address: newAddress.trim(),
        });
        setIsOpen(false);
        setIsCreateMode(false);
        setNewName("");
        setNewAddress("");
        setSearchQuery("");

        const assignResult = await assignCounterpartAction(
          transactionId,
          createResult.counterpartId,
        );
        if (!assignResult.success) {
          setError(assignResult.errors?.join(", ") ?? "紐付けに失敗しました");
          setOptimisticCounterpart(currentCounterpart);
        } else {
          onAssigned?.();
        }
      }
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors duration-200 ${
          isPending ? "opacity-60" : "hover:bg-secondary cursor-pointer"
        } ${
          optimisticCounterpart ? "bg-input border-border" : "bg-yellow-400/10 border-yellow-400/30"
        }`}
      >
        {optimisticCounterpart ? (
          <div className="flex flex-col">
            <span className="text-white font-medium truncate">{optimisticCounterpart.name}</span>
            <span className="text-muted-foreground text-xs truncate">
              {optimisticCounterpart.address}
            </span>
          </div>
        ) : (
          <span className="text-yellow-400">未設定</span>
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 text-red-500 text-xs bg-red-900/20 p-2 rounded border border-red-900/30 z-50">
          {error}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {isCreateMode ? (
            <form onSubmit={handleCreateAndAssign} className="p-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">新規取引先作成</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMode(false);
                    setNewName("");
                    setNewAddress("");
                  }}
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  戻る
                </button>
              </div>

              <div>
                <label
                  htmlFor={`create-name-${transactionId}`}
                  className="block mb-1 text-sm text-muted-foreground"
                >
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id={`create-name-${transactionId}`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={MAX_NAME_LENGTH}
                  className="bg-input text-white border border-border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="取引先名"
                  disabled={isPending}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`create-address-${transactionId}`}
                  className="block mb-1 text-sm text-muted-foreground"
                >
                  住所 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id={`create-address-${transactionId}`}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  maxLength={MAX_ADDRESS_LENGTH}
                  className="bg-input text-white border border-border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="住所"
                  disabled={isPending}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMode(false);
                    setNewName("");
                    setNewAddress("");
                  }}
                  disabled={isPending}
                  className="bg-secondary text-white border border-border rounded-lg px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newName.trim() || !newAddress.trim()}
                  className={`bg-primary text-white rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isPending || !newName.trim() || !newAddress.trim()
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-blue-600 cursor-pointer"
                  }`}
                >
                  {isPending ? "作成中..." : "作成して紐付け"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="p-2 border-b border-border">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="検索..."
                  className="bg-input text-white border border-border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {optimisticCounterpart && (
                  <button
                    type="button"
                    onClick={handleUnassign}
                    disabled={isPending}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-900/20 transition-colors border-b border-border"
                  >
                    紐付けを解除
                  </button>
                )}

                {isLoadingSuggestions && (
                  <div className="px-3 py-2 text-muted-foreground text-sm">提案を読み込み中...</div>
                )}

                {!isLoadingSuggestions && suggestions.length > 0 && !searchQuery.trim() && (
                  <div className="py-1 border-b border-border">
                    <div className="px-3 py-1 text-xs text-muted-foreground">
                      提案（このTransactionに基づく）
                    </div>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.counterpart.id}
                        type="button"
                        onClick={() => handleSelect(suggestion.counterpart)}
                        disabled={isPending}
                        className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors ${
                          optimisticCounterpart?.id === suggestion.counterpart.id
                            ? "bg-secondary"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-white font-medium">
                            {suggestion.counterpart.name}
                          </span>
                          <span className="text-muted-foreground text-xs truncate">
                            {suggestion.counterpart.address}
                          </span>
                          <span className="text-primary text-xs mt-0.5">{suggestion.reason}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {nonSuggestedCounterparts.length > 0 ? (
                  <div className="py-1">
                    <div className="px-3 py-1 text-xs text-muted-foreground">すべての取引先</div>
                    {nonSuggestedCounterparts.map((cp) => (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => handleSelect(cp)}
                        disabled={isPending}
                        className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors ${
                          optimisticCounterpart?.id === cp.id ? "bg-secondary" : ""
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{cp.name}</span>
                          <span className="text-muted-foreground text-xs truncate">
                            {cp.address}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  !suggestions.length && (
                    <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                      該当する取引先がありません
                    </div>
                  )
                )}
              </div>

              <div className="p-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateMode(true)}
                  className="w-full text-left px-3 py-2 text-primary hover:bg-secondary rounded-lg transition-colors"
                >
                  + 新規取引先を作成
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
