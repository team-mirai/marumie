"use client";
import "client-only";

import { useState } from "react";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { deleteTransactionAction } from "@/server/contexts/data-import/presentation/actions/delete-transaction";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/client/components/ui";
import type { TransactionWithOrganization } from "@/server/contexts/shared/domain/transaction";
import { formatAmount, formatDate } from "@/client/lib";

interface DeleteTransactionButtonProps {
  transaction: TransactionWithOrganization;
  onDeleted?: () => void;
}

export function DeleteTransactionButton({ transaction, onDeleted }: DeleteTransactionButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const result = await deleteTransactionAction(transaction.id);

      if (result.success) {
        toast.success("取引を削除しました");
        setOpen(false);
        onDeleted?.();
      } else {
        toast.error(`削除に失敗しました: ${result.error}`);
      }
    } catch (err) {
      toast.error(`エラー: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-subtle-foreground hover:bg-transparent hover:text-destructive"
        onClick={() => setOpen(true)}
        aria-label="取引を削除"
      >
        <Trash className="size-4" />
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>取引を削除しますか？</DialogTitle>
          <DialogDescription>この操作は取り消せません。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <span className="text-muted-foreground">取引日</span>
            <span>{formatDate(transaction.transaction_date)}</span>
            <span className="text-muted-foreground">借方</span>
            <span>
              {transaction.debit_account} {formatAmount(transaction.debit_amount)}
            </span>
            <span className="text-muted-foreground">貸方</span>
            <span>
              {transaction.credit_account} {formatAmount(transaction.credit_amount)}
            </span>
            {transaction.description && (
              <>
                <span className="text-muted-foreground">摘要</span>
                <span>{transaction.description}</span>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "削除中..." : "削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
