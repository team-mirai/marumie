"use client";
import "client-only";

import { useState, useEffect, useCallback } from "react";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { BalanceSnapshot } from "@/shared/models/balance-snapshot";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import BalanceSnapshotForm from "./BalanceSnapshotForm";
import BalanceSnapshotList from "./BalanceSnapshotList";
import CurrentBalance from "./CurrentBalance";
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
      <PoliticalOrganizationSelect
        organizations={organizations}
        value={selectedOrgId}
        onValueChange={handleOrgChange}
        required
      />

      {selectedOrgId && (
        <div className="space-y-8">
          <CurrentBalance snapshot={currentBalance} />

          <hr className="border-border" />

          <div>
            <h3 className="text-lg font-medium text-white mb-4">残高を登録</h3>
            <BalanceSnapshotForm
              politicalOrganizationId={selectedOrgId}
              onSubmit={handleFormSubmit}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">残高スナップショット一覧</h3>
            {loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">読み込み中...</p>
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
