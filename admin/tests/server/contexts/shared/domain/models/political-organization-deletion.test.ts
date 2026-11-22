import { PoliticalOrganizationDeletion } from "@/server/contexts/shared/domain/models/political-organization-deletion";

describe("PoliticalOrganizationDeletion", () => {
  it("取引が紐づいていなければ削除できる", () => {
    expect(PoliticalOrganizationDeletion.rejectionReason(0)).toBeNull();
  });

  it("取引が紐づいていれば件数入りの理由で削除を却下する", () => {
    expect(PoliticalOrganizationDeletion.rejectionReason(3)).toBe(
      "この政治団体には3件の取引が紐づいているため削除できません。",
    );
  });
});
