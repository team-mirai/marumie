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

/** 議員ページの URL。年度はいま見ているページと同じにする */
export function politicianPageHref(pathSlug: string, financialYear: number): string {
  return `/p/${encodeURIComponent(pathSlug)}/${financialYear}`;
}
