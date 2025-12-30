"use client";
import "client-only";

import { useState, useId } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import type { DonorType } from "@/server/contexts/report/domain/models/donor";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  MAX_OCCUPATION_LENGTH,
  DONOR_TYPE_LABELS,
  VALID_DONOR_TYPES,
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
  onSubmit: (data: {
    donorType: DonorType;
    name: string;
    address: string | null;
    occupation: string | null;
  }) => Promise<void>;
  disabled?: boolean;
  submitLabel?: string;
}

export function DonorFormContent({
  mode,
  initialData,
  onSubmit,
  disabled = false,
  submitLabel,
}: DonorFormContentProps) {
  const [donorType, setDonorType] = useState<DonorType>(initialData?.donorType ?? "individual");
  const [name, setName] = useState(initialData?.name ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const donorTypeId = useId();
  const nameId = useId();
  const addressId = useId();
  const occupationId = useId();

  const isIndividual = donorType === "individual";
  const isFormValid = name.trim() !== "" && (!isIndividual || occupation.trim() !== "");

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
        occupation: isIndividual ? occupation.trim() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonorTypeChange = (newType: DonorType) => {
    setDonorType(newType);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-500 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor={donorTypeId}>
          種別 <span className="text-red-500">*</span>
        </Label>
        <select
          id={donorTypeId}
          value={donorType}
          onChange={(e) => handleDonorTypeChange(e.target.value as DonorType)}
          disabled={isDisabled}
          className="w-full bg-input text-white border border-border rounded-lg px-3 py-2.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {VALID_DONOR_TYPES.map((type) => (
            <option key={type} value={type}>
              {DONOR_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
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

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isDisabled || !isFormValid}>
          {isSubmitting ? loadingLabel : buttonLabel}
        </Button>
      </div>
    </form>
  );
}
