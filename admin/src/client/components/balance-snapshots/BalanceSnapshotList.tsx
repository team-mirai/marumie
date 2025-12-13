"use client";
import "client-only";

import { useState } from "react";
import type { BalanceSnapshot } from "@/shared/models/balance-snapshot";

interface BalanceSnapshotListProps {
  snapshots: BalanceSnapshot[];
}

export default function BalanceSnapshotList({
  snapshots,
}: BalanceSnapshotListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("この残高スナップショットを削除しますか？")) {
      return;
    }

    setDeletingId(id);
    try {
      const { deleteBalanceSnapshot } = await import(
        "@/server/contexts/common/presentation/actions/delete-balance-snapshot"
      );
      await deleteBalanceSnapshot(id);

      // TODO: 成功メッセージを表示
      window.location.reload(); // 簡易的な更新
    } catch (error) {
      console.error("Failed to delete balance snapshot:", error);
      // TODO: エラーメッセージを表示
    } finally {
      setDeletingId(null);
    }
  };

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-primary-muted">残高スナップショットはありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-primary-border">
            <th className="px-2 py-3 text-left text-sm font-semibold text-white">
              残高日付
            </th>
            <th className="px-2 py-3 text-right text-sm font-semibold text-white">
              残高
            </th>
            <th className="px-2 py-3 text-left text-sm font-semibold text-white">
              登録日時
            </th>
            <th className="px-2 py-3 text-center text-sm font-semibold text-white w-20">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot.id} className="border-b border-primary-border">
              <td className="px-2 py-3 text-sm text-white">
                {new Date(snapshot.snapshot_date).toLocaleDateString("ja-JP")}
              </td>
              <td className="px-2 py-3 text-sm text-right text-white">
                ¥{snapshot.balance.toLocaleString()}
              </td>
              <td className="px-2 py-3 text-sm text-primary-muted">
                {new Date(snapshot.created_at).toLocaleString("ja-JP")}
              </td>
              <td className="px-2 py-3 text-center">
                <button
                  type="button"
                  onClick={() => handleDelete(snapshot.id)}
                  disabled={deletingId === snapshot.id}
                  className={`bg-red-600 text-white border-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 ${
                    deletingId === snapshot.id
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-red-700 cursor-pointer"
                  }`}
                  title="削除"
                >
                  {deletingId === snapshot.id ? "削除中..." : "削除"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
