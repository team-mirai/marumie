import type { PreviewDonorCsvRowStatus } from "@/server/contexts/report/domain/models/preview-donor-csv-row";

interface DonorCsvStatusBadge {
  label: string;
  /** ピルバッジの色クラス。正常 = teal 系、取引なし = グレー系、エラー・種別不整合 = 赤系（ブランド外の色は使わない） */
  className: string;
}

const DONOR_CSV_STATUS_BADGES: Record<PreviewDonorCsvRowStatus, DonorCsvStatusBadge> = {
  valid: {
    label: "正常",
    className: "border-primary-active text-primary-active bg-accent",
  },
  transaction_not_found: {
    label: "取引なし",
    className: "border-subtle-foreground text-muted-foreground bg-secondary",
  },
  invalid: {
    label: "エラー",
    className: "border-destructive text-destructive bg-card",
  },
  type_mismatch: {
    label: "種別不整合",
    className: "border-destructive text-destructive bg-card",
  },
};

/**
 * 寄付者 CSV プレビューの行状態（正常 / 取引なし / エラー / 種別不整合）を
 * バッジ表示用のラベルと色クラスに解決する。
 * 語彙は teal（取り込まれる）/ グレー（紐付け先が無く取り込まれない）/ 赤（入力に問題がある）の 3 系統に限定する。
 */
export function resolveDonorCsvStatusBadge(status: PreviewDonorCsvRowStatus): DonorCsvStatusBadge {
  return DONOR_CSV_STATUS_BADGES[status];
}
