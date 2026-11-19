"use client";
import "client-only";

import { useState, useEffect, useCallback } from "react";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import type { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";
import BalanceSnapshotForm from "@/client/components/balance-snapshots/BalanceSnapshotForm";
import BalanceSnapshotList from "@/client/components/balance-snapshots/BalanceSnapshotList";
import CurrentBalance from "@/client/components/balance-snapshots/CurrentBalance";
import { apiClient } from "@/client/lib/api-client";

interface BalanceSnapshotsClientProps {
  /** グローバル対象（サイドバー上部）で選択中の政治団体 */
  politicalOrganizationId: string;
}

export default function BalanceSnapshotsClient({
  politicalOrganizationId,
}: BalanceSnapshotsClientProps) {
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const currentBalance = snapshots.length > 0 ? snapshots[0] : null;

  const loadSnapshots = useCallback(async (orgId: string) => {
    if (!orgId) {
      setSnapshots([]);
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.getBalanceSnapshots(orgId);
      setSnapshots(data);
    } catch (error) {
      console.error("Failed to load balance snapshots:", error);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots(politicalOrganizationId);
  }, [politicalOrganizationId, loadSnapshots]);

  const handleFormSubmit = async (data: {
    politicalOrganizationId: string;
    snapshotDate: string;
    balance: number;
  }) => {
    try {
      const { createBalanceSnapshot } = await import(
        "@/server/contexts/shared/presentation/actions/create-balance-snapshot"
      );

      await createBalanceSnapshot(data);

      // TODO: 成功メッセージを表示
      console.log("Balance snapshot created successfully");

      // データを再取得してリストを更新
      await loadSnapshots(politicalOrganizationId);
    } catch (error) {
      // TODO: エラーメッセージを表示
      console.error("Failed to create balance snapshot:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-[13px] font-bold text-foreground">残高を登録</h2>
          <div className="mt-3">
            <BalanceSnapshotForm
              politicalOrganizationId={politicalOrganizationId}
              onSubmit={handleFormSubmit}
            />
          </div>
        </div>

        <CurrentBalance snapshot={currentBalance} />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">残高スナップショット一覧</h2>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <CircleNotch aria-hidden className="size-4 animate-spin text-primary" />
              読み込み中...
            </div>
          ) : (
            <BalanceSnapshotList snapshots={snapshots} />
          )}
        </div>
      </div>
    </div>
  );
}
