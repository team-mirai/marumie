"use client";
import "client-only";

import { useState, useEffect, useCallback } from "react";
import { createCounterpartAction } from "@/server/contexts/report/presentation/actions/create-counterpart";
import {
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";

interface CreateCounterpartDialogProps {
  onClose: () => void;
  onCreate: () => void;
}

export function CreateCounterpartDialog({ onClose, onCreate }: CreateCounterpartDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!name.trim() || !address.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await createCounterpartAction({
        name: name.trim(),
        address: address.trim(),
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
      <div className="bg-primary-panel rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">新規取引先作成</h2>

        {error && (
          <div className="text-red-500 mb-4 p-3 bg-red-900/20 rounded-lg border border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="create-name" className="block mb-2 font-medium text-white">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-primary-accent"
              placeholder="取引先名を入力"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label htmlFor="create-address" className="block mb-2 font-medium text-white">
              住所 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="create-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={MAX_ADDRESS_LENGTH}
              className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-primary-accent"
              placeholder="住所を入力"
              disabled={isLoading}
              required
            />
          </div>

          <p className="text-primary-muted text-sm">※ 同じ名前・住所の組み合わせは登録できません</p>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="bg-primary-hover text-white border border-primary-border hover:bg-primary-border rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !address.trim()}
              className={`bg-primary-accent text-white border-0 rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 ${
                isLoading || !name.trim() || !address.trim()
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-blue-600 cursor-pointer"
              }`}
            >
              {isLoading ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
