import { formatAmount, FormattedAmount } from "@/client/lib/financial-calculator";

describe("formatAmount", () => {
  const testCases: Array<{
    description: string;
    input: number;
    expected: FormattedAmount;
  }> = [
    // 基本的な万円表示
    {
      description: "0円",
      input: 0,
      expected: { main: "0", secondary: "", tertiary: "", unit: "万円" },
    },
    {
      description: "1,000,000円 = 100万円",
      input: 1000000,
      expected: { main: "100", secondary: "", tertiary: "", unit: "万円" },
    },

    // 億円（余りなし）
    {
      description: "100,000,000円 = 1億円",
      input: 100000000,
      expected: { main: "1", secondary: "億", tertiary: "", unit: "円" },
    },

    // 億円（余りあり）
    {
      description: "150,000,000円 = 1億5000万円",
      input: 150000000,
      expected: { main: "1", secondary: "億", tertiary: "5000", unit: "万円" },
    },

    // 四捨五入の境界値
    {
      description: "4,999円 = 0万円（四捨五入で切り下げ）",
      input: 4999,
      expected: { main: "0", secondary: "", tertiary: "", unit: "万円" },
    },
    {
      description: "5,000円 = 1万円（四捨五入で切り上げ）",
      input: 5000,
      expected: { main: "1", secondary: "", tertiary: "", unit: "万円" },
    },

    // 億円への四捨五入
    {
      description: "99,995,000円 = 1億円（四捨五入で億円になる）",
      input: 99995000,
      expected: { main: "1", secondary: "億", tertiary: "", unit: "円" },
    },

    // マイナス値
    {
      description: "-1,000,000円 = -100万円",
      input: -1000000,
      expected: { main: "-100", secondary: "", tertiary: "", unit: "万円" },
    },
    {
      description: "-100,000,000円 = -1億円",
      input: -100000000,
      expected: { main: "-1", secondary: "億", tertiary: "", unit: "円" },
    },
    {
      description: "-150,000,000円 = -1億5000万円",
      input: -150000000,
      expected: { main: "-1", secondary: "億", tertiary: "5000", unit: "万円" },
    },
  ];

  it.each(testCases)("should format $description", ({ input, expected }) => {
    expect(formatAmount(input)).toEqual(expected);
  });
});
