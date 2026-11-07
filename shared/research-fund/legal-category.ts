/**
 * 調研費の仕訳の法定区分（① 人件費〜⑩ その他の経費）の決め方。
 *
 * 法定区分は科目（20分類）から1つに決まるのが原則で、議員室ごとに基準がぶれないことを担保している。
 * ただし管理者が許可した帳簿に限り、仕訳ごとに区分を上書きできる（#1880）。
 *
 * 「上書きがあればそれ、無ければ科目の既定」という決め方は、議員課提出用の帳簿・領収書の印刷・
 * 管理画面の公開プレビュー・公開ページ・政党ページのすべてがこのファイルの関数を通す。
 * 出力ごとに書き分けると、提出用の帳簿と公開ページで区分が食い違う失敗を招くため。
 *
 * 法定区分だけのマスタ表は持たず、キーとラベルは科目マスタの各行から引く（10区分すべてがいずれかの科目に現れる）。
 */

/** 法定区分。key は科目マスタの legal_category_key、label は legal_label（"③ 備品・消耗品費" など） */
export interface ResearchFundLegalCategory {
  readonly key: string;
  readonly label: string;
}

/** 科目マスタの行のうち、法定区分にかかわる列 */
export interface LegalCategorySourceAccount {
  readonly legalCategoryKey: string | null;
  readonly legalLabel: string | null;
}

/** 法定区分のキー → 区分。科目マスタから作る */
export type LegalCategoryCatalog = ReadonlyMap<string, ResearchFundLegalCategory>;

/**
 * 科目マスタから法定区分の一覧を作る。法定区分を持たない科目（要確認など）は含めない。
 * 並びはラベル順（丸数字のコードポイント順に①〜⑩が並ぶ）。
 */
export function buildLegalCategoryCatalog(
  accounts: readonly LegalCategorySourceAccount[],
): LegalCategoryCatalog {
  const categories = new Map<string, ResearchFundLegalCategory>();
  for (const account of accounts) {
    if (!account.legalCategoryKey || !account.legalLabel) continue;
    if (!categories.has(account.legalCategoryKey))
      categories.set(account.legalCategoryKey, {
        key: account.legalCategoryKey,
        label: account.legalLabel,
      });
  }
  return new Map(
    [...categories.entries()].sort(([, a], [, b]) =>
      a.label < b.label ? -1 : a.label > b.label ? 1 : 0,
    ),
  );
}

/**
 * 上書きに保存された法定区分のキーを区分に引き当てる。上書きが無ければ null。
 * キーが科目マスタに無いのは書き込み時の検証をすり抜けたデータの不整合なので、黙って既定に戻さず例外にする
 * （出力ごとに区分が変わったり、提出済みの報告書と合わないまま出したりしないため）。
 */
export function legalCategoryOverrideOf(
  overrideKey: string | null | undefined,
  catalog: LegalCategoryCatalog,
): ResearchFundLegalCategory | null {
  if (overrideKey === null || overrideKey === undefined) return null;
  const category = catalog.get(overrideKey);
  if (!category)
    throw new Error(`法定区分の上書きに科目マスタに無い区分が指定されています: ${overrideKey}`);
  return category;
}

/**
 * 仕訳の法定区分のラベル。上書きがあればそれ、無ければ科目の既定（科目が法定区分を持たなければ null）。
 */
export function resolveLegalLabel(
  accountLegalLabel: string | null,
  override: ResearchFundLegalCategory | null | undefined,
): string | null {
  return override ? override.label : accountLegalLabel;
}

/**
 * 仕訳の法定区分のキー。上書きがあればそれ、無ければ科目の既定（科目が法定区分を持たなければ null）。
 */
export function resolveLegalCategoryKey(
  accountLegalCategoryKey: string | null,
  override: ResearchFundLegalCategory | null | undefined,
): string | null {
  return override ? override.key : accountLegalCategoryKey;
}
