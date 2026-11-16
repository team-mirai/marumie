import { calcNiceTickInterval, calcSymmetricYAxisScale } from "@/client/lib/chart-axis";

describe("calcNiceTickInterval", () => {
  const testCases: Array<{ input: number; expected: number }> = [
    { input: 0, expected: 100 }, // 下限（データが全て0）
    { input: 50, expected: 100 }, // 下限（100円未満）
    { input: 100, expected: 100 },
    { input: 150, expected: 200 },
    { input: 3200, expected: 5000 },
    { input: 5000, expected: 5000 },
    { input: 5001, expected: 10000 },
    { input: 12000000, expected: 20000000 },
    { input: 600000000, expected: 1000000000 },
  ];

  it.each(testCases)("$input → $expected", ({ input, expected }) => {
    expect(calcNiceTickInterval(input)).toBe(expected);
  });

  it("負の値は絶対値として扱う", () => {
    expect(calcNiceTickInterval(-3200)).toBe(5000);
  });
});

describe("calcSymmetricYAxisScale", () => {
  it("金額が小さくてもレンジが0に潰れない", () => {
    expect(calcSymmetricYAxisScale(3000)).toEqual({
      min: -4000,
      max: 4000,
      tickInterval: 2000,
    });
  });

  it("全ての値が0でも下限の刻み幅でレンジを作る", () => {
    expect(calcSymmetricYAxisScale(0)).toEqual({
      min: -200,
      max: 200,
      tickInterval: 100,
    });
  });

  it("大きい金額では上下対称のキリのよいレンジになる", () => {
    // 1億円 × 1.2 / 2 = 6000万円 → 刻み1億円
    expect(calcSymmetricYAxisScale(100000000)).toEqual({
      min: -200000000,
      max: 200000000,
      tickInterval: 100000000,
    });
  });

  it("max は必ず maxAbsValue 以上になる", () => {
    for (const value of [1, 999, 12345, 3456789, 987654321]) {
      expect(calcSymmetricYAxisScale(value).max).toBeGreaterThanOrEqual(value);
    }
  });
});
