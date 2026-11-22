/**
 * 議員の調研費の公開状況。
 *
 * - 公開中: 調研費を「公開する」議員で、その年度に published の仕訳が 1 件以上ある
 * - 準備中: 調研費を非公開のまま、添え書きを付けて一覧にグレーで出す議員。公開中の議員は添え書きを持てない
 *   （Politician のルールと DB の CHECK 制約）
 *
 * 公開中の議員でも、published の仕訳が無い月・年度は「未公開」と呼び、「準備中」とは区別する。
 */

/** 調研費を「公開する」議員の条件。リポジトリが議員を検索するときの条件にもそのまま使う */
export const PUBLIC_RESEARCH_FUND_POLITICIAN_CONDITION = { isResearchFundPublic: true } as const;

/** 公開ページに出す仕訳の条件。リポジトリが仕訳を検索するときの条件にもそのまま使う */
export const PUBLISHED_JOURNAL_ENTRY_CONDITION = { status: "published" } as const;

/** 「準備中」の議員の条件（添え書きがある）。リポジトリが議員を検索するときの条件にもそのまま使う */
export const COMING_SOON_POLITICIAN_CONDITION = {
  researchFundComingSoonNote: { not: null },
} as const;

export const ResearchFundPublication = {
  /** その年度の調研費を公開中か（published の仕訳が 1 件以上ある）。渡すのはその年度の published の仕訳から作ったもの */
  isPublishedYear(publishedEntries: readonly unknown[]): boolean {
    return publishedEntries.length > 0;
  },

  /** 「準備中」の議員か。添え書き（未加工の値）を渡す */
  isComingSoon(comingSoonNote: string | null): boolean {
    return comingSoonNote !== null;
  },

  /**
   * 「準備中」の議員のうち、公開中の一覧にいない議員（渡した順のまま）。
   * 公開中の一覧と準備中の一覧は別々に取る（キャッシュも別）ので、公開・非公開の切り替え直後は同じ議員が両方に入りうる。
   * そのときは公開中を優先し、準備中からは外す。
   */
  excludePublished<T extends { slug: string }>(
    comingSoon: readonly T[],
    published: readonly { slug: string }[],
  ): T[] {
    const publishedSlugs = new Set(published.map((politician) => politician.slug));
    return comingSoon.filter((politician) => !publishedSlugs.has(politician.slug));
  },
};
