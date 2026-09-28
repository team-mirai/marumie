/** 1%未満は「0%」ではなく「<1%」と出す（小さくても使った費目があることを伝える）。 */
const UNDER_ONE_PERCENT = "<1%";

/**
 * サンキーのノード上に出す割合。合計に対する整数%で、1%未満は「<1%」。
 * 値か合計が無ければ空文字（割合を出さない）。
 */
export function formatSankeyPercentage(nodeValue?: number, totalValue?: number): string {
  if (!nodeValue || !totalValue || totalValue === 0) {
    return "";
  }

  const percentage = (nodeValue / totalValue) * 100;
  return percentage < 1 ? UNDER_ONE_PERCENT : `${Math.round(percentage)}%`;
}
