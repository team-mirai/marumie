"use client";
import "client-only";

import { useState, useId } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/client/components/ui";

interface BalanceSnapshotFormProps {
  politicalOrganizationId: string;
  onSubmit: (data: {
    politicalOrganizationId: string;
    snapshotDate: string;
    balance: number;
  }) => Promise<void>;
}

export default function BalanceSnapshotForm({
  politicalOrganizationId,
  onSubmit,
}: BalanceSnapshotFormProps) {
  const [snapshotDate, setSnapshotDate] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const dateInputId = useId();
  const balanceInputId = useId();

  const validateDate = (dateValue: string) => {
    if (!dateValue) {
      setDateError("");
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateValue);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      setDateError("未来の日付は登録できません");
      return false;
    }

    setDateError("");
    return true;
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSnapshotDate(newDate);
    validateDate(newDate);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!snapshotDate || !balance) return;

    // 送信前に再度日付をチェック
    if (!validateDate(snapshotDate)) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(""); // 前回のメッセージをクリア
    try {
      await onSubmit({
        politicalOrganizationId,
        snapshotDate,
        balance: parseFloat(balance),
      });

      // 成功時の処理
      setSuccessMessage("残高スナップショットが正常に登録されました");
      setSnapshotDate("");
      setBalance("");

      // 3秒後にメッセージを消す
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to create balance snapshot:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-4 items-start max-w-2xl">
        <div className="w-48">
          <label htmlFor={dateInputId} className="block text-sm font-medium text-white mb-2">
            残高日付:
          </label>
          <input
            id={dateInputId}
            type="date"
            value={snapshotDate}
            onChange={handleDateChange}
            className={`bg-primary-input text-white border rounded-lg px-3 py-2.5 w-full transition-colors duration-200 focus:outline-none focus:ring-2 [color-scheme:dark] ${
              dateError
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : "border-primary-border focus:ring-primary-accent focus:border-primary-accent"
            }`}
            required
          />
          {dateError && <p className="text-red-400 text-sm mt-1">{dateError}</p>}
        </div>

        <div className="w-48">
          <label htmlFor={balanceInputId} className="block text-sm font-medium text-white mb-2">
            残高 (円):
          </label>
          <input
            id={balanceInputId}
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
            className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-primary-accent"
            required
          />
        </div>

        <div className="mt-7">
          <Button type="submit" disabled={!snapshotDate || !balance || isSubmitting || !!dateError}>
            {isSubmitting ? "登録中..." : "残高を登録"}
          </Button>
        </div>
      </form>

      {successMessage && <div className="mt-4 text-green-400 text-sm">{successMessage}</div>}
    </div>
  );
}
