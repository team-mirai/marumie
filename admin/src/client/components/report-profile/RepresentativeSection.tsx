"use client";
import "client-only";

import type { OrganizationReportProfileDetails } from "@/server/contexts/report/domain/models/organization-report-profile";

interface RepresentativeSectionProps {
  details: OrganizationReportProfileDetails;
  updateDetails: (updates: Partial<OrganizationReportProfileDetails>) => void;
}

export function RepresentativeSection({ details, updateDetails }: RepresentativeSectionProps) {
  const representative = details.representative ?? {
    lastName: "",
    firstName: "",
  };
  const accountant = details.accountant ?? { lastName: "", firstName: "" };

  return (
    <div className="bg-primary-hover rounded-lg p-4">
      <h2 className="text-lg font-semibold text-white mb-4">代表者・会計責任者</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-md font-medium text-white mb-2">代表者</h3>
          <div className="flex gap-4">
            <label className="flex-1 block text-sm text-primary-muted">
              姓
              <input
                type="text"
                value={representative.lastName}
                onChange={(e) =>
                  updateDetails({
                    representative: {
                      ...representative,
                      lastName: e.target.value,
                    },
                  })
                }
                maxLength={30}
                className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                placeholder="山田"
              />
            </label>
            <label className="flex-1 block text-sm text-primary-muted">
              名
              <input
                type="text"
                value={representative.firstName}
                onChange={(e) =>
                  updateDetails({
                    representative: {
                      ...representative,
                      firstName: e.target.value,
                    },
                  })
                }
                maxLength={30}
                className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                placeholder="太郎"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-md font-medium text-white mb-2">会計責任者</h3>
          <div className="flex gap-4">
            <label className="flex-1 block text-sm text-primary-muted">
              姓
              <input
                type="text"
                value={accountant.lastName}
                onChange={(e) =>
                  updateDetails({
                    accountant: { ...accountant, lastName: e.target.value },
                  })
                }
                maxLength={30}
                className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                placeholder="鈴木"
              />
            </label>
            <label className="flex-1 block text-sm text-primary-muted">
              名
              <input
                type="text"
                value={accountant.firstName}
                onChange={(e) =>
                  updateDetails({
                    accountant: { ...accountant, firstName: e.target.value },
                  })
                }
                maxLength={30}
                className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                placeholder="花子"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
