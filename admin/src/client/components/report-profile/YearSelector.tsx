"use client";
import "client-only";

import { useRouter } from "next/navigation";
import { Label, NativeSelect } from "@/client/components/ui";

interface YearSelectorProps {
  orgId: string;
  financialYear: number;
  currentYear: number;
}

export function YearSelector({ orgId, financialYear, currentYear }: YearSelectorProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="financial-year" className="text-xs font-bold">
        報告年
      </Label>
      <NativeSelect
        id="financial-year"
        key={financialYear}
        className="font-latin w-32"
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
      </NativeSelect>
    </div>
  );
}
