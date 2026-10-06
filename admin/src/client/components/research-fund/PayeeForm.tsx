"use client";
import { useId, useState } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import {
  AddressInput,
  type CounterpartSearchResult,
} from "@/client/components/counterparts/AddressInput";
import {
  PAYEE_ADDRESS_MAX_LENGTH,
  PAYEE_INVOICE_NUMBER_INPUT_MAX_LENGTH,
  PAYEE_NAME_MAX_LENGTH,
  PAYEE_POSTAL_CODE_INPUT_MAX_LENGTH,
  type Payee,
  type PayeeFormInput,
} from "@/server/contexts/research-fund/domain/models/payee";

/**
 * 支払先の作成・編集フォーム。
 *
 * 住所は政治資金の取引先画面と同じ AI 検索（AddressInput）で、名称から郵便番号と住所を引いて入力できる。
 * 入力の検証と正規化（郵便番号・インボイス登録番号の表記ゆれの吸収）はサーバー側のドメインで行う。
 */
export function PayeeForm({
  initial,
  defaultSearchQuery,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Payee | null;
  /** AI 検索の初期値（仕訳の項目名など） */
  defaultSearchQuery?: string;
  pending: boolean;
  submitLabel: string;
  onSubmit: (input: PayeeFormInput) => void;
  onCancel?: () => void;
}) {
  const fieldId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [invoiceRegistrationNumber, setInvoiceRegistrationNumber] = useState(
    initial?.invoiceRegistrationNumber ?? "",
  );
  function select(result: CounterpartSearchResult) {
    setName(result.name);
    setPostalCode(result.postalCode ?? "");
    setAddress(result.address);
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending && name.trim() !== "")
          onSubmit({ name, postalCode, address, invoiceRegistrationNumber });
      }}
    >
      <AddressInput
        defaultSearchQuery={defaultSearchQuery ?? initial?.name ?? ""}
        onSelect={select}
        disabled={pending}
      />
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-name`}>
          名称 <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${fieldId}-name`}
          value={name}
          maxLength={PAYEE_NAME_MAX_LENGTH}
          placeholder="支出を受けた者の氏名（団体にあってはその名称）"
          disabled={pending}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-postal-code`}>郵便番号</Label>
        <Input
          id={`${fieldId}-postal-code`}
          value={postalCode}
          maxLength={PAYEE_POSTAL_CODE_INPUT_MAX_LENGTH}
          placeholder="例: 123-4567"
          disabled={pending}
          onChange={(e) => setPostalCode(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-address`}>住所</Label>
        <Input
          id={`${fieldId}-address`}
          value={address}
          maxLength={PAYEE_ADDRESS_MAX_LENGTH}
          placeholder="住所（団体にあっては主たる事務所の所在地）"
          disabled={pending}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-invoice`}>インボイス登録番号</Label>
        <Input
          id={`${fieldId}-invoice`}
          value={invoiceRegistrationNumber}
          maxLength={PAYEE_INVOICE_NUMBER_INPUT_MAX_LENGTH}
          placeholder="例: T1234567890123"
          disabled={pending}
          onChange={(e) => setInvoiceRegistrationNumber(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        同じ名称・住所の支払先は登録できません。人が作成・編集した支払先は確認済みとして扱います。
      </p>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            キャンセル
          </Button>
        )}
        <Button type="submit" disabled={pending || name.trim() === ""}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
