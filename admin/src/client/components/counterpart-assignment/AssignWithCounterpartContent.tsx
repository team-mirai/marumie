"use client";
import "client-only";

import { useState, useTransition } from "react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/client/components/ui";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { CounterpartFormContent } from "@/client/components/counterparts/CounterpartFormContent";
import { CounterpartSelectorContent } from "@/client/components/counterparts/CounterpartSelectorContent";
import { SelectedTransactionsPanel } from "@/client/components/assignment/SelectedTransactionsPanel";
import { FormErrorAlert } from "@/client/components/assignment/FormErrorAlert";
import { createCounterpartAction } from "@/server/contexts/report/presentation/actions/create-counterpart";
import { bulkAssignCounterpartAction } from "@/server/contexts/report/presentation/actions/bulk-assign-counterpart";

interface AssignWithCounterpartContentProps {
  transactions: TransactionWithCounterpart[];
  allCounterparts: Counterpart[];
  politicalOrganizationId: string;
  onSuccess: (count: number) => void;
  onCancel: () => void;
}

/**
 * 取引先紐付けダイアログの本体。左に選択中の取引、右に「既存から選択 / 新規作成」タブ。
 * 確定は teal 塗り、キャンセルは黒枠白のピル。
 */
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
      <SelectedTransactionsPanel
        transactions={transactions}
        title={`選択中の取引 (${transactions.length}件)`}
      />

      <div className="flex min-h-0 min-w-0 flex-col lg:flex-1">
        {error && <FormErrorAlert message={error} className="mb-4 shrink-0" />}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "select" | "create")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mb-4 shrink-0">
            <TabsTrigger value="select">既存から選択</TabsTrigger>
            <TabsTrigger value="create">新規作成</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CounterpartSelectorContent
                allCounterparts={allCounterparts}
                selectedCounterpartId={selectedCounterpartId}
                onSelect={setSelectedCounterpartId}
                transactions={transactions}
                politicalOrganizationId={politicalOrganizationId}
              />
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border-soft pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={handleSelectExisting}
                disabled={isPending || !selectedCounterpartId}
              >
                {isPending ? "紐付け中..." : `紐付け (${transactions.length}件)`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
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
