import { POLITICIAN_HOUSE_LABELS, type PoliticianHouse } from "@/shared/models/politician";

/**
 * 議員カードの肩書き「衆議院議員・比例東京（東京7区）」。
 * 院だけなら「衆議院議員」、選挙区だけなら選挙区だけ。どちらも未登録なら null（肩書きの行を出さない）。
 */
export function buildPoliticianTitle({
  house,
  constituency,
}: {
  house: PoliticianHouse | null;
  constituency: string | null;
}): string | null {
  const parts = [
    house ? `${POLITICIAN_HOUSE_LABELS[house]}議員` : null,
    constituency?.trim(),
  ].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join("・") : null;
}
