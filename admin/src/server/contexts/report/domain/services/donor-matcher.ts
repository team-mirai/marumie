import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import {
  buildDonorMatchKey,
  type Donor,
  type DonorType,
} from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

/**
 * CSV行に既存 Donor との一致情報（matchingDonor）を付与する
 *
 * 寄付者CSVのプレビューと取り込みは同じ照合結果でなければならないため、
 * 照合処理はここに一本化する。
 *
 * @param rows 照合対象のCSV行
 * @param donorRepository 既存 Donor の検索に使うリポジトリ
 * @returns matchingDonor を付与した行（donorType が未確定の行はそのまま返す）
 */
export async function enrichRowsWithMatchingDonors(
  rows: PreviewDonorCsvRow[],
  donorRepository: IDonorRepository,
): Promise<PreviewDonorCsvRow[]> {
  const searchKeys = new Map<
    string,
    { name: string; address: string | null; donorType: DonorType }
  >();

  for (const row of rows) {
    if (row.donorType === null) continue;
    const key = buildDonorMatchKey(row.name, row.address, row.donorType);
    if (!searchKeys.has(key)) {
      searchKeys.set(key, { name: row.name, address: row.address, donorType: row.donorType });
    }
  }

  const uniqueCriteria = [...searchKeys.values()];
  const donors = await donorRepository.findByMatchCriteriaBatch(uniqueCriteria);

  const donorMap = new Map<string, Donor>(
    donors.map((d) => [buildDonorMatchKey(d.name, d.address, d.donorType), d]),
  );

  return rows.map((row) => {
    if (row.donorType === null) return row;

    const key = buildDonorMatchKey(row.name, row.address, row.donorType);
    const matchingDonor = donorMap.get(key);

    return {
      ...row,
      matchingDonor: matchingDonor
        ? {
            id: matchingDonor.id,
            name: matchingDonor.name,
            donorType: matchingDonor.donorType,
            address: matchingDonor.address,
          }
        : null,
    };
  });
}
