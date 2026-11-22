/**
 * 年度をまたいだ議員の一覧（ヘッダーのメニュー・フッター・議員ページの前後の切り替え）の作り方。
 *
 * 表示中の年度に公開していない議員も一覧から外さない（2025年は 1 人しか公開していないので、
 * その年度だけで並べると切り替える先が無くなる）。
 */

/** 1 年度分の議員の一覧（その年度の並び順） */
interface ResearchFundPoliticianYearList<T> {
  financialYear: number;
  politicians: readonly T[];
}

/** 年度をまたいだ一覧の 1 人分 */
interface ResearchFundPoliticianAcrossYears<T> {
  slug: string;
  /** 一番新しい年度の一覧に載っていた議員 */
  latest: T;
  /** 調研費を公開している年度ごとの議員（新しい年度の順）。「準備中」だけの議員は空 */
  publishedYears: { financialYear: number; politician: T }[];
}

/**
 * 年度ごとの一覧を、年度をまたいだ 1 つの一覧にまとめる。
 * 並び順は一番新しい年度の一覧の順にそろえ（年度を変えても並びが変わらないようにする）、
 * 新しい年度に出てこない議員は、出てくる年度の新しい順・その年度の並び順で後ろに足す。
 * isPublished が false の議員（「準備中」）は並びには入るが、公開している年度には数えない。
 */
export function mergeResearchFundPoliticiansAcrossYears<T extends { slug: string }>(
  listsByYear: readonly ResearchFundPoliticianYearList<T>[],
  isPublished: (politician: T) => boolean = () => true,
): ResearchFundPoliticianAcrossYears<T>[] {
  const newestFirst = [...listsByYear].sort((a, b) => b.financialYear - a.financialYear);
  const merged = new Map<string, ResearchFundPoliticianAcrossYears<T>>();
  for (const { financialYear, politicians } of newestFirst) {
    for (const politician of politicians) {
      let entry = merged.get(politician.slug);
      if (!entry) {
        entry = { slug: politician.slug, latest: politician, publishedYears: [] };
        merged.set(politician.slug, entry);
      }
      if (isPublished(politician)) entry.publishedYears.push({ financialYear, politician });
    }
  }
  return [...merged.values()];
}

/**
 * 議員の名前を押したときに開く年度。
 * 表示中の年度（currentYear）に公開していればその年度、していなければ公開している一番新しい年度。
 * どの年度にも公開していなければ null（呼び出し側が決める）。
 */
export function chooseResearchFundPageYear(
  publishedYears: readonly number[],
  currentYear: number | null,
): number | null {
  if (currentYear !== null && publishedYears.includes(currentYear)) return currentYear;
  return publishedYears.length > 0 ? Math.max(...publishedYears) : null;
}
