import { formatOgAmount } from "@/app/_og-image/og-amount";

const text = (yen: number) => formatOgAmount(yen).map((p) => p.text).join("");

describe("formatOgAmount", () => {
  it("見出しの金額を万単位で書く", () => {
    expect(text(726_560_000)).toBe("7億2,656万");
    expect(text(15_370_000)).toBe("1,537万");
    expect(text(1_954_999)).toBe("195万");
  });

  it("「億」は数字と分けて小さく描けるようにする", () => {
    expect(formatOgAmount(726_560_000).map((p) => p.kind)).toEqual(["num", "oku", "num", "unit"]);
  });

  it("1万円に満たない金額は円で、億で割り切れる金額は「〜億円」で書く", () => {
    expect(text(5_000)).toBe("5,000円");
    expect(text(0)).toBe("0円");
    expect(text(300_000_000)).toBe("3億円");
  });
});
