"use client";
import "client-only";

import { useRouter } from "next/navigation";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui";
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
    <div className="flex flex-wrap items-center gap-3">
      <PoliticalOrganizationSelect
        organizations={organizations}
        value={selectedOrgId}
        onValueChange={handleOrganizationChange}
        required
        hideLabel
      />
      <Select
        value={selectedYear.toString()}
        onValueChange={(v) => handleYearChange(Number.parseInt(v, 10))}
      >
        <SelectTrigger aria-label="報告年 (西暦)" className="border-[1.5px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
            <SelectItem key={y} value={y.toString()}>
              <span className="font-latin">{y}</span>年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
