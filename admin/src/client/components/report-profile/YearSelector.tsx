"use client";
import "client-only";

import { useRouter } from "next/navigation";
import { Label } from "@/client/components/ui";

interface YearSelectorProps {
  orgId: string;
  financialYear: number;
  currentYear: number;
}

export function YearSelector({ orgId, financialYear, currentYear }: YearSelectorProps) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Label>報告年</Label>
      <select
        key={financialYear}
        className="flex h-9 w-32 rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        defaultValue={financialYear}
        onChange={(e) => {
          router.push(`/political-organizations/${orgId}/report-profile?year=${e.target.value}`);
        }}
      >
        {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>
    </div>
  );
}
