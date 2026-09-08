import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

type PreviewStatus = PreviewTransaction["status"];

interface PreviewStatusBadge {
  label: string;
  /** ピルバッジの色クラス。挿入・更新 = teal 系、スキップ = グレー系、無効 = 赤系（ブランド外の色は使わない） */
  className: string;
  /** 行に付随するエラー/理由文の文字色クラス */
  messageClassName: string;
}

const PREVIEW_STATUS_BADGES: Record<PreviewStatus, PreviewStatusBadge> = {
  insert: {
    label: "挿入",
    className: "border-primary-active text-primary-active bg-accent",
    messageClassName: "text-muted-foreground",
  },
  update: {
    label: "更新",
    className: "border-primary-active text-primary-active bg-card",
    messageClassName: "text-muted-foreground",
  },
  skip: {
    label: "スキップ",
    className: "border-subtle-foreground text-muted-foreground bg-secondary",
    messageClassName: "text-muted-foreground",
  },
  invalid: {
    label: "無効",
    className: "border-destructive text-destructive bg-card",
    messageClassName: "text-destructive",
  },
};

/**
 * CSV 取り込みプレビューの行状態（挿入 / 更新 / スキップ / 無効）を
 * バッジ表示用のラベルと色クラスに解決する。
 * 語彙は teal（取り込まれる）/ グレー（変更なし）/ 赤（取り込めない）の 3 系統に限定する。
 */
export function resolvePreviewStatusBadge(status: PreviewStatus): PreviewStatusBadge {
  return PREVIEW_STATUS_BADGES[status];
}
