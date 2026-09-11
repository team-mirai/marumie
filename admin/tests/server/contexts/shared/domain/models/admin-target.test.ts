import {
  asOrganizationTarget,
  type AdminTarget,
} from "@/server/contexts/shared/domain/models/admin-target";

const org: AdminTarget = {
  kind: "political-organization",
  key: "org:1:2025",
  name: "団体A",
  year: 2025,
  organizationId: "1",
};
const book: AdminTarget = {
  kind: "research-fund",
  key: "book:7",
  name: "議員A",
  year: 2026,
  politicianId: "3",
  bookId: "7",
  draftCount: 2,
};

describe("asOrganizationTarget", () => {
  it("政治団体の対象を政治団体系ページ向けの形に変換する", () => {
    expect(asOrganizationTarget(org)).toEqual({
      organizationId: "1",
      name: "団体A",
      year: 2025,
    });
  });

  it("議員室（調研費）の対象は政治団体として扱わない", () => {
    expect(asOrganizationTarget(book)).toBeNull();
  });

  it("未選択のときは別の団体にフォールバックしない", () => {
    expect(asOrganizationTarget(null)).toBeNull();
  });
});
