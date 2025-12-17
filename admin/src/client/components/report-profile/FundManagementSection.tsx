"use client";
import "client-only";

import type {
  FundManagement,
  FundManagementPeriod,
  OrganizationReportProfileDetails,
} from "@/server/contexts/report/domain/models/organization-report-profile";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Label,
  Input,
  Checkbox,
} from "@/client/components/ui";

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

export function FundManagementSection({ details, updateDetails }: FundManagementSectionProps) {
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
      const newPeriods = (fundManagement.periods ?? []).filter((_, i) => i !== index);
      updateFundManagement({ periods: newPeriods });
    }
  };

  const updatePeriod = (index: number, updates: Partial<FundManagementPeriod>) => {
    if (fundManagement) {
      const newPeriods = [...(fundManagement.periods ?? [])];
      newPeriods[index] = { ...newPeriods[index], ...updates };
      updateFundManagement({ periods: newPeriods });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Checkbox
            id="fundManagementEnabled"
            checked={isEnabled}
            onCheckedChange={toggleFundManagement}
          />
          <label
            htmlFor="fundManagementEnabled"
            className="text-lg font-semibold text-foreground cursor-pointer"
          >
            資金管理団体情報
          </label>
        </div>
      </CardHeader>

      {isEnabled && fundManagement && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>公職の名称</Label>
            <Input
              type="text"
              value={fundManagement.publicPositionName ?? ""}
              onChange={(e) => updateFundManagement({ publicPositionName: e.target.value })}
              maxLength={60}
              className="bg-input max-w-md"
              placeholder="衆議院議員"
            />
          </div>

          <div className="space-y-2">
            <Label>公職の種別</Label>
            <select
              value={fundManagement.publicPositionType ?? ""}
              onChange={(e) =>
                updateFundManagement({
                  publicPositionType: e.target.value as "1" | "2" | "3" | "4" | undefined,
                })
              }
              className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm max-w-md"
            >
              <option value="">選択してください</option>
              <option value="1">現職</option>
              <option value="2">候補者</option>
              <option value="3">候補者となろうとする者</option>
              <option value="4">候補者等</option>
            </select>
          </div>

          <div>
            <h3 className="text-md font-medium text-foreground mb-2">届出者</h3>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-muted-foreground">姓</Label>
                <Input
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
                  className="bg-input"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-muted-foreground">名</Label>
                <Input
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
                  className="bg-input"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-foreground">指定期間（最大3件）</h3>
              {(fundManagement.periods?.length ?? 0) < 3 && (
                <Button type="button" variant="ghost" size="sm" onClick={addPeriod}>
                  + 追加
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {(fundManagement.periods ?? []).map((period, index) => (
                <div key={period.id} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={period.from}
                    onChange={(e) => updatePeriod(index, { from: e.target.value })}
                    maxLength={20}
                    className="bg-input w-32"
                    placeholder="R6/4/1"
                  />
                  <span className="text-foreground">〜</span>
                  <Input
                    type="text"
                    value={period.to}
                    onChange={(e) => updatePeriod(index, { to: e.target.value })}
                    maxLength={20}
                    className="bg-input w-32"
                    placeholder="R7/3/31"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePeriod(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
