"use client";
import "client-only";

import type { OrganizationReportProfileFormData } from "@/server/contexts/report/presentation/schemas/organization-report-profile.schema";
import { Card, CardHeader, CardTitle, CardContent, Label, Input } from "@/client/components/ui";

interface BasicInfoSectionProps {
  formData: OrganizationReportProfileFormData;
  updateFormData: (updates: Partial<OrganizationReportProfileFormData>) => void;
}

export function BasicInfoSection({ formData, updateFormData }: BasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>基本情報</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>
            団体名称
            <span className="text-muted-foreground text-sm ml-2">
              ({formData.officialName?.length ?? 0}/120)
            </span>
          </Label>
          <Input
            type="text"
            value={formData.officialName ?? ""}
            onChange={(e) => updateFormData({ officialName: e.target.value })}
            maxLength={120}
            className="bg-input max-w-md"
            placeholder="政治団体の正式名称"
          />
        </div>

        <div className="space-y-2">
          <Label>
            団体名称（カナ）
            <span className="text-muted-foreground text-sm ml-2">
              ({formData.officialNameKana?.length ?? 0}/120)
            </span>
          </Label>
          <Input
            type="text"
            value={formData.officialNameKana ?? ""}
            onChange={(e) => updateFormData({ officialNameKana: e.target.value })}
            maxLength={120}
            className="bg-input max-w-md"
            placeholder="セイジダンタイノセイシキメイショウ"
          />
        </div>

        <div className="space-y-2">
          <Label>
            事務所所在地
            <span className="text-muted-foreground text-sm ml-2">
              ({formData.officeAddress?.length ?? 0}/80)
            </span>
          </Label>
          <Input
            type="text"
            value={formData.officeAddress ?? ""}
            onChange={(e) => updateFormData({ officeAddress: e.target.value })}
            maxLength={80}
            className="bg-input max-w-md"
            placeholder="東京都千代田区永田町1-1-1"
          />
        </div>

        <div className="space-y-2">
          <Label>
            建物名等
            <span className="text-muted-foreground text-sm ml-2">
              ({formData.officeAddressBuilding?.length ?? 0}/60)
            </span>
          </Label>
          <Input
            type="text"
            value={formData.officeAddressBuilding ?? ""}
            onChange={(e) => updateFormData({ officeAddressBuilding: e.target.value })}
            maxLength={60}
            className="bg-input max-w-md"
            placeholder="○○ビル3階"
          />
        </div>
      </CardContent>
    </Card>
  );
}
