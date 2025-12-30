"use client";
import "client-only";

import { useState, useTransition, useMemo } from "react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/client/components/ui";
import { formatDate, formatAmount } from "@/client/lib";
import type { Donor, DonorType } from "@/server/contexts/report/domain/models/donor";
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";
import { DonorFormContent } from "./DonorFormContent";
import { DonorSelectorContent } from "./DonorSelectorContent";
import { createDonorAction } from "@/server/contexts/report/presentation/actions/create-donor";
import { bulkAssignDonorAction } from "@/server/contexts/report/presentation/actions/bulk-assign-donor";
import { getCommonAllowedDonorTypes } from "@/server/contexts/report/domain/models/donor-assignment-rules";

interface AssignWithDonorContentProps {
  transactions: TransactionWithDonor[];
  allDonors: Donor[];
  onSuccess: () => void;
  onCancel: () => void;
}

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

  const getSelectButtonLabel = () => {
    if (isBulk) {
      return `すべてに紐付け (${transactions.length}件)`;
    }
    return "この寄付者を紐付け";
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
      <div className="lg:w-1/3 flex-shrink-0 flex flex-col min-h-0">
        <div className="text-white font-medium mb-3">
          {isBulk ? `選択中の取引 (${transactions.length}件)` : "取引情報"}
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

        {allowedDonorTypes.length > 0 && allowedDonorTypes.length < 3 && (
          <div className="mt-3 p-2 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
            選択された取引のカテゴリでは、以下の寄付者種別のみ紐付け可能です:
            <span className="text-white ml-1">
              {allowedDonorTypes
                .map((t) =>
                  t === "individual" ? "個人" : t === "corporation" ? "法人" : "政治団体",
                )
                .join(", ")}
            </span>
          </div>
        )}
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
              <DonorSelectorContent
                allDonors={allDonors}
                selectedDonorId={selectedDonorId}
                onSelect={setSelectedDonorId}
                allowedDonorTypes={allowedDonorTypes}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border flex-shrink-0">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={handleSelectExisting}
                disabled={isPending || !selectedDonorId}
              >
                {isPending ? "紐付け中..." : getSelectButtonLabel()}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 overflow-y-auto min-h-0">
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
