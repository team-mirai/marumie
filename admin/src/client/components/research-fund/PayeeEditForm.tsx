"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PayeeForm } from "@/client/components/research-fund/PayeeForm";
import { Card, CardContent } from "@/client/components/ui";
import type { Payee, PayeeFormInput } from "@/server/contexts/research-fund/domain/models/payee";
import { savePayee } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/** 支払先の詳細ページで、ページ上のフォームから支払先を編集する */
export function PayeeEditForm({
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
  function save(input: PayeeFormInput) {
    startTransition(async () => {
      try {
        const result = await savePayee(target.politicianId, target.bookId, payee.id, input);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`支払先「${result.payee.name}」を保存しました`);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  return (
    <Card className="mb-6 max-w-2xl">
      <CardContent className="space-y-4 p-6">
        <p className="text-xs text-muted-foreground">
          {usageCount > 0
            ? `この帳簿でこの支払先に紐づいた${usageCount}件の仕訳を含め、紐づけたすべての仕訳に反映されます。`
            : "保存すると、紐づけたすべての仕訳に反映されます。"}
        </p>
        {/* 保存後にサーバーで正規化された値（郵便番号・インボイス登録番号の表記など）でフォームを初期化し直す */}
        <PayeeForm
          key={`${payee.id}:${payee.name}:${payee.postalCode}:${payee.address}:${payee.invoiceRegistrationNumber}`}
          initial={payee}
          target={target}
          pending={pending}
          submitLabel="保存"
          onSubmit={save}
        />
      </CardContent>
    </Card>
  );
}
