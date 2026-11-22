"use client";
import "client-only";

import { useState } from "react";
import { Button } from "@/client/components/ui";
import { CounterpartDeletion } from "@/server/contexts/report/domain/models/counterpart";
import { deleteCounterpartAction } from "@/server/contexts/report/presentation/actions/delete-counterpart";

interface DeleteCounterpartButtonProps {
  counterpartId: string;
  counterpartName: string;
  usageCount: number;
  onDelete: () => void;
}

export function DeleteCounterpartButton({
  counterpartId,
  counterpartName,
  usageCount,
  onDelete,
}: DeleteCounterpartButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    // 使用中の取引先はサーバーが削除を拒否するので、確認の代わりにドメインの却下理由を出す
    const rejectionReason = CounterpartDeletion.rejectionReason(usageCount);
    if (rejectionReason) {
      alert(`「${counterpartName}」は削除できません。\n\n${rejectionReason}`);
      return;
    }

    if (!window.confirm(`「${counterpartName}」を削除しますか？`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await deleteCounterpartAction(counterpartId);

      if (result.success) {
        onDelete();
      } else {
        alert(result.errors?.join(", ") ?? "削除に失敗しました");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="xs"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "削除中..." : "削除"}
    </Button>
  );
}
