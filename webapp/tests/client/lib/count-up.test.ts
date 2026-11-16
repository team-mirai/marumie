import { countUpText, easeOutQuart, parseCountUpTarget } from "@/client/lib/count-up";

describe("easeOutQuart", () => {
  it("始まりは 0、終わりは 1 になる", () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
  });

  it("はじめに速く進み、終わりにかけてゆっくりになる", () => {
    expect(easeOutQuart(0.5)).toBeCloseTo(0.9375);
  });

  it("範囲の外は 0〜1 に収める", () => {
    expect(easeOutQuart(-0.5)).toBe(0);
    expect(easeOutQuart(1.5)).toBe(1);
  });
});

describe("parseCountUpTarget", () => {
  it.each([
    ["1537", 1537],
    ["1,537", 1537],
    ["12,345,678", 12345678],
    ["-1,234", -1234],
    ["0", 0],
    ["-3", -3],
  ])("%s を数値にする", (text, expected) => {
    expect(parseCountUpTarget(text)).toBe(expected);
  });

  it.each(["", "1.5", "abc", "1,5", "12,34"])("整数でない %p は null にする", (text) => {
    expect(parseCountUpTarget(text)).toBeNull();
  });
});

describe("countUpText", () => {
  it("始まりは 0、終わりは最終値を 4桁以上カンマ区切りで出す", () => {
    expect(countUpText(1537, 0)).toBe("0");
    expect(countUpText(1537, 1)).toBe("1,537");
    expect(countUpText(410, 1)).toBe("410");
  });

  it("途中の値も 4桁以上はカンマで区切り、ゼロ埋めしない", () => {
    expect(countUpText(10000, 0.5)).toBe("9,375");
    expect(countUpText(10000, 0.01)).toBe("394");
  });

  it("途中は進み具合に応じた整数を出す", () => {
    expect(countUpText(1000, 0.5)).toBe("938");
  });

  it("負の値も 0 から数え、-0 とは出さない", () => {
    expect(countUpText(-3, 0)).toBe("0");
    expect(countUpText(-3, 1)).toBe("-3");
    expect(countUpText(-1537, 1)).toBe("-1,537");
  });
});
