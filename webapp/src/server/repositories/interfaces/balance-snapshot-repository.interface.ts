export interface TotalBalancesByYear {
  currentYear: number;
  previousYear: number;
}

export interface IBalanceSnapshotRepository {
  getTotalLatestBalanceByOrgIds(orgIds: string[]): Promise<number>;
  getTotalLatestBalancesByYear(orgIds: string[], currentYear: number): Promise<TotalBalancesByYear>;
}
