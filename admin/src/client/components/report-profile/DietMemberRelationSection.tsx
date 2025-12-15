"use client";
import "client-only";

import type {
  DietMember,
  DietMemberPeriod,
  DietMemberRelation,
  OrganizationReportProfileDetails,
} from "@/server/contexts/report/domain/models/organization-report-profile";

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
    <div className="bg-primary-hover rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <input
          type="checkbox"
          id="dietMemberRelationEnabled"
          checked={isEnabled}
          onChange={toggleDietMemberRelation}
          className="w-4 h-4"
        />
        <label
          htmlFor="dietMemberRelationEnabled"
          className="text-lg font-semibold text-white cursor-pointer"
        >
          国会議員関係政治団体情報
        </label>
      </div>

      {isEnabled && dietMemberRelation && (
        <div className="space-y-4 pl-7">
          <label className="block font-medium text-white">
            団体区分
            <select
              value={dietMemberRelation.type}
              onChange={(e) =>
                updateDietMemberRelation({
                  type: e.target.value as "0" | "1" | "2" | "3",
                })
              }
              className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2.5 mt-2 block font-normal"
            >
              <option value="1">1号団体</option>
              <option value="2">2号団体</option>
              <option value="3">両方</option>
            </select>
          </label>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-white">関係する国会議員（最大3名）</h3>
              {(dietMemberRelation.members?.length ?? 0) < 3 && (
                <button
                  type="button"
                  onClick={addMember}
                  className="text-primary-accent hover:text-blue-400 text-sm"
                >
                  + 追加
                </button>
              )}
            </div>
            <div className="space-y-3">
              {(dietMemberRelation.members ?? []).map((member, index) => (
                <div
                  key={member.id}
                  className="bg-primary-panel rounded-lg p-3 border border-primary-border"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-primary-muted">議員 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      削除
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <label className="block text-sm text-primary-muted">
                      姓
                      <input
                        type="text"
                        value={member.lastName}
                        onChange={(e) => updateMember(index, { lastName: e.target.value })}
                        maxLength={30}
                        className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                      />
                    </label>
                    <label className="block text-sm text-primary-muted">
                      名
                      <input
                        type="text"
                        value={member.firstName}
                        onChange={(e) => updateMember(index, { firstName: e.target.value })}
                        maxLength={30}
                        className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm text-primary-muted">
                      院
                      <select
                        value={member.chamber}
                        onChange={(e) =>
                          updateMember(index, {
                            chamber: e.target.value as "1" | "2",
                          })
                        }
                        className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                      >
                        <option value="1">衆議院議員</option>
                        <option value="2">参議院議員</option>
                      </select>
                    </label>
                    <label className="block text-sm text-primary-muted">
                      種別
                      <select
                        value={member.positionType}
                        onChange={(e) =>
                          updateMember(index, {
                            positionType: e.target.value as "1" | "2" | "3" | "4",
                          })
                        }
                        className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-full mt-1 block"
                      >
                        <option value="1">現職</option>
                        <option value="2">候補者</option>
                        <option value="3">候補者となろうとする者</option>
                        <option value="4">候補者等</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-white">指定期間（最大3件）</h3>
              {(dietMemberRelation.periods?.length ?? 0) < 3 && (
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
              {(dietMemberRelation.periods ?? []).map((period, index) => (
                <div key={period.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={period.from}
                    onChange={(e) => updatePeriod(index, { from: e.target.value })}
                    maxLength={20}
                    className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 w-32"
                    placeholder="R6/4/1"
                  />
                  <span className="text-white">〜</span>
                  <input
                    type="text"
                    value={period.to}
                    onChange={(e) => updatePeriod(index, { to: e.target.value })}
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
