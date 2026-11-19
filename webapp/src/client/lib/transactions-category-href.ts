/**
 * 全件ページで、そのカテゴリー1つに絞り込んだ URL を作る。
 *
 * 並び順や収支の絞り込みなど今の表示状態はそのまま保ち、カテゴリーの絞り込みだけを置き換える。
 * 絞り込みが変わると件数も変わるので、ページ指定は落として1ページ目に戻す。
 */
export function transactionsCategoryHref(
  pathname: string,
  searchParams: URLSearchParams,
  categoryKey: string,
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("categories", categoryKey);
  params.delete("page");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
