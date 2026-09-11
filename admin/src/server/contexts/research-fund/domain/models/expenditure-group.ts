import { z } from "zod";
import type { LinkedEntrySummary } from "@/shared/research-fund/expenditure-group";

export class ExpenditureGroupError extends Error {}

export const expenditureGroupEditSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  outcomes: z
    .array(
      z.object({
        label: z.string().trim().max(255),
        url: z.string().trim().max(2048),
      }),
    )
    .max(20),
  entryIds: z.array(z.string().regex(/^[1-9]\d*$/)).max(500),
});
export type ExpenditureGroupEdit = z.infer<typeof expenditureGroupEditSchema>;

export interface OutcomeWrite {
  label: string;
  /** 空欄なら null。公開側で「報告は準備中」と表示する */
  url: string | null;
}
export interface ExpenditureGroupWrite {
  title: string;
  description: string;
  outcomes: readonly OutcomeWrite[];
  entryIds: readonly string[];
}

/** 支出群に紐づけられる費用仕訳。groupId は既に属している支出群（未所属なら null） */
export interface LinkableEntry {
  id: string;
  entryDate: string;
  description: string;
  amount: number;
  groupId: string | null;
}

export interface ExpenditureGroupRecord {
  id: string;
  title: string;
  description: string;
  outcomes: readonly OutcomeWrite[];
  entryIds: readonly string[];
}

/** 一覧カードに出す支出群。金額・件数・期間は紐づけから自動集計する */
export interface ExpenditureGroupSummary extends ExpenditureGroupRecord, LinkedEntrySummary {}

const URL_PATTERN = /^https?:\/\/\S+$/;

/**
 * 入力された成果物を保存できる形にそろえる。
 * ラベルも URL も空の行は入力途中の空欄とみなして捨てる。
 */
export function normalizeOutcomes(
  outcomes: ExpenditureGroupEdit["outcomes"],
): readonly OutcomeWrite[] {
  return outcomes
    .filter((outcome) => outcome.label !== "" || outcome.url !== "")
    .map((outcome) => {
      if (outcome.url !== "" && !URL_PATTERN.test(outcome.url))
        throw new ExpenditureGroupError("成果物のURLは http:// または https:// で入力してください");
      if (outcome.label === "") throw new ExpenditureGroupError("成果物のラベルを入力してください");
      return { label: outcome.label, url: outcome.url === "" ? null : outcome.url };
    });
}

/** 重複を除いた紐づけ先の仕訳 ID。順序は入力順を保つ */
export function normalizeEntryIds(entryIds: readonly string[]): readonly string[] {
  return [...new Set(entryIds)];
}
