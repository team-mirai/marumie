"use client";
import "client-only";

import { useState, useTransition, useMemo } from "react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/client/components/ui";
import type { Donor, DonorType } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";
import { DonorFormContent } from "./DonorFormContent";
import { DonorSelectorContent } from "./DonorSelectorContent";
import { SelectedTransactionsPanel } from "@/client/components/assignment/SelectedTransactionsPanel";
import { FormErrorAlert } from "@/client/components/assignment/FormErrorAlert";
import { createDonorAction } from "@/server/contexts/report/presentation/actions/create-donor";
import { bulkAssignDonorAction } from "@/server/contexts/report/presentation/actions/bulk-assign-donor";
import { getCommonAllowedDonorTypes } from "@/server/contexts/report/domain/models/donor-assignment-rules";

interface AssignWithDonorContentProps {
  transactions: TransactionWithDonor[];
  allDonors: Donor[];
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 寄付者紐付けダイアログの本体。左に選択中の取引（と種別制約の注記）、右に「既存から選択 / 新規作成」タブ。
 * 確定は teal 塗り、キャンセルは黒枠白のピル。
 */
export function AssignWithDonorContent({
  transactions,
  allDonors,
  onSuccess,
  onCancel,
}: AssignWithDonorContentProps) {
  const [activeTab, setActiveTab] = useState<"select" | "create">("select");
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isBulk = transactions.length > 1;

  const allowedDonorTypes = useMemo(() => {
    const categoryKeys = transactions.map((t) => t.categoryKey);
    return getCommonAllowedDonorTypes(categoryKeys);
  }, [transactions]);

  const handleSelectExisting = async () => {
    if (!selectedDonorId) {
      setError("寄付者を選択してください");
      return;
    }

    setError(null);
    startTransition(async () => {
      const transactionIds = transactions.map((t) => t.id);
      const result = await bulkAssignDonorAction(transactionIds, selectedDonorId);
      if (!result.success) {
        setError(result.errors?.join(", ") ?? "紐付けに失敗しました");
        return;
      }
      onSuccess();
    });
  };

  const handleCreateAndAssign = async (data: {
    donorType: DonorType;
    name: string;
    address: string | null;
    occupation: string | null;
  }) => {
    setError(null);

    const createResult = await createDonorAction({
      donorType: data.donorType,
      name: data.name,
      address: data.address,
      occupation: data.occupation,
    });

    if (!createResult.success) {
      throw new Error(createResult.errors?.join(", ") ?? "作成に失敗しました");
    }

    if (!createResult.donorId) {
      throw new Error("寄付者IDが取得できませんでした");
    }

    const transactionIds = transactions.map((t) => t.id);
    const result = await bulkAssignDonorAction(transactionIds, createResult.donorId);
    if (!result.success) {
      throw new Error(result.errors?.join(", ") ?? "紐付けに失敗しました");
    }

    onSuccess();
  };

  const selectButtonLabel = isBulk
    ? `すべてに紐付け (${transactions.length}件)`
    : "この寄付者を紐付け";

  const allowedTypesNote =
    allowedDonorTypes.length > 0 && allowedDonorTypes.length < 3 ? (
      <div className="mt-3 rounded-lg border border-border-soft bg-secondary p-3 text-xs text-muted-foreground">
        選択された取引のカテゴリでは、以下の寄付者種別のみ紐付け可能です:
        <span className="ml-1 font-semibold text-foreground">
          {allowedDonorTypes.map((t) => DONOR_TYPE_LABELS[t]).join(", ")}
        </span>
      </div>
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
      <SelectedTransactionsPanel
        transactions={transactions}
        title={isBulk ? `選択中の取引 (${transactions.length}件)` : "取引情報"}
        footer={allowedTypesNote}
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
              <DonorSelectorContent
                allDonors={allDonors}
                selectedDonorId={selectedDonorId}
                onSelect={setSelectedDonorId}
                allowedDonorTypes={allowedDonorTypes}
              />
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border-soft pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={handleSelectExisting}
                disabled={isPending || !selectedDonorId}
              >
                {isPending ? "紐付け中..." : selectButtonLabel}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="mt-0 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DonorFormContent
                mode="create"
                defaultName={transactions[0]?.description ?? ""}
                onSubmit={handleCreateAndAssign}
                disabled={isPending}
                submitLabel="作成して紐づける"
                allowedDonorTypes={allowedDonorTypes}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
