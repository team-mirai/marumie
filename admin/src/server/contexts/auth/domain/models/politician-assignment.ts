/**
 * ユーザーが担当する議員（#1773）
 *
 * 秘書は基本的に 1 つの議員室を担当する。調査研究費の書き込みは担当の議員室に絞り、
 * 担当がちょうど 1 人なら、対象が未選択のときにその議員室を対象として選んだ状態で始める。
 */
export namespace PoliticianAssignmentModel {
  /**
   * 入力された担当議員の ID の集合を正規化する（形式の検証・重複の除去・昇順への並べ替え）。
   * @throws Error 議員の ID として不正な値が含まれる場合
   */
  export function normalize(politicianIds: readonly string[]): string[] {
    const invalid = politicianIds.filter((id) => !/^[1-9]\d{0,18}$/.test(id));
    if (invalid.length > 0) {
      throw new Error(`議員の ID が不正です: ${invalid.join(", ")}`);
    }
    return [...new Set(politicianIds)].sort((a, b) => a.length - b.length || a.localeCompare(b));
  }
}
