"use client";
import "client-only";

import { useState } from "react";
import { Button } from "@/client/components/ui";
import { deleteDonorAction } from "@/server/contexts/report/presentation/actions/delete-donor";

interface DeleteDonorButtonProps {
  donorId: string;
  donorName: string;
  usageCount: number;
  onDelete: () => void;
}

export function DeleteDonorButton({
  donorId,
  donorName,
  usageCount,
  onDelete,
}: DeleteDonorButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const message =
      usageCount > 0
        ? `「${donorName}」を削除しますか？\n\nこの寄付者は${usageCount}件のTransactionで使用されています。\n削除すると、これらのTransactionの紐付けが解除されます。`
        : `「${donorName}」を削除しますか？`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await deleteDonorAction(donorId);

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
