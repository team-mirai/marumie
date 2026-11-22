/** 前後の切り替え・インジケーター・ほかの議員の一覧に並べる議員 */
export interface PoliticianNavMember {
  slug: string;
  name: string;
}

export interface PoliticianNav<T extends PoliticianNavMember> {
  prev: T;
  next: T;
  /** SP のインジケーター。公開中の議員を表示順に並べ、表示中の議員に current を付ける */
  members: (T & { current: boolean })[];
  /** 表示中の議員を除いた、ほかの議員（表示順） */
  others: T[];
}

/**
 * 議員ページの前後の切り替え（表示順でぐるっと回る）と、ほかの議員の一覧。
 * members は調研費を公開中の議員だけを渡す。公開中の議員が 1 人以下なら、切り替える先が無いので null。
 * プレビュー URL で非公開の議員を見ているとき（members に表示中の議員がいない）は、
 * 前は最後の議員・次は最初の議員にし、インジケーターはどれも表示中にしない。
 */
export function buildPoliticianNav<T extends PoliticianNavMember>(
  members: T[],
  currentSlug: string,
): PoliticianNav<T> | null {
  if (members.length <= 1) return null;
  const index = members.findIndex((member) => member.slug === currentSlug);
  const prevIndex =
    index === -1 ? members.length - 1 : (index - 1 + members.length) % members.length;
  const nextIndex = index === -1 ? 0 : (index + 1) % members.length;
  return {
    prev: members[prevIndex],
    next: members[nextIndex],
    members: members.map((member, i) => ({ ...member, current: i === index })),
    others: members.filter((member) => member.slug !== currentSlug),
  };
}

/**
 * 年度をまたいで、前後の切り替え・ほかの議員の一覧に並べる議員をまとめる。
 * 表示中の年度に公開していない議員がいても、切り替えの輪から外さない（2025年は 1 人しか公開していないので、
 * その年度だけで並べると切り替える先が無くなる）。
 * - 並び順は新しい年度の一覧の順にそろえ、年度を変えても並びが変わらないようにする。新しい年度に出てこない議員は後ろに足す
 * - リンク先の年度は、表示中の年度に公開していればその年度、していなければ公開している一番新しい年度。
 *   どの年度にも公開していない（「準備中」だけの）議員は表示中の年度
 */
export function mergeNavMembersAcrossYears<T extends PoliticianNavMember & { comingSoon: boolean }>(
  currentYear: number,
  listsByYear: { financialYear: number; members: T[] }[],
): (T & { financialYear: number })[] {
  const newestFirst = [...listsByYear].sort((a, b) => b.financialYear - a.financialYear);
  const order: string[] = [];
  const published = new Map<string, { financialYear: number; member: T }[]>();
  const firstSeen = new Map<string, T>();
  for (const { financialYear, members } of newestFirst) {
    for (const member of members) {
      if (!firstSeen.has(member.slug)) {
        firstSeen.set(member.slug, member);
        order.push(member.slug);
      }
      if (!member.comingSoon) {
        published.set(member.slug, [
          ...(published.get(member.slug) ?? []),
          { financialYear, member },
        ]);
      }
    }
  }
  return order.map((slug) => {
    const years = published.get(slug) ?? [];
    const chosen = years.find((entry) => entry.financialYear === currentYear) ?? years[0];
    return chosen
      ? { ...chosen.member, financialYear: chosen.financialYear }
      : { ...(firstSeen.get(slug) as T), financialYear: currentYear };
  });
}

/** 議員ページの URL（その年度のページ） */
export function politicianPageHref(pathSlug: string, financialYear: number): string {
  return `/p/${encodeURIComponent(pathSlug)}/${financialYear}`;
}
