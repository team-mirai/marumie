"use client";
import "client-only";

import type { OrganizationReportProfileDetails } from "@/server/contexts/report/domain/models/organization-report-profile";
import { Card, CardHeader, CardTitle, CardContent, Label, Input } from "@/client/components/ui";

interface OrganizationTypeSectionProps {
  details: OrganizationReportProfileDetails;
  updateDetails: (updates: Partial<OrganizationReportProfileDetails>) => void;
}

export function OrganizationTypeSection({ details, updateDetails }: OrganizationTypeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>団体区分・活動区域</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>団体区分（2桁コード）</Label>
          <Input
            type="text"
            value={details.organizationType ?? ""}
            onChange={(e) => updateDetails({ organizationType: e.target.value })}
            maxLength={2}
            className="bg-input w-24"
            placeholder="01"
          />
          <p className="text-muted-foreground text-sm">総務省の団体区分コードを入力してください</p>
        </div>

        <div className="space-y-2">
          <Label>活動区域</Label>
          <select
            value={details.activityArea ?? ""}
            onChange={(e) =>
              updateDetails({
                activityArea: e.target.value as "1" | "2" | undefined,
              })
            }
            className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">選択してください</option>
            <option value="1">二以上の都道府県の区域</option>
            <option value="2">一つの都道府県の区域</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>特定パーティー開催日（和暦）</Label>
          <Input
            type="text"
            value={details.specificPartyDate ?? ""}
            onChange={(e) => updateDetails({ specificPartyDate: e.target.value })}
            maxLength={20}
            className="bg-input w-40"
            placeholder="R6/4/1"
          />
          <p className="text-muted-foreground text-sm">該当する場合のみ入力（例: R6/4/1）</p>
        </div>
      </CardContent>
    </Card>
  );
}
