export interface FormattedAmount {
  main: string;
  secondary: string;
  tertiary: string;
  unit: string;
}

/**
 * 金額を見出しカード用に「数字」「億」「数字」「単位」へ分けて表す。書き方は formatYen と同じ（v9）:
 * 4桁以上はカンマで区切り、1万円未満は「800円」、1万円以上は万円単位に丸める。小数・ゼロ埋めは使わない
 */
export function formatAmount(amount: number): FormattedAmount {
  const absAmount = Math.round(Math.abs(amount) || 0);
  const sign = amount < 0 && absAmount > 0 ? "-" : "";
  const toText = (value: number) => value.toLocaleString("ja-JP");

  if (absAmount < 10_000) {
    return { main: `${sign}${toText(absAmount)}`, secondary: "", tertiary: "", unit: "円" };
  }

  const manAmount = Math.round(absAmount / 10_000); // 万円に変換
  if (manAmount >= 10_000) {
    const oku = Math.floor(manAmount / 10_000);
    const man = manAmount % 10_000;
    if (man === 0) {
      return { main: `${sign}${toText(oku)}`, secondary: "億", tertiary: "", unit: "円" };
    }
    return { main: `${sign}${toText(oku)}`, secondary: "億", tertiary: toText(man), unit: "万円" };
  }
  return { main: `${sign}${toText(manAmount)}`, secondary: "", tertiary: "", unit: "万円" };
}
