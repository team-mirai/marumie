"use client";
import "client-only";

import { useState, useTransition } from "react";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import { bulkAssignCounterpartAction } from "@/server/contexts/report/presentation/actions/bulk-assign-counterpart";
import { Button, Input, Label } from "@/client/components/ui";

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTransactions: TransactionWithCounterpart[];
  allCounterparts: Counterpart[];
  onSuccess: () => void;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export function BulkAssignModal({
  isOpen,
  onClose,
  selectedTransactions,
  allCounterparts,
  onSuccess,
}: BulkAssignModalProps) {
  const [selectedCounterpartId, setSelectedCounterpartId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const selectedCounterpart = allCounterparts.find((cp) => cp.id === selectedCounterpartId);

  const filteredCounterparts = allCounterparts.filter((cp) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return cp.name.toLowerCase().includes(query) || cp.address.toLowerCase().includes(query);
  });

  const handleSubmit = async () => {
    if (!selectedCounterpartId) {
      setError("取引先を選択してください");
      return;
    }

    setError(null);
    startTransition(async () => {
      const transactionIds = selectedTransactions.map((t) => t.id);
      const result = await bulkAssignCounterpartAction(transactionIds, selectedCounterpartId);

      if (!result.success) {
        setError(result.errors?.join(", ") ?? "一括紐付けに失敗しました");
        return;
      }

      onSuccess();
      onClose();
    });
  };

  const handleClose = () => {
    setSelectedCounterpartId("");
    setSearchQuery("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 cursor-default"
        onClick={handleClose}
        aria-label="モーダルを閉じる"
      />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-white">一括紐付け</h2>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <p className="text-muted-foreground text-sm mb-2">
              選択したTransaction:{" "}
              <span className="text-white font-medium">{selectedTransactions.length}件</span>
            </p>
          </div>

          <div>
            <Label htmlFor="bulk-assign-search">
              紐付けるCounterpart <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bulk-assign-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="取引先を検索..."
              className="mb-2"
            />
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
              {filteredCounterparts.length > 0 ? (
                filteredCounterparts.map((cp) => (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => setSelectedCounterpartId(cp.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors border-b border-border last:border-b-0 ${
                      selectedCounterpartId === cp.id ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{cp.name}</span>
                      <span className="text-muted-foreground text-xs truncate">{cp.address}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                  該当する取引先がありません
                </div>
              )}
            </div>
          </div>

          {selectedCounterpart && (
            <div className="bg-secondary/30 border border-border rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">選択中:</p>
              <p className="text-white font-medium">{selectedCounterpart.name}</p>
              <p className="text-muted-foreground text-xs">{selectedCounterpart.address}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">プレビュー</p>
            <div className="border border-border rounded-lg max-h-32 overflow-y-auto">
              {selectedTransactions.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  className="px-3 py-2 text-sm border-b border-border last:border-b-0"
                >
                  <span className="text-muted-foreground">{formatDate(t.transactionDate)}</span>
                  <span className="text-white mx-2">{formatAmount(t.debitAmount)}</span>
                  <span className="text-muted-foreground truncate">{t.description || "-"}</span>
                </div>
              ))}
              {selectedTransactions.length > 10 && (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  ...他 {selectedTransactions.length - 10}件
                </div>
              )}
            </div>
          </div>

          {selectedCounterpart && (
            <p className="text-sm text-muted-foreground">
              これらのTransactionに「<span className="text-white">{selectedCounterpart.name}</span>
              」を紐付けます
            </p>
          )}

          {error && (
            <div className="text-red-500 text-sm bg-red-900/20 p-2 rounded border border-red-900/30">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !selectedCounterpartId}
          >
            {isPending ? "紐付け中..." : "紐付け"}
          </Button>
        </div>
      </div>
    </div>
  );
}
