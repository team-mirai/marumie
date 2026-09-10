import "server-only";
import { createHash } from "node:crypto";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export interface JournalEntryHash {
  /** 暦日を YYYY-MM-DD で指定する。タイムゾーンによる日付のずれを避ける。 */
  entryDate: string;
  amount: number;
  description: string;
  documentId?: string | null;
}

export const JournalEntryHash = {
  generate(input: JournalEntryHash): ResearchFundResult<string> {
    const { entryDate, amount, description } = input;
    const date = new Date(`${entryDate}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(entryDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== entryDate
    ) {
      return invalidResearchFundResult(
        "entryDate",
        RF_ERROR_CODES.INVALID_DATE,
        "日付は実在する日をYYYY-MM-DD形式で指定してください",
      );
    }
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999_999_999_999) {
      return invalidResearchFundResult(
        "amount",
        RF_ERROR_CODES.INVALID_AMOUNT,
        "金額は1円以上999999999999円以下の整数で指定してください",
      );
    }
    if (!description.trim()) {
      return invalidResearchFundResult(
        "description",
        RF_ERROR_CODES.INVALID_DESCRIPTION,
        "項目名を指定してください",
      );
    }
    const documentId = input.documentId ?? null;
    if (documentId !== null && !documentId.trim()) {
      return invalidResearchFundResult(
        "documentId",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "書類IDを指定するか、書類がない場合はnullにしてください",
      );
    }
    // 固定順のJSON配列により、キー順序や区切り文字を含む入力に左右されない。
    // 科目やステータスの修正は同一取引の再取込判定に影響させない。
    const content = JSON.stringify([entryDate, amount, description, documentId]);
    return { status: "valid", value: createHash("sha256").update(content, "utf8").digest("hex") };
  },
};
