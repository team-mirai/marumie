"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PayeeForm } from "@/client/components/research-fund/PayeeForm";
import { Card, CardContent } from "@/client/components/ui";
import type { PayeeFormInput } from "@/server/contexts/research-fund/domain/models/payee";
import { savePayee } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/** 支払先を作成するページ。作成すると、作成した支払先の詳細ページに移動する */
export function PayeeCreateForm({
  target,
}: {
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const listPath = `/politicians/${target.politicianId}/books/${target.bookId}/payees`;
  function create(input: PayeeFormInput) {
    startTransition(async () => {
      try {
        const result = await savePayee(target.politicianId, target.bookId, null, input);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`支払先「${result.payee.name}」を作成しました`);
        router.push(`${listPath}/${result.payee.id}`);
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  return (
    <>
      <div className="mb-2.5">
        <Link
          href={listPath}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-active hover:underline"
        >
          <CaretLeft size={13} />
          支払先の一覧に戻る
        </Link>
      </div>
      <PageHeader
        label="Payee"
        title="支払先を追加"
        description="名称は必須です。郵便番号・住所はAI検索で入力を補助できます。"
      />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <PayeeForm
            initial={null}
            target={target}
            pending={pending}
            submitLabel="作成"
            onSubmit={create}
            onCancel={() => router.push(listPath)}
          />
        </CardContent>
      </Card>
    </>
  );
}
