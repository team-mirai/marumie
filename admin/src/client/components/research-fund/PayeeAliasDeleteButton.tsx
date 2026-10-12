"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui";
import { deletePayeeAlias } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/** 支払先の詳細ページから、支払先に記録された表記を消す。確認ダイアログを挟む */
export function PayeeAliasDeleteButton({
  payeeId,
  aliasId,
  name,
  target,
}: {
  payeeId: string;
  aliasId: string;
  name: string;
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        const result = await deletePayeeAlias(target.politicianId, target.bookId, payeeId, aliasId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`表記「${name}」を削除しました`);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        aria-label={`表記「${name}」を削除`}
        onClick={() => setOpen(true)}
      >
        <Trash size={13} />
        削除
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>表記「{name}」を削除しますか？</DialogTitle>
            <DialogDescription>
              これ以降にスキャンする書類は、この表記ではこの支払先に紐づかなくなります。紐づけ済みの仕訳はそのまま残ります。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
