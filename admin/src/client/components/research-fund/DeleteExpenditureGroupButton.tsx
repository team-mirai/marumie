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
import { deleteExpenditureGroup } from "@/server/contexts/research-fund/presentation/actions/manage-expenditure-groups";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/** 編集ページから支出群を消す。確認ダイアログを挟み、消したら一覧へ戻る */
export function DeleteExpenditureGroupButton({
  groupId,
  title,
  target,
}: {
  groupId: string;
  title: string;
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        const result = await deleteExpenditureGroup(target.politicianId, target.bookId, groupId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("支出群を削除しました");
        setOpen(false);
        router.push(
          `/politicians/${target.politicianId}/books/${target.bookId}/expenditure-groups`,
        );
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <Button variant="destructive" className="ml-auto" onClick={() => setOpen(true)}>
        <Trash size={13} />
        この支出群を削除
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title} を削除しますか？</DialogTitle>
            <DialogDescription>
              成果物と仕訳の紐づけも一緒に消えます。仕訳そのものは残り、他の支出群で選べるようになります。この操作は取り消せません。
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
