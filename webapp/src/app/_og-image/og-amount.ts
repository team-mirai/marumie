/** 金額の一部分。数字は数字の書体（Poppins）、単位は和文の書体で描く */
export interface OgAmountPart {
  text: string;
  kind: "num" | "oku" | "unit";
}

const withCommas = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * 見出しの金額を「万」単位で書く（例：7億2,656万、1,537万）。
 * 1万円に満たない金額は円のまま、ちょうど億で割り切れる金額は「〜億円」にする。
 */
export function formatOgAmount(yen: number): OgAmountPart[] {
  const value = Math.max(0, yen);
  if (value < 10000) return [{ text: withCommas(Math.round(value)), kind: "num" }, unit("円")];
  const man = Math.round(value / 10000);
  const oku = Math.floor(man / 10000);
  const rest = man % 10000;
  if (oku === 0) return [{ text: withCommas(rest), kind: "num" }, unit("万")];
  const head: OgAmountPart[] = [
    { text: String(oku), kind: "num" },
    { text: "億", kind: "oku" },
  ];
  return rest === 0
    ? [...head, unit("円")]
    : [...head, { text: withCommas(rest), kind: "num" }, unit("万")];
}

function unit(text: string): OgAmountPart {
  return { text, kind: "unit" };
}
