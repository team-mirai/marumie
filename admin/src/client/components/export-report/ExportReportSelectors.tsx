"use client";
import "client-only";

import { useRouter } from "next/navigation";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import {
  Card,
  Label,
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
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => handleYearChange(Number.parseInt(v, 10))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
