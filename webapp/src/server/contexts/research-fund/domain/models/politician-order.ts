/** ひらがなとカタカナ、濁点の有無を五十音の並びどおりに比べる */
const kanaCollator = new Intl.Collator("ja");

interface KanaOrderable {
  name: string;
  /** ふりがな。未登録なら null */
  nameKana: string | null;
}

/**
 * サイト全体で議員を並べる順（ふりがなの五十音順）。
 * ふりがなが未登録の議員は読みが分からないので後ろに回し、その中では名前で並べる。
 * 元の配列は変えず、並べ替えた新しい配列を返す（同じ読みなら元の順を保つ）。
 */
export function sortPoliticiansByKana<T extends KanaOrderable>(politicians: readonly T[]): T[] {
  return [...politicians].sort((a, b) => {
    const aKana = a.nameKana?.trim() || null;
    const bKana = b.nameKana?.trim() || null;
    if (aKana && bKana) return kanaCollator.compare(aKana, bKana);
    if (aKana) return -1;
    if (bKana) return 1;
    return kanaCollator.compare(a.name, b.name);
  });
}
