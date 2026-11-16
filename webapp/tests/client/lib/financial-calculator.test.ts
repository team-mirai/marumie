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
      expected: { main: "0", secondary: "", tertiary: "", unit: "円" },
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
      description: "150,000,000円 = 1億5,000万円",
      input: 150000000,
      expected: { main: "1", secondary: "億", tertiary: "5,000", unit: "万円" },
    },
    {
      description: "104,100,000円 = 1億410万円（ゼロ埋めしない）",
      input: 104100000,
      expected: { main: "1", secondary: "億", tertiary: "410", unit: "万円" },
    },
    {
      description: "726,560,000円 = 7億2,656万円",
      input: 726560000,
      expected: { main: "7", secondary: "億", tertiary: "2,656", unit: "万円" },
    },
    {
      description: "15,370,000円 = 1,537万円（4桁以上はカンマ区切り）",
      input: 15370000,
      expected: { main: "1,537", secondary: "", tertiary: "", unit: "万円" },
    },
    {
      description: "123,456,780,000円 = 1,234億5,678万円",
      input: 123456780000,
      expected: { main: "1,234", secondary: "億", tertiary: "5,678", unit: "万円" },
    },

    // 1万円未満は円で出す
    {
      description: "800円",
      input: 800,
      expected: { main: "800", secondary: "", tertiary: "", unit: "円" },
    },
    {
      description: "9,999円（1万円未満はカンマ区切りの円）",
      input: 9999,
      expected: { main: "9,999", secondary: "", tertiary: "", unit: "円" },
    },
    {
      description: "-800円",
      input: -800,
      expected: { main: "-800", secondary: "", tertiary: "", unit: "円" },
    },

    // 四捨五入の境界値
    {
      description: "14,999円 = 1万円（四捨五入で切り下げ）",
      input: 14999,
      expected: { main: "1", secondary: "", tertiary: "", unit: "万円" },
    },
    {
      description: "15,000円 = 2万円（四捨五入で切り上げ）",
      input: 15000,
      expected: { main: "2", secondary: "", tertiary: "", unit: "万円" },
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
      description: "-150,000,000円 = -1億5,000万円",
      input: -150000000,
      expected: { main: "-1", secondary: "億", tertiary: "5,000", unit: "万円" },
    },
  ];

  it.each(testCases)("should format $description", ({ input, expected }) => {
    expect(formatAmount(input)).toEqual(expected);
  });
});
