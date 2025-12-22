"use client";
import "client-only";

import { useState } from "react";
import { Button } from "@/client/components/ui";
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
    const message =
      usageCount > 0
        ? `「${counterpartName}」を削除しますか？\n\nこの取引先は${usageCount}件のTransactionで使用されています。\n削除すると、これらのTransactionの紐付けが解除されます。`
        : `「${counterpartName}」を削除しますか？`;

    if (!window.confirm(message)) {
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
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "削除中..." : "削除"}
    </Button>
  );
}
