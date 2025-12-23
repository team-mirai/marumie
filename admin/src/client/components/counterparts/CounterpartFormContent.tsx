"use client";
import "client-only";

import { useState, useId } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import { AddressInput } from "@/client/components/counterparts/AddressInput";
import { MAX_NAME_LENGTH } from "@/server/contexts/report/domain/models/counterpart";

interface CounterpartFormContentProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    address: string | null;
    usageCount?: number;
  };
  defaultName?: string;
  onSubmit: (data: { name: string; address: string | null }) => Promise<void>;
  disabled?: boolean;
  /** 送信ボタンのラベルをカスタマイズ（デフォルト: 作成/保存） */
  submitLabel?: string;
}

export function CounterpartFormContent({
  mode,
  initialData,
  defaultName,
  onSubmit,
  disabled = false,
  submitLabel,
}: CounterpartFormContentProps) {
  const [name, setName] = useState(initialData?.name ?? defaultName ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();

  const isFormValid = name.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || disabled || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        address: address.trim() || null,
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
        <Label htmlFor={nameId}>
          名前 <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="取引先名を入力"
          disabled={isDisabled}
          required
        />
      </div>

      <AddressInput
        companyName={name}
        address={address}
        onChange={setAddress}
        disabled={isDisabled}
      />

      {mode === "edit" && initialData?.usageCount !== undefined && (
        <div className="text-muted-foreground text-sm">
          使用状況: {initialData.usageCount}件のTransactionで使用中
        </div>
      )}

      {mode === "create" && (
        <p className="text-muted-foreground text-sm">
          ※ 同じ名前・住所の組み合わせは登録できません
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
