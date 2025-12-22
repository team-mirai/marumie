"use client";
import "client-only";

import { useState } from "react";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import { createCounterpartAction } from "@/server/contexts/report/presentation/actions/create-counterpart";
import { updateCounterpartAction } from "@/server/contexts/report/presentation/actions/update-counterpart";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/client/components/ui";
import { CounterpartForm } from "@/client/components/counterparts/CounterpartForm";

type CounterpartFormDialogProps =
  | {
      mode: "create";
      onClose: () => void;
      onSuccess: () => void;
    }
  | {
      mode: "edit";
      counterpart: CounterpartWithUsage;
      onClose: () => void;
      onSuccess: () => void;
    };

export function CounterpartFormDialog(props: CounterpartFormDialogProps) {
  const { mode, onClose, onSuccess } = props;
  const counterpart = mode === "edit" ? props.counterpart : null;

  const [name, setName] = useState(counterpart?.name ?? "");
  const [address, setAddress] = useState(counterpart?.address ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = name.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsLoading(true);
      setError(null);

      if (mode === "create") {
        const result = await createCounterpartAction({
          name: name.trim(),
          address: address.trim() || null,
        });

        if (result.success) {
          onSuccess();
        } else {
          setError(result.errors?.join(", ") ?? "作成に失敗しました");
        }
      } else if (counterpart) {
        const result = await updateCounterpartAction(counterpart.id, {
          name: name.trim(),
          address: address.trim() || null,
        });

        if (result.success) {
          onSuccess();
        } else {
          setError(result.errors?.join(", ") ?? "更新に失敗しました");
        }
      }
    } catch (err) {
      const errorMessage = mode === "create" ? "作成に失敗しました" : "更新に失敗しました";
      setError(err instanceof Error ? err.message : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onClose();
    }
  };

  const title = mode === "create" ? "新規取引先作成" : "取引先編集";
  const submitLabel = mode === "create" ? "作成" : "保存";
  const loadingLabel = mode === "create" ? "作成中..." : "保存中...";

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-red-500 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CounterpartForm
            name={name}
            onNameChange={setName}
            address={address}
            onAddressChange={setAddress}
            disabled={isLoading}
          />

          {mode === "edit" && counterpart && (
            <div className="text-muted-foreground text-sm mt-4">
              使用状況: {counterpart.usageCount}件のTransactionで使用中
            </div>
          )}

          {mode === "create" && (
            <p className="text-muted-foreground text-sm mt-4">
              ※ 同じ名前・住所の組み合わせは登録できません
            </p>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !isFormValid}>
              {isLoading ? loadingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
