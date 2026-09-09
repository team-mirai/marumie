"use client";
import "client-only";

import { useState, useEffect, useCallback } from "react";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import BalanceSnapshotForm from "@/client/components/balance-snapshots/BalanceSnapshotForm";
import BalanceSnapshotList from "@/client/components/balance-snapshots/BalanceSnapshotList";
import CurrentBalance from "@/client/components/balance-snapshots/CurrentBalance";
import { Label } from "@/client/components/ui";
import { apiClient } from "@/client/lib/api-client";

interface BalanceSnapshotsClientProps {
  organizations: PoliticalOrganization[];
}

export default function BalanceSnapshotsClient({ organizations }: BalanceSnapshotsClientProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
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

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    loadSnapshots(orgId);
  };

  // 最初の組織を自動選択
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrgId) {
      const firstOrgId = organizations[0].id;
      setSelectedOrgId(firstOrgId);
      loadSnapshots(firstOrgId);
    }
  }, [organizations, selectedOrgId, loadSnapshots]);

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
      await loadSnapshots(selectedOrgId);
    } catch (error) {
      // TODO: エラーメッセージを表示
      console.error("Failed to create balance snapshot:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex max-w-[360px] flex-col gap-1.5">
            <Label className="text-xs font-bold">
              政治団体 <span className="text-destructive">*</span>
            </Label>
            <PoliticalOrganizationSelect
              organizations={organizations}
              value={selectedOrgId}
              onValueChange={handleOrgChange}
              required
              hideLabel
              className="w-full"
            />
          </div>
          {selectedOrgId && (
            <div className="mt-6">
              <h2 className="text-[13px] font-bold text-foreground">残高を登録</h2>
              <div className="mt-3">
                <BalanceSnapshotForm
                  politicalOrganizationId={selectedOrgId}
                  onSubmit={handleFormSubmit}
                />
              </div>
            </div>
          )}
        </div>

        {selectedOrgId && <CurrentBalance snapshot={currentBalance} />}
      </div>

      {selectedOrgId && (
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
      )}
    </div>
  );
}
