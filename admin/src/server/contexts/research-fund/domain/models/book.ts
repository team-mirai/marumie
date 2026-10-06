import { isCalendarDate } from "@/server/contexts/research-fund/domain/models/calendar-date";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";
export interface BookMetadata {
  asOfDate: string;
  nextUpdateNote: string;
  policyComment: string;
}
export interface Book extends BookMetadata {
  id: string;
  financialYear: number;
  status: "preparing" | "active" | "closed";
  publishedThrough: string | null;
}

/** 活用方針は公開ページにそのまま出るので、長さに上限を設ける */
const POLICY_COMMENT_MAX_LENGTH = 2000;

export const Book = {
  validateYear(year: number): ResearchFundResult<number> {
    if (!Number.isInteger(year) || year < 1900 || year > 9999)
      return invalidResearchFundResult(
        "financialYear",
        RF_ERROR_CODES.INVALID_BOOK_YEAR,
        "年度は1900〜9999の整数で指定してください",
      );
    return { status: "valid", value: year };
  },
  /**
   * 活用方針を保存できる形（前後の空白を落とした文字列）にそろえる。
   * 帳簿情報フォームと支出群の画面の両方から保存できるので、どちらの経路もこの判定を通す。
   */
  normalizePolicyComment(value: unknown): ResearchFundResult<string> {
    if (typeof value !== "string")
      return invalidResearchFundResult(
        "policyComment",
        RF_ERROR_CODES.INVALID_POLICY_COMMENT,
        "活用方針の入力が不正です",
      );
    const trimmed = value.trim();
    if (trimmed.length > POLICY_COMMENT_MAX_LENGTH)
      return invalidResearchFundResult(
        "policyComment",
        RF_ERROR_CODES.INVALID_POLICY_COMMENT,
        `活用方針は${POLICY_COMMENT_MAX_LENGTH}文字以内で入力してください`,
      );
    return { status: "valid", value: trimmed };
  },
  validateMetadata(input: BookMetadata): ResearchFundResult<BookMetadata> {
    if (
      !input ||
      typeof input.asOfDate !== "string" ||
      typeof input.nextUpdateNote !== "string" ||
      typeof input.policyComment !== "string"
    )
      return invalidResearchFundResult(
        "metadata",
        RF_ERROR_CODES.INVALID_BOOK_METADATA,
        "帳簿情報の入力が不正です",
      );
    // 時点の日付は未入力（空文字）を許す。入っているときだけ実在する暦日かを確かめる。
    if (input.asOfDate && !isCalendarDate(input.asOfDate))
      return invalidResearchFundResult(
        "asOfDate",
        RF_ERROR_CODES.INVALID_DATE,
        "時点の日付を正しく入力してください",
      );
    const policyComment = Book.normalizePolicyComment(input.policyComment);
    if (policyComment.status === "invalid") return policyComment;
    return { status: "valid", value: { ...input, policyComment: policyComment.value } };
  },
};
