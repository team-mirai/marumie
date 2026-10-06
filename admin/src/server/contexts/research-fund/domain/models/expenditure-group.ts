import { z } from "zod";
import { isSerialId } from "@/server/contexts/research-fund/domain/models/entity-id";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";
import type { LinkedEntrySummary } from "@/shared/research-fund/expenditure-group";

export class ExpenditureGroupError extends Error {}

const expenditureGroupEditSchema = z.object({
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
  entryIds: z.array(z.string().refine(isSerialId)).max(500),
});
export type ExpenditureGroupEdit = z.infer<typeof expenditureGroupEditSchema>;

/** フォームの入力を支出群として保存できる形か確かめる */
export function parseExpenditureGroupEdit(
  input: unknown,
): ResearchFundResult<ExpenditureGroupEdit> {
  const parsed = expenditureGroupEditSchema.safeParse(input);
  if (!parsed.success)
    return invalidResearchFundResult(
      "input",
      RF_ERROR_CODES.INVALID_GROUP_EDIT,
      "タイトルと説明を入力してください",
    );
  return { status: "valid", value: parsed.data };
}

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
function normalizeEntryIds(entryIds: readonly string[]): readonly string[] {
  return [...new Set(entryIds)];
}

/** 帳簿・支出群の ID は DB の自動採番（1 以上の整数）なので、それ以外の形はリポジトリに渡す前に弾く */
export function assertValidIds(...ids: readonly string[]): void {
  if (ids.some((id) => !isSerialId(id))) throw new ExpenditureGroupError("IDが不正です");
}

/**
 * 支出群（groupId。新規なら null）に紐づけてよい仕訳かを判定し、重複を除いた仕訳 ID を返す。
 * entries は帳簿の紐づけ候補（費用仕訳）全件。
 */
export function validateEntryLinks(
  groupId: string | null,
  entryIds: readonly string[],
  entries: readonly LinkableEntry[],
): ResearchFundResult<readonly string[]> {
  const unique = normalizeEntryIds(entryIds);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const entryId of unique) {
    const entry = byId.get(entryId);
    if (!entry)
      return invalidResearchFundResult(
        "entryIds",
        RF_ERROR_CODES.INVALID_ENTRY_LINK,
        "この帳簿にない仕訳は紐づけられません",
      );
    // 1 仕訳は 1 つの支出群にしか属せない（公開側で金額が二重計上されるため）
    if (entry.groupId !== null && entry.groupId !== groupId)
      return invalidResearchFundResult(
        "entryIds",
        RF_ERROR_CODES.INVALID_ENTRY_LINK,
        "他の支出群に紐づいている仕訳は選べません",
      );
  }
  return { status: "valid", value: unique };
}

/**
 * 支出群の並び順として受け付けられるか。同じ支出群が 2 回出てくる並びは受け付けない。
 * 帳簿の支出群と過不足が無いかは、最新の一覧と突き合わせるリポジトリが検出する。
 */
export function validateGroupOrder(
  groupIds: readonly string[],
): ResearchFundResult<readonly string[]> {
  if (new Set(groupIds).size !== groupIds.length)
    return invalidResearchFundResult(
      "groupIds",
      RF_ERROR_CODES.INVALID_GROUP_ORDER,
      "並び順の指定が重複しています",
    );
  return { status: "valid", value: groupIds };
}
