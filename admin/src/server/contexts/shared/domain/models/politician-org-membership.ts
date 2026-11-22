/** 議員の現在の所属（終了日が未設定の履歴）。日付は YYYY-MM-DD */
interface CurrentPoliticianOrgMembership {
  id: string;
  politicalOrganizationId: string;
  startedOn: string;
}

/** 所属の付け替えで保存する履歴の変更。日付は YYYY-MM-DD */
interface PoliticianOrgMembershipReassignment {
  /** 終了日を設定する現在の所属 */
  endings: { id: string; endedOn: string }[];
  /** 新しく始める所属。所属なしにするときは null */
  start: { politicalOrganizationId: string; startedOn: string } | null;
}

interface PoliticianOrgMembershipReassignmentInput {
  /** 議員を新規作成するときは true */
  isNewPolitician: boolean;
  /** 議員の当選日（YYYY-MM-DD）。新規作成時の所属の開始日になる */
  termStart: string;
  current: CurrentPoliticianOrgMembership[];
  /** 付け替え先の政治団体。空文字は所属なし */
  nextPoliticalOrganizationId: string;
  /** 今日の日付（YYYY-MM-DD） */
  today: string;
}

/** 議員の所属政治団体の履歴 */
export const PoliticianOrgMembership = {
  /**
   * 所属を付け替えるときに、どの履歴をいつ終え、どの履歴をいつ始めるかを決める。
   * 所属が変わらなければ履歴を増やさない（null を返す）。
   * - 現在の所属は今日付けで終える。ただし開始日が未来なら、終了日が開始日より前にならないよう開始日で終える
   * - 新しい所属は、議員の新規作成時は当選日から、それ以外は今日から始める
   */
  planReassignment(
    input: PoliticianOrgMembershipReassignmentInput,
  ): PoliticianOrgMembershipReassignment | null {
    const { isNewPolitician, termStart, current, nextPoliticalOrganizationId, today } = input;
    const unchanged =
      current.length === (nextPoliticalOrganizationId ? 1 : 0) &&
      current.every((m) => m.politicalOrganizationId === nextPoliticalOrganizationId);
    if (unchanged) return null;
    return {
      endings: current.map((m) => ({
        id: m.id,
        endedOn: m.startedOn > today ? m.startedOn : today,
      })),
      start: nextPoliticalOrganizationId
        ? {
            politicalOrganizationId: nextPoliticalOrganizationId,
            startedOn: isNewPolitician ? termStart : today,
          }
        : null,
    };
  },
};
