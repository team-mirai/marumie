"use client";
import "client-only";

import { useState, useId, useEffect } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  MAX_NAME_LENGTH,
  MAX_OCCUPATION_LENGTH,
  MAX_ADDRESS_LENGTH,
  DONOR_TYPE_LABELS,
  type DonorType,
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
  defaultName?: string;
  onSubmit: (data: {
    donorType: DonorType;
    name: string;
    address: string | null;
    occupation: string | null;
  }) => Promise<void>;
  disabled?: boolean;
  submitLabel?: string;
  allowedDonorTypes?: DonorType[];
}

const ALL_DONOR_TYPES: DonorType[] = ["individual", "corporation", "political_organization"];

export function DonorFormContent({
  mode,
  initialData,
  defaultName,
  onSubmit,
  disabled = false,
  submitLabel,
  allowedDonorTypes = ALL_DONOR_TYPES,
}: DonorFormContentProps) {
  const effectiveAllowedTypes = allowedDonorTypes.length > 0 ? allowedDonorTypes : ALL_DONOR_TYPES;
  const defaultDonorType = initialData?.donorType ?? effectiveAllowedTypes[0];

  const [donorType, setDonorType] = useState<DonorType>(defaultDonorType);
  const [name, setName] = useState(initialData?.name ?? defaultName ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const occupationId = useId();
  const donorTypeId = useId();

  useEffect(() => {
    if (!effectiveAllowedTypes.includes(donorType)) {
      setDonorType(effectiveAllowedTypes[0]);
    }
  }, [effectiveAllowedTypes, donorType]);

  const isFormValid =
    name.trim() !== "" && (donorType !== "individual" || occupation.trim() !== "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || disabled || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        donorType,
        name: name.trim(),
        address: address.trim() || null,
        occupation: donorType === "individual" ? occupation.trim() || null : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || isSubmitting;
  const defaultSubmitLabel = mode === "create" ? "作成" : "保存";
  const defaultLoadingLabel = mode === "create" ? "作成中..." : "保存中...";
  const buttonLabel = submitLabel ?? defaultSubmitLabel;
  const loadingLabel = submitLabel ? `${submitLabel}中...` : defaultLoadingLabel;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-500 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor={donorTypeId}>
          寄付者種別 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={donorType}
          onValueChange={(v) => setDonorType(v as DonorType)}
          disabled={isDisabled}
        >
          <SelectTrigger id={donorTypeId} className="w-full">
            <SelectValue placeholder="種別を選択" />
          </SelectTrigger>
          <SelectContent>
            {effectiveAllowedTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {DONOR_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor={nameId}>
          名前 <span className="text-red-500">*</span>
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

      <div>
        <Label htmlFor="address">住所</Label>
        <Input
          type="text"
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={MAX_ADDRESS_LENGTH}
          placeholder="住所を入力"
          disabled={isDisabled}
        />
      </div>

      {donorType === "individual" && (
        <div>
          <Label htmlFor={occupationId}>
            職業 <span className="text-red-500">*</span>
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
          <p className="text-muted-foreground text-xs mt-1">
            個人からの寄附の場合、職業の記載が必要です
          </p>
        </div>
      )}

      {mode === "edit" && initialData?.usageCount !== undefined && (
        <div className="text-muted-foreground text-sm">
          使用状況: {initialData.usageCount}件のTransactionで使用中
        </div>
      )}

      {mode === "create" && (
        <p className="text-muted-foreground text-sm">
          ※ 同じ名前・住所・種別の組み合わせは登録できません
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isDisabled || !isFormValid}>
          {isSubmitting ? loadingLabel : buttonLabel}
        </Button>
      </div>
    </form>
  );
}
