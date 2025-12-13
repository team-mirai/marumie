"use client";
import "client-only";

import { useRouter } from "next/navigation";

interface YearSelectorProps {
  orgId: string;
  financialYear: number;
  currentYear: number;
}

export function YearSelector({
  orgId,
  financialYear,
  currentYear,
}: YearSelectorProps) {
  const router = useRouter();

  return (
    <label className="block font-medium text-white">
      報告年
      <select
        className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-32 mt-2 block font-normal"
        defaultValue={financialYear}
        onChange={(e) => {
          router.push(
            `/political-organizations/${orgId}/report-profile?year=${e.target.value}`,
          );
        }}
      >
        {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>
    </label>
  );
}
