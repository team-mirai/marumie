"use client";
import "client-only";

import { useState } from "react";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import { updateCounterpartAction } from "@/server/contexts/report/presentation/actions/update-counterpart";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";
import { Button, Input, Label } from "@/client/components/ui";

interface EditCounterpartDialogProps {
  counterpart: CounterpartWithUsage;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditCounterpartDialog({
  counterpart,
  onClose,
  onUpdate,
}: EditCounterpartDialogProps) {
  const [name, setName] = useState(counterpart.name);
  const [address, setAddress] = useState(counterpart.address ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await updateCounterpartAction(counterpart.id, {
        name: name.trim(),
        address: address.trim(),
      });

      if (result.success) {
        onUpdate();
      } else {
        setError(result.errors?.join(", ") ?? "更新に失敗しました");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">取引先編集</h2>

        {error && (
          <div className="text-red-500 mb-4 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">
              名前 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="取引先名を入力"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-address">
              住所 <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              id="edit-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={MAX_ADDRESS_LENGTH}
              placeholder="住所を入力"
              disabled={isLoading}
              required
            />
          </div>

          <div className="text-muted-foreground text-sm">
            使用状況: {counterpart.usageCount}件のTransactionで使用中
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !address.trim()}>
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
