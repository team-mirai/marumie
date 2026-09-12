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
  /**
   * 同じ書類に日付・金額・項目名まで同一の明細が複数あるとき、それらを別物として区別するための連番。
   * 1 件目は null（＝連番なしの hash と同値）で、2 件目以降にだけ 1 から振る。
   * これにより、連番を使わない呼び出し側（支給・手入力）の hash は変わらない。
   */
  discriminator?: number | null;
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
    const discriminator = input.discriminator ?? null;
    if (discriminator !== null && (!Number.isSafeInteger(discriminator) || discriminator < 1)) {
      return invalidResearchFundResult(
        "discriminator",
        RF_ERROR_CODES.INVALID_AMOUNT,
        "連番は1以上の整数で指定してください",
      );
    }
    // 固定順のJSON配列により、キー順序や区切り文字を含む入力に左右されない。
    // 科目やステータスの修正は同一取引の再取込判定に影響させない。
    // 連番が無い場合は末尾に足さず、従来の hash と同じ値を保つ。
    const content = JSON.stringify(
      discriminator === null
        ? [entryDate, amount, description, documentId]
        : [entryDate, amount, description, documentId, discriminator],
    );
    return { status: "valid", value: createHash("sha256").update(content, "utf8").digest("hex") };
  },
};
