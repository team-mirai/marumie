"use client";
import "client-only";

import { useState, useId } from "react";
import { Button, Input, Label, NativeSelect } from "@/client/components/ui";
import { FormErrorAlert } from "@/client/components/assignment/FormErrorAlert";
import {
  coerceDonorType,
  isDonorFormValid,
  resolveAllowedDonorTypes,
  toDonorFormSubmitData,
  type DonorFormSubmitData,
  type DonorFormValues,
} from "@/client/lib";
import type { DonorType } from "@/server/contexts/report/domain/models/donor";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_OCCUPATION_LENGTH,
  DONOR_TYPE_LABELS,
} from "@/server/contexts/report/domain/models/donor";

interface DonorFormContentProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    donorType: DonorType;
    name: string;
    address: string | null;
    occupation: string | null;
    usageCount?: number;
  };
  /** 新規作成時の名前の初期値（紐付けダイアログで取引の摘要を流し込む用途）。initialData があればそちらを優先する */
  defaultName?: string;
  onSubmit: (data: DonorFormSubmitData) => Promise<void>;
  disabled?: boolean;
  submitLabel?: string;
  /** 選択可能な種別を制限する（紐付け対象のカテゴリによる制約）。未指定・空配列なら全種別 */
  allowedDonorTypes?: DonorType[];
}

/**
 * 寄付者フォーム本体。寄付者マスタの作成・編集ダイアログと、寄付者紐付けダイアログの「新規作成」タブの両方から使う。
 * 種別が許可外になった場合は許可リストの先頭に自動補正して表示・送信する。
 */
export function DonorFormContent({
  mode,
  initialData,
  defaultName,
  onSubmit,
  disabled = false,
  submitLabel,
  allowedDonorTypes,
}: DonorFormContentProps) {
  const effectiveAllowedTypes = resolveAllowedDonorTypes(allowedDonorTypes);

  const [selectedDonorType, setSelectedDonorType] = useState<DonorType>(
    initialData?.donorType ?? effectiveAllowedTypes[0],
  );
  const [name, setName] = useState(initialData?.name ?? defaultName ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const donorTypeId = useId();
  const nameId = useId();
  const addressId = useId();
  const occupationId = useId();

  const donorType = coerceDonorType(selectedDonorType, effectiveAllowedTypes);
  const isIndividual = donorType === "individual";
  const values: DonorFormValues = { donorType, name, address, occupation };
  const isFormValid = isDonorFormValid(values);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || disabled || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(toDonorFormSubmitData(values));
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonorTypeChange = (newType: DonorType) => {
    setSelectedDonorType(newType);
    if (newType !== "individual") {
      setOccupation("");
    }
  };

  const isDisabled = disabled || isSubmitting;
  const defaultSubmitLabel = mode === "create" ? "作成" : "保存";
  const defaultLoadingLabel = mode === "create" ? "作成中..." : "保存中...";
  const buttonLabel = submitLabel ?? defaultSubmitLabel;
  const loadingLabel = submitLabel ? `${submitLabel}中...` : defaultLoadingLabel;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormErrorAlert message={error} />}

      <div className="space-y-2">
        <Label htmlFor={donorTypeId}>
          寄付者種別 <span className="text-destructive">*</span>
        </Label>
        <NativeSelect
          id={donorTypeId}
          value={donorType}
          onChange={(e) => handleDonorTypeChange(e.target.value as DonorType)}
          disabled={isDisabled}
          wrapperClassName="w-full"
        >
          {effectiveAllowedTypes.map((type) => (
            <option key={type} value={type}>
              {DONOR_TYPE_LABELS[type]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor={nameId}>
          名前 <span className="text-destructive">*</span>
        </Label>
        <Input
          type="text"
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="寄付者名を入力"
          disabled={isDisabled}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={addressId}>住所</Label>
        <Input
          type="text"
          id={addressId}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={MAX_ADDRESS_LENGTH}
          placeholder="住所を入力"
          disabled={isDisabled}
        />
      </div>

      {isIndividual && (
        <div className="space-y-2">
          <Label htmlFor={occupationId}>
            職業 <span className="text-destructive">*</span>
          </Label>
          <Input
            type="text"
            id={occupationId}
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            maxLength={MAX_OCCUPATION_LENGTH}
            placeholder="職業を入力"
            disabled={isDisabled}
            required
          />
          <p className="text-xs text-muted-foreground">
            個人からの寄附の場合、職業の記載が必要です
          </p>
        </div>
      )}

      {mode === "edit" && initialData?.usageCount !== undefined && (
        <p className="text-[13px] text-muted-foreground">
          使用状況: <span className="font-latin">{initialData.usageCount}</span>
          件の取引で使用中
        </p>
      )}

      {mode === "create" && (
        <p className="text-[13px] text-muted-foreground">
          ※ 同じ名前・住所・種別の組み合わせは登録できません
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isDisabled || !isFormValid}>
          {isSubmitting ? loadingLabel : buttonLabel}
        </Button>
      </div>
    </form>
  );
}
