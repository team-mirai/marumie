/**
 * 担当する議員の ID から、一覧に表示する議員名を議員の並び順で返す。
 * 議員一覧に無い ID（削除済みなど）は表示しない。
 */
export function assignedPoliticianNames(
  assignedPoliticianIds: readonly string[],
  politicians: readonly { id: string; name: string }[],
): string[] {
  const assigned = new Set(assignedPoliticianIds);
  return politicians.filter((p) => assigned.has(p.id)).map((p) => p.name);
}

/**
 * 担当する議員の集合に 1 人を付け外しした結果を返す（議員の並び順に並べ、重複させない）。
 */
export function togglePoliticianAssignment(
  assignedPoliticianIds: readonly string[],
  politicianId: string,
  checked: boolean,
  politicians: readonly { id: string }[],
): string[] {
  const next = new Set(assignedPoliticianIds);
  if (checked) next.add(politicianId);
  else next.delete(politicianId);
  return politicians.filter((p) => next.has(p.id)).map((p) => p.id);
}
