/** 政治団体を削除してよいかの判定 */
export const PoliticalOrganizationDeletion = {
  /** 取引が紐づく政治団体は削除できない。削除できなければ却下理由を返す */
  rejectionReason(transactionCount: number): string | null {
    if (transactionCount > 0) {
      return `この政治団体には${transactionCount}件の取引が紐づいているため削除できません。`;
    }
    return null;
  },
};
