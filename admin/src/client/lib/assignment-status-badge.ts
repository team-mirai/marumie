interface AssignmentStatusBadge {
  label: string;
  /** ピルバッジの色クラス。紐付け済み = teal 系、未紐付け = グレー系（ブランド外の色は使わない） */
  className: string;
}

/**
 * 取引先・寄付者の紐付け状態をバッジ表示用のラベルと色クラスに解決する。
 * 紐付け済み = teal（accent 背景・teal-deep 文字）、未紐付け = グレー（secondary 背景・muted 文字）。
 */
export function resolveAssignmentStatusBadge(assigned: boolean): AssignmentStatusBadge {
  if (assigned) {
    return {
      label: "紐付け済み",
      className: "border-primary-active text-primary-active bg-accent",
    };
  }
  return {
    label: "未紐付け",
    className: "border-subtle-foreground text-muted-foreground bg-secondary",
  };
}
