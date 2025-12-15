"use client";
import "client-only";

import type { OrganizationReportProfileDetails } from "@/server/contexts/report/domain/models/organization-report-profile";

interface OrganizationTypeSectionProps {
  details: OrganizationReportProfileDetails;
  updateDetails: (updates: Partial<OrganizationReportProfileDetails>) => void;
}

export function OrganizationTypeSection({ details, updateDetails }: OrganizationTypeSectionProps) {
  return (
    <div className="bg-primary-hover rounded-lg p-4">
      <h2 className="text-lg font-semibold text-white mb-4">団体区分・活動区域</h2>

      <div className="space-y-4">
        <div>
          <label className="block font-medium text-white">
            団体区分（2桁コード）
            <input
              type="text"
              value={details.organizationType ?? ""}
              onChange={(e) => updateDetails({ organizationType: e.target.value })}
              maxLength={2}
              className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-24 mt-2 block font-normal"
              placeholder="01"
            />
          </label>
          <p className="text-primary-muted text-sm mt-1">
            総務省の団体区分コードを入力してください
          </p>
        </div>

        <label className="block font-medium text-white">
          活動区域
          <select
            value={details.activityArea ?? ""}
            onChange={(e) =>
              updateDetails({
                activityArea: e.target.value as "1" | "2" | undefined,
              })
            }
            className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 mt-2 block font-normal"
          >
            <option value="">選択してください</option>
            <option value="1">二以上の都道府県の区域</option>
            <option value="2">一つの都道府県の区域</option>
          </select>
        </label>

        <div>
          <label className="block font-medium text-white">
            特定パーティー開催日（和暦）
            <input
              type="text"
              value={details.specificPartyDate ?? ""}
              onChange={(e) => updateDetails({ specificPartyDate: e.target.value })}
              maxLength={20}
              className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-40 mt-2 block font-normal"
              placeholder="R6/4/1"
            />
          </label>
          <p className="text-primary-muted text-sm mt-1">該当する場合のみ入力（例: R6/4/1）</p>
        </div>
      </div>
    </div>
  );
}
