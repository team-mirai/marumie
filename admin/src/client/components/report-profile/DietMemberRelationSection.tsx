"use client";
import "client-only";

import type {
  DietMember,
  DietMemberPeriod,
  DietMemberRelation,
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

interface DietMemberRelationSectionProps {
  details: OrganizationReportProfileDetails;
  updateDetails: (updates: Partial<OrganizationReportProfileDetails>) => void;
}

const generateId = () => crypto.randomUUID();

const emptyMember = (): DietMember => ({
  id: generateId(),
  lastName: "",
  firstName: "",
  chamber: "1",
  positionType: "1",
});

const emptyPeriod = (): DietMemberPeriod => ({
  id: generateId(),
  from: "",
  to: "",
});

export function DietMemberRelationSection({
  details,
  updateDetails,
}: DietMemberRelationSectionProps) {
  const dietMemberRelation = details.dietMemberRelation;
  const isEnabled = dietMemberRelation && dietMemberRelation.type !== "0";

  const toggleDietMemberRelation = () => {
    if (isEnabled) {
      updateDetails({ dietMemberRelation: { type: "0" } });
    } else {
      updateDetails({
        dietMemberRelation: {
          type: "1",
          members: [],
          periods: [],
        },
      });
    }
  };

  const updateDietMemberRelation = (updates: Partial<DietMemberRelation>) => {
    if (dietMemberRelation) {
      updateDetails({
        dietMemberRelation: { ...dietMemberRelation, ...updates },
      });
    }
  };

  const addMember = () => {
    if (dietMemberRelation && (dietMemberRelation.members?.length ?? 0) < 3) {
      updateDietMemberRelation({
        members: [...(dietMemberRelation.members ?? []), emptyMember()],
      });
    }
  };

  const removeMember = (index: number) => {
    if (dietMemberRelation) {
      const newMembers = (dietMemberRelation.members ?? []).filter((_, i) => i !== index);
      updateDietMemberRelation({ members: newMembers });
    }
  };

  const updateMember = (index: number, updates: Partial<DietMember>) => {
    if (dietMemberRelation) {
      const newMembers = [...(dietMemberRelation.members ?? [])];
      newMembers[index] = { ...newMembers[index], ...updates };
      updateDietMemberRelation({ members: newMembers });
    }
  };

  const addPeriod = () => {
    if (dietMemberRelation && (dietMemberRelation.periods?.length ?? 0) < 3) {
      updateDietMemberRelation({
        periods: [...(dietMemberRelation.periods ?? []), emptyPeriod()],
      });
    }
  };

  const removePeriod = (index: number) => {
    if (dietMemberRelation) {
      const newPeriods = (dietMemberRelation.periods ?? []).filter((_, i) => i !== index);
      updateDietMemberRelation({ periods: newPeriods });
    }
  };

  const updatePeriod = (index: number, updates: Partial<DietMemberPeriod>) => {
    if (dietMemberRelation) {
      const newPeriods = [...(dietMemberRelation.periods ?? [])];
      newPeriods[index] = { ...newPeriods[index], ...updates };
      updateDietMemberRelation({ periods: newPeriods });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Checkbox
            id="dietMemberRelationEnabled"
            checked={isEnabled}
            onCheckedChange={toggleDietMemberRelation}
          />
          <label
            htmlFor="dietMemberRelationEnabled"
            className="text-lg font-semibold text-foreground cursor-pointer"
          >
            国会議員関係政治団体情報
          </label>
        </div>
      </CardHeader>

      {isEnabled && dietMemberRelation && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>団体区分</Label>
            <select
              value={dietMemberRelation.type}
              onChange={(e) =>
                updateDietMemberRelation({
                  type: e.target.value as "0" | "1" | "2" | "3",
                })
              }
              className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm max-w-md"
            >
              <option value="1">1号団体</option>
              <option value="2">2号団体</option>
              <option value="3">両方</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-foreground">関係する国会議員（最大3名）</h3>
              {(dietMemberRelation.members?.length ?? 0) < 3 && (
                <Button type="button" variant="ghost" size="sm" onClick={addMember}>
                  + 追加
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {(dietMemberRelation.members ?? []).map((member, index) => (
                <div key={member.id} className="bg-card rounded-lg p-3 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">議員 {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      削除
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">姓</Label>
                      <Input
                        type="text"
                        value={member.lastName}
                        onChange={(e) => updateMember(index, { lastName: e.target.value })}
                        maxLength={30}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">名</Label>
                      <Input
                        type="text"
                        value={member.firstName}
                        onChange={(e) => updateMember(index, { firstName: e.target.value })}
                        maxLength={30}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">院</Label>
                      <select
                        value={member.chamber}
                        onChange={(e) =>
                          updateMember(index, {
                            chamber: e.target.value as "1" | "2",
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      >
                        <option value="1">衆議院議員</option>
                        <option value="2">参議院議員</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">種別</Label>
                      <select
                        value={member.positionType}
                        onChange={(e) =>
                          updateMember(index, {
                            positionType: e.target.value as "1" | "2" | "3" | "4",
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      >
                        <option value="1">現職</option>
                        <option value="2">候補者</option>
                        <option value="3">候補者となろうとする者</option>
                        <option value="4">候補者等</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-foreground">指定期間（最大3件）</h3>
              {(dietMemberRelation.periods?.length ?? 0) < 3 && (
                <Button type="button" variant="ghost" size="sm" onClick={addPeriod}>
                  + 追加
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {(dietMemberRelation.periods ?? []).map((period, index) => (
                <div key={period.id} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={period.from}
                    onChange={(e) => updatePeriod(index, { from: e.target.value })}
                    maxLength={20}
                    className="w-32"
                    placeholder="R6/4/1"
                  />
                  <span className="text-foreground">〜</span>
                  <Input
                    type="text"
                    value={period.to}
                    onChange={(e) => updatePeriod(index, { to: e.target.value })}
                    maxLength={20}
                    className="w-32"
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
