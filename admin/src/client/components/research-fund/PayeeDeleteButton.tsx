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
import {
  payeeDeletionRejection,
  type Payee,
  type PayeeDeletionImpact,
} from "@/server/contexts/research-fund/domain/models/payee";
import { deletePayee } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/**
 * 支払先の詳細ページから支払先を消す。確認ダイアログで未設定に戻る仕訳の件数を見せ、消したら一覧へ戻る。
 * 公開中の仕訳が紐づく支払先は、ダイアログで理由を見せて削除させない
 */
export function PayeeDeleteButton({
  payee,
  deletion,
  target,
}: {
  payee: Payee;
  /** 議員のすべての帳簿で数えた、削除の影響 */
  deletion: PayeeDeletionImpact;
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rejection = payeeDeletionRejection(deletion);

  function remove() {
    startTransition(async () => {
      try {
        const result = await deletePayee(target.politicianId, target.bookId, payee.id);
        if (!result.success) {
          toast.error(result.error);
          setOpen(false);
          router.refresh();
          return;
        }
        toast.success(
          result.unlinkedCount > 0
            ? `支払先「${payee.name}」を削除し、${result.unlinkedCount}件の仕訳の支払先を未設定にしました`
            : `支払先「${payee.name}」を削除しました`,
        );
        setOpen(false);
        router.push(`/politicians/${target.politicianId}/books/${target.bookId}/payees`);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
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
          {rejection ? (
            <>
              <DialogHeader>
                <DialogTitle>支払先「{payee.name}」は削除できません</DialogTitle>
                <DialogDescription>{rejection}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  閉じる
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>支払先「{payee.name}」を削除しますか？</DialogTitle>
                <DialogDescription>
                  {deletion.unlinkedCount > 0
                    ? `すべての帳簿でこの支払先に紐づいている${deletion.unlinkedCount}件の仕訳（下書き・確認済）は、支払先が未設定になります。仕訳のそれ以外の内容は変わりません。`
                    : "この支払先に紐づいている仕訳はありません。"}
                  記録された表記も一緒に消え、以後の書類の照合に使われません。この操作は取り消せません。
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
