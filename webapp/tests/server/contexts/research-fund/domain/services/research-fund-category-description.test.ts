import { researchFundCategoryDescription } from "@/server/contexts/research-fund/domain/services/research-fund-category-description";

describe("researchFundCategoryDescription", () => {
  it("交通費には航空券を含まないことを示す説明を返す", () => {
    expect(researchFundCategoryDescription("transportation")).toBe(
      "航空券をのぞく電車・バス・タクシー代",
    );
  });

  it("交通費以外の科目には説明を付けない", () => {
    expect(researchFundCategoryDescription("airfare")).toBeUndefined();
    expect(researchFundCategoryDescription("stationery-supplies")).toBeUndefined();
    expect(researchFundCategoryDescription("unknown")).toBeUndefined();
  });
});
