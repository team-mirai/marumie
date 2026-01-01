"use client";
import "client-only";

import { useState, useCallback } from "react";
import { searchCounterpartAddressAction } from "@/server/contexts/report/presentation/actions/search-counterpart-address";
import type {
  AddressCandidate,
  AddressSearchResult,
} from "@/server/contexts/report/presentation/types/address-search";

export type AddressInputPhase =
  | "initial" // 初期状態（ボタンのみ）
  | "searching" // 検索中
  | "results" // 検索結果表示
  | "confirmed"; // 確定後（Input表示）

interface UseAddressSearchProps {
  companyName: string;
  initialAddress?: string;
}

interface UseAddressSearchReturn {
  // 状態
  phase: AddressInputPhase;
  address: string;
  searchResult: AddressSearchResult | null;
  hint: string;
  isSearching: boolean;

  // アクション
  startSearch: () => void;
  reSearch: () => void;
  selectCandidate: (candidate: AddressCandidate) => void;
  switchToManual: () => void;
  clear: () => void;
  setAddress: (value: string) => void;
  setHint: (value: string) => void;
}

export function useAddressSearch({
  companyName,
  initialAddress,
}: UseAddressSearchProps): UseAddressSearchReturn {
  const [phase, setPhase] = useState<AddressInputPhase>(initialAddress ? "confirmed" : "initial");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [hint, setHint] = useState("");
  const [searchResult, setSearchResult] = useState<AddressSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const doSearch = useCallback(
    async (searchHint?: string) => {
      if (!companyName.trim()) return;

      setIsSearching(true);
      setPhase("searching");

      try {
        const result = await searchCounterpartAddressAction(companyName.trim(), searchHint);
        setSearchResult(result);
        setPhase("results");
      } catch (err) {
        console.error("住所検索エラー:", err);
        setSearchResult({
          success: false,
          error: {
            type: "API_ERROR",
            message: "検索中にエラーが発生しました",
            retryable: true,
          },
        });
        setPhase("results");
      } finally {
        setIsSearching(false);
      }
    },
    [companyName],
  );

  const startSearch = useCallback(() => {
    doSearch(hint || undefined);
  }, [doSearch, hint]);

  const reSearch = useCallback(() => {
    doSearch(hint || undefined);
  }, [doSearch, hint]);

  const selectCandidate = useCallback((candidate: AddressCandidate) => {
    setAddress(candidate.address);
    setPhase("confirmed");
  }, []);

  const switchToManual = useCallback(() => {
    setPhase("confirmed");
  }, []);

  const clear = useCallback(() => {
    setAddress("");
    setSearchResult(null);
    setPhase("initial");
  }, []);

  return {
    phase,
    address,
    searchResult,
    hint,
    isSearching,
    startSearch,
    reSearch,
    selectCandidate,
    switchToManual,
    clear,
    setAddress,
    setHint,
  };
}
