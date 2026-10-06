"use client";
import { useId, useState } from "react";
import { PayeeForm } from "@/client/components/research-fund/PayeeForm";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NativeSelect,
} from "@/client/components/ui";
import type { Payee, PayeeFormInput } from "@/server/contexts/research-fund/domain/models/payee";

/** 選択肢に出す支払先の表記。同名の支払先を住所で見分けられるようにする */
function payeeLabel(payee: Pick<Payee, "name" | "address">) {
  return payee.address ? `${payee.name}（${payee.address}）` : payee.name;
}

/**
 * 仕訳に支払先を紐づけるダイアログ。既存の支払先から選ぶか、その場で支払先を作成して紐づける。
 * 選べる支払先は帳簿の議員の支払先だけ（サーバーが渡したもの）。紐づけは「手動」として記録される。
 */
export function PayeeLinkDialog({
  open,
  onOpenChange,
  description,
  payees,
  currentPayeeId,
  defaultSearchQuery,
  pending,
  onLink,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  payees: readonly Payee[];
  /** 対象の仕訳に今紐づいている支払先（まちまちなら null） */
  currentPayeeId: string | null;
  /** 支払先を新規作成するときの AI 検索の初期値（仕訳の項目名） */
  defaultSearchQuery: string;
  pending: boolean;
  onLink: (payeeId: string | null) => void;
  onCreate: (input: PayeeFormInput) => void;
}) {
  const fieldId = useId();
  const [payeeId, setPayeeId] = useState(currentPayeeId ?? "");
  const [creating, setCreating] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creating ? "支払先を作成して紐づける" : "支払先を紐づける"}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {creating ? (
          <PayeeForm
            initial={null}
            defaultSearchQuery={defaultSearchQuery}
            pending={pending}
            submitLabel="作成して紐づける"
            onSubmit={onCreate}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${fieldId}-payee`}>支払先</Label>
              <NativeSelect
                id={`${fieldId}-payee`}
                wrapperClassName="w-full"
                value={payeeId}
                disabled={pending}
                onChange={(e) => setPayeeId(e.target.value)}
              >
                <option value="">未設定（紐づけを外す）</option>
                {payees.map((payee) => (
                  <option key={payee.id} value={payee.id}>
                    {payeeLabel(payee)}
                  </option>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="outline"
                className="self-start"
                disabled={pending}
                onClick={() => setCreating(true)}
              >
                新しい支払先を作成して紐づける
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={() => onLink(payeeId === "" ? null : payeeId)}
              >
                {payeeId === "" ? "紐づけを外す" : "紐づける"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
