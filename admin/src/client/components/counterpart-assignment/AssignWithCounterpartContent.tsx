"use client";
import "client-only";

import { useState, useTransition } from "react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/client/components/ui";
import { formatDate, formatAmount } from "@/client/lib";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { CounterpartFormContent } from "@/client/components/counterparts/CounterpartFormContent";
import { CounterpartSelectorContent } from "@/client/components/counterparts/CounterpartSelectorContent";
import { createCounterpartAction } from "@/server/contexts/report/presentation/actions/create-counterpart";
import { bulkAssignCounterpartAction } from "@/server/contexts/report/presentation/actions/bulk-assign-counterpart";

interface AssignWithCounterpartContentProps {
  transactions: TransactionWithCounterpart[];
  allCounterparts: Counterpart[];
  politicalOrganizationId: string;
  onSuccess: (count: number) => void;
  onCancel: () => void;
}

export function AssignWithCounterpartContent({
  transactions,
  allCounterparts,
  politicalOrganizationId,
  onSuccess,
  onCancel,
}: AssignWithCounterpartContentProps) {
  const [activeTab, setActiveTab] = useState<"select" | "create">("select");
  const [selectedCounterpartId, setSelectedCounterpartId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectExisting = async () => {
    if (!selectedCounterpartId) {
      setError("取引先を選択してください");
      return;
    }

    setError(null);
    startTransition(async () => {
      const transactionIds = transactions.map((t) => t.id);
      const result = await bulkAssignCounterpartAction(transactionIds, selectedCounterpartId);
      if (!result.success) {
        setError(result.errors?.join(", ") ?? "紐付けに失敗しました");
        return;
      }
      onSuccess(transactions.length);
    });
  };

  const handleCreateAndAssign = async (data: {
    name: string;
    postalCode: string | null;
    address: string | null;
  }) => {
    setError(null);

    const createResult = await createCounterpartAction({
      name: data.name,
      postalCode: data.postalCode,
      address: data.address,
    });

    if (!createResult.success) {
      throw new Error(createResult.errors?.join(", ") ?? "作成に失敗しました");
    }

    if (!createResult.counterpartId) {
      throw new Error("取引先IDが取得できませんでした");
    }

    const transactionIds = transactions.map((t) => t.id);
    const result = await bulkAssignCounterpartAction(transactionIds, createResult.counterpartId);
    if (!result.success) {
      throw new Error(result.errors?.join(", ") ?? "紐付けに失敗しました");
    }

    onSuccess(transactions.length);
  };

  const getSelectButtonLabel = () => {
    return `紐付け (${transactions.length}件)`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
      <div className="lg:w-1/3 flex-shrink-0 flex flex-col min-h-0">
        <div className="text-white font-medium mb-3">
          {`選択中の取引 (${transactions.length}件)`}
        </div>

        <div className="border border-border rounded-lg flex-1 overflow-y-auto">
          {transactions.slice(0, 10).map((t) => (
            <div key={t.id} className="px-3 py-2 text-sm border-b border-border last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{formatDate(t.transactionDate)}</span>
                <span className="text-white">{formatAmount(t.debitAmount)}</span>
              </div>
              <div className="text-muted-foreground text-xs truncate">{t.description || "-"}</div>
            </div>
          ))}
          {transactions.length > 10 && (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              ...他 {transactions.length - 10}件
            </div>
          )}
        </div>
      </div>

      <div className="lg:flex-1 flex flex-col min-h-0 min-w-0">
        {error && (
          <div className="text-red-500 p-3 bg-red-900/20 rounded-lg border border-red-900/30 mb-4 flex-shrink-0">
            {error}
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "select" | "create")}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="mb-4 flex-shrink-0">
            <TabsTrigger value="select">既存から選択</TabsTrigger>
            <TabsTrigger value="create">新規作成</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <CounterpartSelectorContent
                allCounterparts={allCounterparts}
                selectedCounterpartId={selectedCounterpartId}
                onSelect={setSelectedCounterpartId}
                transactions={transactions}
                politicalOrganizationId={politicalOrganizationId}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={handleSelectExisting}
                disabled={isPending || !selectedCounterpartId}
              >
                {isPending ? "紐付け中..." : getSelectButtonLabel()}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <CounterpartFormContent
                mode="create"
                defaultSearchQuery={transactions[0]?.description ?? ""}
                onSubmit={handleCreateAndAssign}
                disabled={isPending}
                submitLabel="作成して紐づける"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
