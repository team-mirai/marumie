"use client";
import "client-only";

import { useRouter } from "next/navigation";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import { Card, Label } from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";

interface ExportReportSelectorsProps {
  organizations: PoliticalOrganization[];
  selectedOrgId: string;
  selectedYear: number;
  currentYear: number;
}

export function ExportReportSelectors({
  organizations,
  selectedOrgId,
  selectedYear,
  currentYear,
}: ExportReportSelectorsProps) {
  const router = useRouter();

  function handleOrganizationChange(orgId: string) {
    router.push(`/export-report/${orgId}/${selectedYear}`);
  }

  function handleYearChange(year: number) {
    router.push(`/export-report/${selectedOrgId}/${year}`);
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="w-fit">
          <PoliticalOrganizationSelect
            organizations={organizations}
            value={selectedOrgId}
            onValueChange={handleOrganizationChange}
            required
          />
        </div>
        <div className="w-fit space-y-2">
          <Label>報告年 (西暦)</Label>
          <select
            key={selectedYear}
            className="flex h-9 w-32 rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            defaultValue={selectedYear}
            onChange={(e) => handleYearChange(Number.parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}
