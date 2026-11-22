import {
  AdminTargetKey,
  asOrganizationTarget,
  selectableOrganizationYears,
  withSavedOrganizationYear,
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

describe("AdminTargetKey", () => {
  it("政治団体は団体 × 年度、議員室は帳簿のキーを作る", () => {
    expect(AdminTargetKey.organization(1, 2025)).toBe("org:1:2025");
    expect(AdminTargetKey.organization(BigInt(12), 2024)).toBe("org:12:2024");
    expect(AdminTargetKey.book(BigInt(7))).toBe("book:7");
  });

  it("作った政治団体のキーを団体 ID と年度に戻せる", () => {
    expect(AdminTargetKey.parseOrganization(AdminTargetKey.organization("3", 2024))).toEqual({
      organizationId: "3",
      year: 2024,
    });
  });

  it.each([undefined, "", "book:7", "org:0:2025", "org:01:2025", "org:1:25", "org:1:1899", "org:1:2025:x"])(
    "政治団体のキーとして読めない %p は null",
    (key) => {
      expect(AdminTargetKey.parseOrganization(key)).toBeNull();
    },
  );
});

describe("selectableOrganizationYears", () => {
  it("データが無くても当年・前年を新しい順に返す", () => {
    expect(selectableOrganizationYears(2026, [])).toEqual([2026, 2025]);
  });

  it("データのある年度を重複なく加え、新しい順に並べる", () => {
    expect(selectableOrganizationYears(2026, [2023, 2025, 2023, 2027])).toEqual([
      2027, 2026, 2025, 2023,
    ]);
  });
});

describe("withSavedOrganizationYear", () => {
  it("候補から外れた政治団体の年度を選んでいたら、その年度を候補に足す", () => {
    expect(withSavedOrganizationYear([org, book], "org:1:2020")).toEqual([
      org,
      book,
      { ...org, key: "org:1:2020", year: 2020 },
    ]);
  });

  it.each([undefined, "org:1:2025", "book:7", "org:99:2020", "invalid"])(
    "未選択・候補にある・団体が無い・政治団体でない選択 %p では候補を変えない",
    (key) => {
      expect(withSavedOrganizationYear([org, book], key)).toEqual([org, book]);
    },
  );
});
