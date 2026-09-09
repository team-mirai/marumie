"use client";
import "client-only";

import { useState } from "react";
import type { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { formatAmount, formatDate, formatDateTime } from "@/client/lib";

interface BalanceSnapshotListProps {
  snapshots: BalanceSnapshot[];
}

/** 残高スナップショットの履歴一覧（テーブル罫線ルールは取引一覧と同一、日付は YYYY.MM.DD、金額は Poppins 右寄せ） */
export default function BalanceSnapshotList({ snapshots }: BalanceSnapshotListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("この残高スナップショットを削除しますか？")) {
      return;
    }

    setDeletingId(id);
    try {
      const { deleteBalanceSnapshot } = await import(
        "@/server/contexts/shared/presentation/actions/delete-balance-snapshot"
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
      <p className="py-8 text-center text-sm text-muted-foreground">
        残高スナップショットはありません
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>残高日付</TableHead>
          <TableHead className="text-right">残高</TableHead>
          <TableHead>登録日時</TableHead>
          <TableHead className="w-20 text-center">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((snapshot) => (
          <TableRow key={snapshot.id}>
            <TableCell className="font-latin text-[13px]">
              {formatDate(snapshot.snapshot_date)}
            </TableCell>
            <TableCell className="font-latin text-right text-[13px] font-semibold">
              {formatAmount(snapshot.balance)}
            </TableCell>
            <TableCell className="font-latin text-xs text-muted-foreground">
              {formatDateTime(snapshot.created_at)}
            </TableCell>
            <TableCell className="text-center">
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={() => handleDelete(snapshot.id)}
                disabled={deletingId === snapshot.id}
                title="削除"
              >
                {deletingId === snapshot.id ? "削除中..." : "削除"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
