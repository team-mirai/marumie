import type { DonorType } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";

interface DonorTypeBadge {
  label: string;
  /** ピルバッジの色クラス。ブランドの teal / グレー / 黒枠のみを使う（青・紫・オレンジは使わない） */
  className: string;
}

/**
 * 寄付者種別をバッジ表示用のラベルと色クラスに解決する。
 * 個人 = teal、法人 = グレー、政治団体 = 黒枠白地。
 */
export function resolveDonorTypeBadge(donorType: DonorType): DonorTypeBadge {
  const label = DONOR_TYPE_LABELS[donorType];
  switch (donorType) {
    case "individual":
      return { label, className: "border-primary-active text-primary-active bg-accent" };
    case "corporation":
      return { label, className: "border-subtle-foreground text-muted-foreground bg-secondary" };
    case "political_organization":
      return { label, className: "border-border text-foreground bg-card" };
  }
}
