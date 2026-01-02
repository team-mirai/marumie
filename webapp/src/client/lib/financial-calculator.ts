export interface FormattedAmount {
  main: string;
  secondary: string;
  tertiary: string;
  unit: string;
}

// 金額を万円単位でフォーマットする関数
export function formatAmount(amount: number): FormattedAmount {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const manAmount = Math.round(absAmount / 10000); // 万円に変換
  const sign = isNegative ? "-" : "";

  if (manAmount >= 10000) {
    const oku = Math.floor(manAmount / 10000);
    const man = manAmount % 10000;
    if (man === 0) {
      return {
        main: `${sign}${oku}`,
        secondary: "億",
        tertiary: "",
        unit: "円",
      };
    }
    return {
      main: `${sign}${oku}`,
      secondary: "億",
      tertiary: man.toString(),
      unit: "万円",
    };
  }
  return {
    main: `${sign}${manAmount}`,
    secondary: "",
    tertiary: "",
    unit: "万円",
  };
}
