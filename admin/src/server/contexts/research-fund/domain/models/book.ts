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
    if (input.asOfDate) {
      const date = new Date(`${input.asOfDate}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(input.asOfDate) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== input.asOfDate
      )
        return invalidResearchFundResult(
          "asOfDate",
          RF_ERROR_CODES.INVALID_DATE,
          "時点の日付を正しく入力してください",
        );
    }
    return { status: "valid", value: input };
  },
};
