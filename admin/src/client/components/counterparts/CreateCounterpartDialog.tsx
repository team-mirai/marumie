"use client";
import "client-only";

import { useState, useEffect, useCallback } from "react";
import { createCounterpartAction } from "@/server/contexts/report/presentation/actions/create-counterpart";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";
import { Button, Input, Label } from "@/client/components/ui";

interface CreateCounterpartDialogProps {
  onClose: () => void;
  onCreate: () => void;
}

export function CreateCounterpartDialog({ onClose, onCreate }: CreateCounterpartDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = name.trim() !== "";

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await createCounterpartAction({
        name: name.trim(),
        address: address.trim() || null,
      });

      if (result.success) {
        onCreate();
      } else {
        setError(result.errors?.join(", ") ?? "作成に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">新規取引先作成</h2>

        {error && (
          <div className="text-red-500 mb-4 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="create-name">
              名前 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="取引先名を入力"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="create-address">住所</Label>
            <Input
              type="text"
              id="create-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={MAX_ADDRESS_LENGTH}
              placeholder="住所を入力（任意）"
              disabled={isLoading}
            />
          </div>

          <p className="text-muted-foreground text-sm">
            ※ 同じ名前・住所の組み合わせは登録できません
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !isFormValid}>
              {isLoading ? "作成中..." : "作成"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
