import { OrganizationProfile } from "@/server/contexts/public-finance/domain/models/organization-profile";

describe("OrganizationProfile.photoVersion", () => {
  it("Storage のキーの末尾のファイル名（拡張子を除く）を版にする", () => {
    expect(OrganizationProfile.photoVersion("political-organizations/1/abc-123.jpg")).toBe("abc-123");
  });

  it("写真が未登録なら null", () => {
    expect(OrganizationProfile.photoVersion(null)).toBeNull();
  });
});
