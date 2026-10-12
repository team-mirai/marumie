"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PayeeForm } from "@/client/components/research-fund/PayeeForm";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui";
import type { Payee, PayeeFormInput } from "@/server/contexts/research-fund/domain/models/payee";
import { savePayee } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/** 支払先の詳細ページから支払先を編集するボタンとダイアログ */
export function PayeeEditButton({
  payee,
  usageCount,
  target,
}: {
  payee: Payee;
  /** 選択中の帳簿でこの支払先に紐づいた仕訳の件数 */
  usageCount: number;
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  function save(input: PayeeFormInput) {
    startTransition(async () => {
      try {
        const result = await savePayee(target.politicianId, target.bookId, payee.id, input);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`支払先「${result.payee.name}」を保存しました`);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  return (
    <>
      <Button disabled={pending} onClick={() => setOpen(true)}>
        編集
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending && !next) setOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>支払先を編集</DialogTitle>
            <DialogDescription>
              {usageCount > 0
                ? `この帳簿でこの支払先に紐づいた${usageCount}件の仕訳を含め、紐づけたすべての仕訳に反映されます。`
                : "編集すると、紐づけたすべての仕訳に反映されます。"}
            </DialogDescription>
          </DialogHeader>
          {open && (
            <PayeeForm
              key={`${payee.id}:${payee.name}:${payee.address}`}
              initial={payee}
              pending={pending}
              submitLabel="保存"
              onSubmit={save}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
