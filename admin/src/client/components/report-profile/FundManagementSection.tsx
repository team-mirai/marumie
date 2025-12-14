"use client";
import "client-only";

import type {
  FundManagement,
  FundManagementPeriod,
  OrganizationReportProfileDetails,
} from "@/server/contexts/report/domain/models/organization-report-profile";

interface FundManagementSectionProps {
  details: OrganizationReportProfileDetails;
  updateDetails: (updates: Partial<OrganizationReportProfileDetails>) => void;
}

const generateId = () => crypto.randomUUID();

const emptyPeriod = (): FundManagementPeriod => ({
  id: generateId(),
  from: "",
  to: "",
});

export function FundManagementSection({
  details,
  updateDetails,
}: FundManagementSectionProps) {
  const fundManagement = details.fundManagement;
  const isEnabled = !!fundManagement;

  const toggleFundManagement = () => {
    if (isEnabled) {
      updateDetails({ fundManagement: undefined });
    } else {
      updateDetails({
        fundManagement: {
          publicPositionName: "",
          publicPositionType: undefined,
          applicant: { lastName: "", firstName: "" },
          periods: [],
        },
      });
    }
  };

  const updateFundManagement = (updates: Partial<FundManagement>) => {
    if (fundManagement) {
      updateDetails({
        fundManagement: { ...fundManagement, ...updates },
      });
    }
  };

  const addPeriod = () => {
    if (fundManagement && (fundManagement.periods?.length ?? 0) < 3) {
      updateFundManagement({
        periods: [...(fundManagement.periods ?? []), emptyPeriod()],
      });
    }
  };

  const removePeriod = (index: number) => {
    if (fundManagement) {
      const newPeriods = (fundManagement.periods ?? []).filter(
        (_, i) => i !== index,
      );
      updateFundManagement({ periods: newPeriods });
    }
  };

  const updatePeriod = (
    index: number,
    updates: Partial<FundManagementPeriod>,
  ) => {
    if (fundManagement) {
      const newPeriods = [...(fundManagement.periods ?? [])];
      newPeriods[index] = { ...newPeriods[index], ...updates };
      updateFundManagement({ periods: newPeriods });
    }
  };

  return (
    <div className="bg-primary-hover rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <input
          type="checkbox"
          id="fundManagementEnabled"
          checked={isEnabled}
          onChange={toggleFundManagement}
          className="w-4 h-4"
        />
        <label
          htmlFor="fundManagementEnabled"
          className="text-lg font-semibold text-white cursor-pointer"
        >
          資金管理団体情報
        </label>
      </div>

      {isEnabled && fundManagement && (
        <div className="space-y-4 pl-7">
          <label className="block font-medium text-white">
            公職の名称
            <input
              type="text"
              value={fundManagement.publicPositionName ?? ""}
              onChange={(e) =>
                updateFundManagement({ publicPositionName: e.target.value })
              }
              maxLength={60}
              className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 w-full max-w-md mt-2 block font-normal"
              placeholder="衆議院議員"
            />
          </label>

          <label className="block font-medium text-white">
            公職の種別
            <select
              value={fundManagement.publicPositionType ?? ""}
              onChange={(e) =>
                updateFundManagement({
                  publicPositionType: e.target.value as
                    | "1"
                    | "2"
                    | "3"
                    | "4"
                    | undefined,
                })
              }
              className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 mt-2 block font-normal"
            >
              <option value="">選択してください</option>
              <option value="1">現職</option>
              <option value="2">候補者</option>
              <option value="3">候補者となろうとする者</option>
              <option value="4">候補者等</option>
            </select>
          </label>

          <div>
            <h3 className="text-md font-medium text-white mb-2">届出者</h3>
            <div className="flex gap-4">
              <label className="flex-1 block text-sm text-primary-muted">
                姓
                <input
                  type="text"
                  value={fundManagement.applicant?.lastName ?? ""}
                  onChange={(e) =>
                    updateFundManagement({
                      applicant: {
                        ...fundManagement.applicant,
                        lastName: e.target.value,
                        firstName: fundManagement.applicant?.firstName ?? "",
                      },
                    })
                  }
                  maxLength={30}
                  className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                />
              </label>
              <label className="flex-1 block text-sm text-primary-muted">
                名
                <input
                  type="text"
                  value={fundManagement.applicant?.firstName ?? ""}
                  onChange={(e) =>
                    updateFundManagement({
                      applicant: {
                        ...fundManagement.applicant,
                        lastName: fundManagement.applicant?.lastName ?? "",
                        firstName: e.target.value,
                      },
                    })
                  }
                  maxLength={30}
                  className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-white">
                指定期間（最大3件）
              </h3>
              {(fundManagement.periods?.length ?? 0) < 3 && (
                <button
                  type="button"
                  onClick={addPeriod}
                  className="text-primary-accent hover:text-blue-400 text-sm"
                >
                  + 追加
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(fundManagement.periods ?? []).map((period, index) => (
                <div key={period.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={period.from}
                    onChange={(e) =>
                      updatePeriod(index, { from: e.target.value })
                    }
                    maxLength={20}
                    className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-32"
                    placeholder="R6/4/1"
                  />
                  <span className="text-white">〜</span>
                  <input
                    type="text"
                    value={period.to}
                    onChange={(e) =>
                      updatePeriod(index, { to: e.target.value })
                    }
                    maxLength={20}
                    className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-32"
                    placeholder="R7/3/31"
                  />
                  <button
                    type="button"
                    onClick={() => removePeriod(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
