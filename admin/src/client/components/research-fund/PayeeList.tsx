"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PayeeForm } from "@/client/components/research-fund/PayeeForm";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import type {
  PayeeFormInput,
  PayeeSummary,
} from "@/server/contexts/research-fund/domain/models/payee";
import { savePayee } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/**
 * 議員の支払先（支出を受けた者）の一覧・作成・編集。
 * 支払先は議員ごとに持ち、年度帳簿をまたいで同じ支払先を使う。編集すると紐づけた全仕訳に効く。
 */
export function PayeeList({
  payees,
  target,
}: {
  payees: readonly PayeeSummary[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // null = 閉じている / "new" = 作成 / 支払先 = 編集
  const [editing, setEditing] = useState<PayeeSummary | "new" | null>(null);
  function save(input: PayeeFormInput) {
    const id = editing === "new" || editing === null ? null : editing.id;
    startTransition(async () => {
      try {
        const result = await savePayee(target.politicianId, target.bookId, id, input);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          id === null
            ? `支払先「${result.payee.name}」を作成しました`
            : `支払先「${result.payee.name}」を保存しました`,
        );
        setEditing(null);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  return (
    <>
      <PageHeader
        label="Payees"
        title="支払先"
        description={`${target.name}の支払先（支出を受けた者）です。議員課に提出する帳簿の氏名・住所に使います。編集すると、紐づけたすべての仕訳に反映されます。`}
        actions={
          <Button disabled={pending} onClick={() => setEditing("new")}>
            <Plus />
            支払先を追加
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>郵便番号</TableHead>
                <TableHead>住所</TableHead>
                <TableHead>インボイス登録番号</TableHead>
                <TableHead className="text-right">仕訳</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payees.map((payee) => (
                <TableRow key={payee.id}>
                  <TableCell className="font-bold">{payee.name}</TableCell>
                  <TableCell className="font-latin whitespace-nowrap">
                    {payee.postalCode ?? <span className="text-muted-foreground">未入力</span>}
                  </TableCell>
                  <TableCell>
                    {payee.address || <span className="text-muted-foreground">未入力</span>}
                  </TableCell>
                  <TableCell className="font-latin whitespace-nowrap">
                    {payee.invoiceRegistrationNumber ?? (
                      <span className="text-muted-foreground">未入力</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-latin">{payee.usageCount}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setEditing(payee)}
                    >
                      編集
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {payees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                    支払先はまだありません。「支払先を追加」か、仕訳の確認画面から作成できます。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!pending && !open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "支払先を追加" : "支払先を編集"}</DialogTitle>
            <DialogDescription>
              {editing !== null && editing !== "new" && editing.usageCount > 0
                ? `この支払先に紐づいた${editing.usageCount}件の仕訳にも反映されます。`
                : "名称は必須です。郵便番号・住所はAI検索で入力を補助できます。"}
            </DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <PayeeForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              pending={pending}
              submitLabel={editing === "new" ? "作成" : "保存"}
              onSubmit={save}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
