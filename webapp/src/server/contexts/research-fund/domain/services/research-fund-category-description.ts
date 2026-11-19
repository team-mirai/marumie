/**
 * カテゴリーピルに添える説明。
 *
 * 「交通費」はタクシー代・電車・バス代・高速・駐車代をまとめた科目で、ラベルだけでは
 * 航空券（別科目の「航空券代」）を含むのか読み取れない。読み違えを防ぐため交通費にだけ説明を出す。
 * 汎用的なカテゴリー説明の仕組みにはしない。
 */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  transportation: "航空券をのぞく電車・バス・タクシー代",
};

export function researchFundCategoryDescription(accountKey: string): string | undefined {
  return CATEGORY_DESCRIPTIONS[accountKey];
}
