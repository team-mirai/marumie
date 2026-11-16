import {
  barDownPath,
  barUpPath,
  monthlyBarHeight,
  monthlyBarWidth,
} from "@/client/lib/monthly-bar-path";

describe("monthlyBarWidth", () => {
  it("1か月分の幅の 42% にし、30px を超えない", () => {
    expect(monthlyBarWidth(50)).toBeCloseTo(21);
    expect(monthlyBarWidth(100)).toBe(30);
  });
});

describe("monthlyBarHeight", () => {
  it("0の線側に 2px あけ、小さい金額でも 3px は残す", () => {
    expect(monthlyBarHeight(1_000, 0.1)).toBe(98);
    expect(monthlyBarHeight(1, 0.1)).toBe(3);
  });
});

describe("barUpPath / barDownPath", () => {
  it("上向きの棒は上の端だけを丸める", () => {
    expect(barUpPath(10, 20, 30, 100)).toBe("M10 120V28Q10 20 18 20H32Q40 20 40 28V120Z");
  });

  it("下向きの棒は下の端だけを丸める", () => {
    expect(barDownPath(10, 20, 30, 100)).toBe("M10 20V112Q10 120 18 120H32Q40 120 40 112V20Z");
  });

  it("棒が低いときは角丸の半径を高さまでに抑える", () => {
    expect(barUpPath(0, 0, 30, 3)).toBe("M0 3V3Q0 0 3 0H27Q30 0 30 3V3Z");
  });
});
