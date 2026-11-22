import { PoliticianOrgMembership } from "@/server/contexts/shared/domain/models/politician-org-membership";

const base = {
  isNewPolitician: false,
  termStart: "2026-02-08",
  current: [],
  nextPoliticalOrganizationId: "",
  today: "2026-09-10",
};

describe("PoliticianOrgMembership.planReassignment", () => {
  it("新規作成では所属を当選日から始める", () => {
    expect(
      PoliticianOrgMembership.planReassignment({
        ...base,
        isNewPolitician: true,
        nextPoliticalOrganizationId: "2",
      }),
    ).toEqual({ endings: [], start: { politicalOrganizationId: "2", startedOn: "2026-02-08" } });
  });

  it("新規作成で所属が無ければ履歴を作らない", () => {
    expect(PoliticianOrgMembership.planReassignment({ ...base, isNewPolitician: true })).toBeNull();
  });

  it("所属を変えると現在の所属を今日付けで終え、新しい所属を今日から始める", () => {
    expect(
      PoliticianOrgMembership.planReassignment({
        ...base,
        current: [{ id: "3", politicalOrganizationId: "2", startedOn: "2026-02-08" }],
        nextPoliticalOrganizationId: "4",
      }),
    ).toEqual({
      endings: [{ id: "3", endedOn: "2026-09-10" }],
      start: { politicalOrganizationId: "4", startedOn: "2026-09-10" },
    });
  });

  it("所属を外すと現在の所属を終えるだけで、新しい所属は始めない", () => {
    expect(
      PoliticianOrgMembership.planReassignment({
        ...base,
        current: [{ id: "3", politicalOrganizationId: "2", startedOn: "2026-02-08" }],
      }),
    ).toEqual({ endings: [{ id: "3", endedOn: "2026-09-10" }], start: null });
  });

  it("所属が同じままなら履歴を増やさない", () => {
    expect(
      PoliticianOrgMembership.planReassignment({
        ...base,
        current: [{ id: "3", politicalOrganizationId: "2", startedOn: "2026-02-08" }],
        nextPoliticalOrganizationId: "2",
      }),
    ).toBeNull();
  });

  it("所属なしのままなら履歴を増やさない", () => {
    expect(PoliticianOrgMembership.planReassignment(base)).toBeNull();
  });

  it("現在の所属の開始日が未来なら、終了日を開始日にそろえる", () => {
    expect(
      PoliticianOrgMembership.planReassignment({
        ...base,
        current: [{ id: "3", politicalOrganizationId: "2", startedOn: "2026-10-01" }],
        nextPoliticalOrganizationId: "4",
      }),
    ).toEqual({
      endings: [{ id: "3", endedOn: "2026-10-01" }],
      start: { politicalOrganizationId: "4", startedOn: "2026-09-10" },
    });
  });

  it("現在の所属が複数あれば、同じ団体が含まれていても全て終えて付け替える", () => {
    expect(
      PoliticianOrgMembership.planReassignment({
        ...base,
        current: [
          { id: "3", politicalOrganizationId: "2", startedOn: "2026-02-08" },
          { id: "5", politicalOrganizationId: "4", startedOn: "2026-03-01" },
        ],
        nextPoliticalOrganizationId: "2",
      }),
    ).toEqual({
      endings: [
        { id: "3", endedOn: "2026-09-10" },
        { id: "5", endedOn: "2026-09-10" },
      ],
      start: { politicalOrganizationId: "2", startedOn: "2026-09-10" },
    });
  });
});
