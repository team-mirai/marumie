"use client";
import "client-only";

import type { OrganizationReportProfileFormData } from "@/server/contexts/report/presentation/schemas/organization-report-profile.schema";

interface BasicInfoSectionProps {
  formData: OrganizationReportProfileFormData;
  updateFormData: (updates: Partial<OrganizationReportProfileFormData>) => void;
}

export function BasicInfoSection({
  formData,
  updateFormData,
}: BasicInfoSectionProps) {
  return (
    <div className="bg-primary-hover rounded-lg p-4">
      <h2 className="text-lg font-semibold text-white mb-4">基本情報</h2>

      <div className="space-y-4">
        <label className="block font-medium text-white">
          団体名称
          <span className="text-primary-muted text-sm ml-2">
            ({formData.officialName?.length ?? 0}/120)
          </span>
          <input
            type="text"
            value={formData.officialName ?? ""}
            onChange={(e) => updateFormData({ officialName: e.target.value })}
            maxLength={120}
            className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full max-w-md mt-2 block font-normal"
            placeholder="政治団体の正式名称"
          />
        </label>

        <label className="block font-medium text-white">
          団体名称（カナ）
          <span className="text-primary-muted text-sm ml-2">
            ({formData.officialNameKana?.length ?? 0}/120)
          </span>
          <input
            type="text"
            value={formData.officialNameKana ?? ""}
            onChange={(e) =>
              updateFormData({ officialNameKana: e.target.value })
            }
            maxLength={120}
            className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full max-w-md mt-2 block font-normal"
            placeholder="セイジダンタイノセイシキメイショウ"
          />
        </label>

        <label className="block font-medium text-white">
          事務所所在地
          <span className="text-primary-muted text-sm ml-2">
            ({formData.officeAddress?.length ?? 0}/80)
          </span>
          <input
            type="text"
            value={formData.officeAddress ?? ""}
            onChange={(e) => updateFormData({ officeAddress: e.target.value })}
            maxLength={80}
            className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full max-w-md mt-2 block font-normal"
            placeholder="東京都千代田区永田町1-1-1"
          />
        </label>

        <label className="block font-medium text-white">
          建物名等
          <span className="text-primary-muted text-sm ml-2">
            ({formData.officeAddressBuilding?.length ?? 0}/60)
          </span>
          <input
            type="text"
            value={formData.officeAddressBuilding ?? ""}
            onChange={(e) =>
              updateFormData({ officeAddressBuilding: e.target.value })
            }
            maxLength={60}
            className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full max-w-md mt-2 block font-normal"
            placeholder="○○ビル3階"
          />
        </label>
      </div>
    </div>
  );
}
